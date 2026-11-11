package com.passportplatform.auth.security;

import com.passportplatform.auth.config.JwtConfig;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Provides JWT generation, parsing, and opaque refresh-token utilities.
 *
 * <p>Access tokens are signed RS256 JWTs containing: sub (userId), role, sessionId, jti.
 * Refresh tokens are opaque 64-char hex strings embedded in a compound token that
 * also carries the session family ID, enabling family lookup without a DB round-trip.
 *
 * <p>Compound refresh token format: {@code <familyId_UUID>.<32-random-bytes-hex>}
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final JwtConfig jwtConfig;

    public JwtTokenProvider(JwtConfig jwtConfig) {
        this.jwtConfig = jwtConfig;
    }

    // ── Access Token ───────────────────────────────────────────────────────────

    /**
     * Generates an RS256-signed JWT access token.
     *
     * @param userId    subject (user UUID)
     * @param role      user role string (e.g. "CUSTOMER")
     * @param sessionId session UUID (links token to revocable session)
     * @param jti       unique JWT ID for this token
     * @return signed compact JWT string
     */
    public String generateAccessToken(UUID userId, String role, UUID sessionId, UUID jti) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(jwtConfig.getAccessTokenExpiryMinutes() * 60L);

        return Jwts.builder()
            .id(jti.toString())
            .subject(userId.toString())
            .issuer(jwtConfig.getIssuer())
            .audience().add(jwtConfig.getAudience()).and()
            .issuedAt(Date.from(now))
            .expiration(Date.from(exp))
            .claim("role",      role)
            .claim("sessionId", sessionId.toString())
            .signWith(jwtConfig.getPrivateKey(), Jwts.SIG.RS256)
            .compact();
    }

    // ── Refresh Token (opaque compound) ───────────────────────────────────────

    /**
     * Generates an opaque compound refresh token.
     *
     * <p>Format: {@code <familyId>.<32-random-bytes-hex>}
     * The family ID prefix allows O(1) session lookup in Redis without DB hit.
     *
     * @param familyId the session family UUID
     * @return 64-char hex random part combined with familyId prefix
     */
    public String generateRefreshToken(UUID familyId) {
        try {
            byte[] randomBytes = new byte[32];
            SecureRandom.getInstanceStrong().nextBytes(randomBytes);
            String randomHex = HexFormat.of().formatHex(randomBytes);
            return familyId.toString() + "." + randomHex;
        } catch (NoSuchAlgorithmException e) {
            // Fall back to default SecureRandom — still cryptographically secure
            byte[] randomBytes = new byte[32];
            new SecureRandom().nextBytes(randomBytes);
            String randomHex = HexFormat.of().formatHex(randomBytes);
            return familyId.toString() + "." + randomHex;
        }
    }

    /**
     * Extracts the token family UUID from the compound refresh token.
     *
     * @param compoundRefreshToken the full refresh token string
     * @return family UUID
     * @throws IllegalArgumentException if the format is invalid
     */
    public UUID extractFamilyId(String compoundRefreshToken) {
        if (compoundRefreshToken == null) {
            throw new IllegalArgumentException("Refresh token is null.");
        }
        int dotIdx = compoundRefreshToken.indexOf('.');
        if (dotIdx < 0) {
            throw new IllegalArgumentException("Invalid refresh token format.");
        }
        try {
            return UUID.fromString(compoundRefreshToken.substring(0, dotIdx));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid refresh token family segment.", e);
        }
    }

    // ── Token Hashing ─────────────────────────────────────────────────────────

    /**
     * Returns the SHA-256 hex digest of the given token string.
     * Used for storing/verifying refresh tokens without keeping plaintext.
     */
    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available.", e);
        }
    }

    // ── Token Validation ──────────────────────────────────────────────────────

    /**
     * Parses and fully validates an access token (signature, issuer, audience, expiry).
     *
     * @param token compact JWT string
     * @return validated {@link Claims}
     * @throws JwtException if validation fails for any reason
     */
    public Claims parseAndValidateAccessToken(String token) {
        try {
            return Jwts.parser()
                .verifyWith(jwtConfig.getPublicKey())
                .requireIssuer(jwtConfig.getIssuer())
                .requireAudience(jwtConfig.getAudience())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException e) {
            log.debug("JWT expired: {}", e.getMessage());
            throw e;
        } catch (SignatureException e) {
            log.warn("JWT signature invalid.");
            throw e;
        } catch (JwtException e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            throw e;
        }
    }

    // ── Claim Extractors ──────────────────────────────────────────────────────

    public UUID extractUserId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    public String extractRole(Claims claims) {
        return claims.get("role", String.class);
    }

    public UUID extractSessionId(Claims claims) {
        String raw = claims.get("sessionId", String.class);
        return UUID.fromString(raw);
    }

    public UUID extractJti(Claims claims) {
        return UUID.fromString(claims.getId());
    }
}
