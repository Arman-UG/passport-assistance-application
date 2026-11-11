package com.passportplatform.auth.dto;

import java.util.UUID;

/**
 * Response body for successful login/token-refresh operations.
 */
public record LoginResponse(
    String accessToken,
    String refreshToken,
    UserInfo user
) {

    /**
     * Minimal user info embedded in the login response.
     */
    public record UserInfo(
        UUID   id,
        String fullName,
        String email,
        String role
    ) {}
}
