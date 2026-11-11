package com.passportplatform.auth.dto;

import com.passportplatform.auth.validation.PasswordsMatch;
import com.passportplatform.auth.validation.ValidPassword;
import jakarta.validation.constraints.*;

/**
 * Request body for user registration.
 */
@PasswordsMatch
public record RegisterRequest(

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

    @NotBlank(message = "Confirm password is required.")
    String confirmPassword
) {}
