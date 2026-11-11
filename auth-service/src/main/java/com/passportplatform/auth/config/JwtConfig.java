package com.passportplatform.auth.config;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Loads and validates RSA key-pair for JWT RS256 signing.
 * Keys are expected as Base64-encoded DER (PKCS#8 for private, X.509 for public).
 */
@Component
@ConfigurationProperties(prefix = "jwt")
public class JwtConfig {

    private String privateKeyBase64;
    private String publicKeyBase64;
    private String issuer;
    private String audience;
    private long accessTokenExpiryMinutes = 15;
    private long refreshTokenExpiryDays   = 30;
    private long maxSessionDays           = 90;

    // Decoded keys — populated in @PostConstruct
    private RSAPrivateKey privateKey;
    private RSAPublicKey  publicKey;

    @PostConstruct
    public void init() {
        if (privateKeyBase64 == null || privateKeyBase64.isBlank()) {
            throw new IllegalStateException("[JWT] jwt.private-key-base64 must be set.");
        }
        if (publicKeyBase64 == null || publicKeyBase64.isBlank()) {
            throw new IllegalStateException("[JWT] jwt.public-key-base64 must be set.");
        }
        if (issuer == null || issuer.isBlank()) {
            throw new IllegalStateException("[JWT] jwt.issuer must be set.");
        }
        if (audience == null || audience.isBlank()) {
            throw new IllegalStateException("[JWT] jwt.audience must be set.");
        }

        try {
            KeyFactory kf = KeyFactory.getInstance("RSA");

            byte[] privBytes = extractDerBytes(privateKeyBase64, "PRIVATE KEY");
            this.privateKey  = (RSAPrivateKey) kf.generatePrivate(new PKCS8EncodedKeySpec(privBytes));

            byte[] pubBytes = extractDerBytes(publicKeyBase64, "PUBLIC KEY");
            this.publicKey  = (RSAPublicKey) kf.generatePublic(new X509EncodedKeySpec(pubBytes));

        } catch (Exception e) {
            throw new IllegalStateException("[JWT] Failed to decode RSA key pair: " + e.getMessage(), e);
        }

        // Minimal RSA key-size guard (must be ≥ 2048 bits)
        if (privateKey.getModulus().bitLength() < 2048) {
            throw new IllegalStateException("[JWT] RSA key must be at least 2048 bits.");
        }
    }

    private byte[] extractDerBytes(String keyInput, String headerType) {
        String input = keyInput.strip();
        if (!input.contains("BEGIN")) {
            try {
                byte[] decoded = Base64.getDecoder().decode(input);
                String decodedStr = new String(decoded, java.nio.charset.StandardCharsets.UTF_8);
                if (decodedStr.contains("BEGIN")) {
                    input = decodedStr;
                } else {
                    return decoded;
                }
            } catch (IllegalArgumentException e) {
                // Ignore and proceed
            }
        }
        String clean = input
            .replaceAll("-----BEGIN [A-Z0-9 ]+-----", "")
            .replaceAll("-----END [A-Z0-9 ]+-----", "")
            .replaceAll("\\s+", "");
        return Base64.getDecoder().decode(clean);
    }

    // ── Getters & Setters ──────────────────────────────────────────────────────

    public RSAPrivateKey getPrivateKey() { return privateKey; }
    public RSAPublicKey  getPublicKey()  { return publicKey; }

    public String getIssuer()   { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }

    public String getAudience() { return audience; }
    public void setAudience(String audience) { this.audience = audience; }

    public long getAccessTokenExpiryMinutes() { return accessTokenExpiryMinutes; }
    public void setAccessTokenExpiryMinutes(long v) { this.accessTokenExpiryMinutes = v; }

    public long getRefreshTokenExpiryDays() { return refreshTokenExpiryDays; }
    public void setRefreshTokenExpiryDays(long v) { this.refreshTokenExpiryDays = v; }

    public long getMaxSessionDays() { return maxSessionDays; }
    public void setMaxSessionDays(long v) { this.maxSessionDays = v; }

    public String getPrivateKeyBase64() { return privateKeyBase64; }
    public void setPrivateKeyBase64(String v) { this.privateKeyBase64 = v; }

    public String getPublicKeyBase64() { return publicKeyBase64; }
    public void setPublicKeyBase64(String v) { this.publicKeyBase64 = v; }
}
