package com.passportplatform.auth.security;

import com.passportplatform.auth.config.JwtConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;
    private JwtConfig jwtConfig;

    @BeforeEach
    void setUp() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        KeyPair kp = kpg.generateKeyPair();

        jwtConfig = new JwtConfig();
        jwtConfig.setIssuer("test-issuer");
        jwtConfig.setAudience("test-audience");
        jwtConfig.setAccessTokenExpiryMinutes(15);
        jwtConfig.setRefreshTokenExpiryDays(7);
        jwtConfig.setMaxSessionDays(30);

        // Inject keys using reflection or package access
        var privField = JwtConfig.class.getDeclaredField("privateKey");
        privField.setAccessible(true);
        privField.set(jwtConfig, (RSAPrivateKey) kp.getPrivate());

        var pubField = JwtConfig.class.getDeclaredField("publicKey");
        pubField.setAccessible(true);
        pubField.set(jwtConfig, (RSAPublicKey) kp.getPublic());

        tokenProvider = new JwtTokenProvider(jwtConfig);
    }

    @Test
    @DisplayName("Generate access token and extract claims successfully")
    void generateAndValidateAccessToken() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID jti = UUID.randomUUID();

        String token = tokenProvider.generateAccessToken(userId, "CUSTOMER", sessionId, jti);
        assertNotNull(token);

        var claims = tokenProvider.parseAndValidateAccessToken(token);
        assertEquals(userId, tokenProvider.extractUserId(claims));
        assertEquals("CUSTOMER", tokenProvider.extractRole(claims));
        assertEquals(sessionId, tokenProvider.extractSessionId(claims));
    }

    @Test
    @DisplayName("Generate compound refresh token and extract family ID correctly")
    void generateRefreshTokenExtractsFamily() {
        UUID familyId = UUID.randomUUID();
        String refreshToken = tokenProvider.generateRefreshToken(familyId);

        assertNotNull(refreshToken);
        assertTrue(refreshToken.contains("."));

        UUID extracted = tokenProvider.extractFamilyId(refreshToken);
        assertEquals(familyId, extracted);
    }

    @Test
    @DisplayName("Hash token returns deterministic SHA-256 hex string")
    void hashTokenDeterministic() {
        String token = "sample-token-string";
        String hash1 = tokenProvider.hashToken(token);
        String hash2 = tokenProvider.hashToken(token);

        assertEquals(hash1, hash2);
        assertEquals(64, hash1.length()); // 256 bits = 64 hex chars
    }
}
