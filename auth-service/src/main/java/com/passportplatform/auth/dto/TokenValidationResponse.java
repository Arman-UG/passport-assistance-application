package com.passportplatform.auth.dto;

import java.util.UUID;

/**
 * Response for internal token validation endpoint.
 */
public record TokenValidationResponse(
    boolean valid,
    UUID    userId,
    String  role,
    UUID    sessionId
) {}
