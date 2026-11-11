package com.passportplatform.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class Argon2PasswordServiceTest {

    private Argon2PasswordService passwordService;

    @BeforeEach
    void setUp() {
        passwordService = new Argon2PasswordService();
    }

    @Test
    @DisplayName("Hash password produces valid Argon2id formatted string")
    void hashPasswordProducesArgon2idFormat() {
        String raw = "StrongP@ssw0rd123";
        String hash = passwordService.hashPassword(raw);

        assertNotNull(hash);
        assertTrue(hash.startsWith("$argon2id$v=19$m=65536,t=3,p=1$"));
    }

    @Test
    @DisplayName("Verify valid password returns true")
    void verifyMatchingPasswordReturnsTrue() {
        String raw = "MySecurePass!99";
        String hash = passwordService.hashPassword(raw);

        assertTrue(passwordService.verifyPassword(raw, hash));
    }

    @Test
    @DisplayName("Verify wrong password returns false")
    void verifyWrongPasswordReturnsFalse() {
        String raw = "CorrectPassword1!";
        String hash = passwordService.hashPassword(raw);

        assertFalse(passwordService.verifyPassword("WrongPassword2@", hash));
    }

    @Test
    @DisplayName("Corrupted hash fails safely without throwing unhandled exception")
    void corruptedHashFailsSafely() {
        assertFalse(passwordService.verifyPassword("Password123!", "invalid_hash_string"));
        assertFalse(passwordService.verifyPassword("Password123!", ""));
    }
}
