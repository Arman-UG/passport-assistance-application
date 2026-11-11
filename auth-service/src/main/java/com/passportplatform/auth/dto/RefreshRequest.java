package com.passportplatform.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for token refresh.
 */
public record RefreshRequest(

    @NotBlank(message = "Refresh token is required.")
    String refreshToken
) {}
