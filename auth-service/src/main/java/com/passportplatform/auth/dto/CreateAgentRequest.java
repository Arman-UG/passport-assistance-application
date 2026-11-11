package com.passportplatform.auth.dto;

import com.passportplatform.auth.entity.enums.Role;
import com.passportplatform.auth.validation.ValidPassword;
import jakarta.validation.constraints.*;

/**
 * Request body for admin-driven agent/admin account creation.
 * Only AGENT or ADMIN roles are permitted.
 */
public record CreateAgentRequest(

    @NotBlank(message = "Full name is required.")
    @Size(min = 2, max = 200, message = "Full name must be between 2 and 200 characters.")
    String fullName,

    @NotBlank(message = "Email is required.")
    @Email(message = "Email must be a valid email address.")
    @Size(max = 255, message = "Email must not exceed 255 characters.")
    String email,

    @NotBlank(message = "Password is required.")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters.")
    @ValidPassword
    String password,

    @NotNull(message = "Role is required.")
    Role role
) {}
