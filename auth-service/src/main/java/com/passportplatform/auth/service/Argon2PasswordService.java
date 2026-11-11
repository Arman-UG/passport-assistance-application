package com.passportplatform.auth.service;

import org.bouncycastle.crypto.generators.Argon2BytesGenerator;
import org.bouncycastle.crypto.params.Argon2Parameters;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * Password hashing and verification using Argon2id (BouncyCastle 1.78.x).
 *
 * <p>Parameters (OWASP recommended minimum for Argon2id):
 * <ul>
 *   <li>Memory: 64 MB (m=65536)</li>
 *   <li>Iterations: 3 (t=3)</li>
 *   <li>Parallelism: 1 (p=1)</li>
 *   <li>Salt: 16 bytes (SecureRandom)</li>
 *   <li>Hash output: 32 bytes</li>
 * </ul>
 *
 * <p>Encoded format: {@code $argon2id$v=19$m=65536,t=3,p=1$<salt_b64>$<hash_b64>}
 */
@Service
public class Argon2PasswordService {

    private static final int MEMORY_KB   = 65_536; // 64 MB
    private static final int ITERATIONS  = 3;
    private static final int PARALLELISM = 1;
    private static final int SALT_LENGTH = 16;     // bytes
    private static final int HASH_LENGTH = 32;     // bytes
    private static final int ARGON2_VERSION = 19;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Hashes a plaintext password using Argon2id with a fresh random salt.
     *
     * @param password plaintext password
     * @return encoded Argon2id hash string
     */
    public String hashPassword(String password) {
        byte[] salt = new byte[SALT_LENGTH];
        secureRandom.nextBytes(salt);

        byte[] hash = computeHash(password.toCharArray(), salt);

        Base64.Encoder enc = Base64.getEncoder().withoutPadding();
        return "$argon2id$v=" + ARGON2_VERSION
             + "$m=" + MEMORY_KB + ",t=" + ITERATIONS + ",p=" + PARALLELISM
             + "$" + enc.encodeToString(salt)
             + "$" + enc.encodeToString(hash);
    }

    /**
     * Verifies a plaintext password against a stored Argon2id encoded hash.
     * Uses constant-time comparison to prevent timing attacks.
     *
     * @param password    plaintext password
     * @param encodedHash stored encoded hash
     * @return {@code true} if the password matches
     */
    public boolean verifyPassword(String password, String encodedHash) {
        try {
            ParsedHash parsed = parseEncodedHash(encodedHash);
            byte[] candidateHash = computeHash(password.toCharArray(), parsed.salt());
            return constantTimeEquals(candidateHash, parsed.hash());
        } catch (Exception e) {
            // Invalid hash format — fail safely
            return false;
        }
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    private byte[] computeHash(char[] password, byte[] salt) {
        Argon2Parameters params = new Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
            .withVersion(ARGON2_VERSION)
            .withMemoryAsKB(MEMORY_KB)
            .withIterations(ITERATIONS)
            .withParallelism(PARALLELISM)
            .withSalt(salt)
            .build();

        Argon2BytesGenerator generator = new Argon2BytesGenerator();
        generator.init(params);

        byte[] hash = new byte[HASH_LENGTH];
        // Convert char[] to byte[] using UTF-8 without String intermediary
        byte[] passwordBytes = toUtf8Bytes(password);
        try {
            generator.generateBytes(passwordBytes, hash, 0, HASH_LENGTH);
        } finally {
            Arrays.fill(passwordBytes, (byte) 0);
        }
        return hash;
    }

    /**
     * Parses the encoded hash string into its constituent parts.
     * Expected format: {@code $argon2id$v=19$m=65536,t=3,p=1$<salt_b64>$<hash_b64>}
     */
    private ParsedHash parseEncodedHash(String encodedHash) {
        // Split on $ — first segment is empty (leading $)
        String[] parts = encodedHash.split("\\$");
        // parts[0]="" parts[1]="argon2id" parts[2]="v=19"
        // parts[3]="m=65536,t=3,p=1" parts[4]=saltB64 parts[5]=hashB64
        if (parts.length != 6 || !"argon2id".equals(parts[1])) {
            throw new IllegalArgumentException("Unsupported hash format.");
        }
        Base64.Decoder dec = Base64.getDecoder().withoutPadding();
        byte[] salt = dec.decode(parts[4]);
        byte[] hash = dec.decode(parts[5]);
        return new ParsedHash(salt, hash);
    }

    /** Converts a char[] to UTF-8 bytes without creating an intermediate String. */
    private byte[] toUtf8Bytes(char[] chars) {
        java.nio.CharBuffer cb = java.nio.CharBuffer.wrap(chars);
        java.nio.ByteBuffer bb = java.nio.charset.StandardCharsets.UTF_8.encode(cb);
        byte[] bytes = new byte[bb.remaining()];
        bb.get(bytes);
        // Zero out the ByteBuffer backing array if accessible
        if (bb.hasArray()) {
            Arrays.fill(bb.array(), (byte) 0);
        }
        return bytes;
    }

    /**
     * Constant-time byte array comparison (equivalent to MessageDigest.isEqual).
     */
    private boolean constantTimeEquals(byte[] a, byte[] b) {
        return java.security.MessageDigest.isEqual(a, b);
    }

    private record ParsedHash(byte[] salt, byte[] hash) {}
}
