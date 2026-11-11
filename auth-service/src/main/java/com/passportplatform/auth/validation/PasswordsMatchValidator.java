package com.passportplatform.auth.validation;

import com.passportplatform.auth.dto.RegisterRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validates that {@code password} equals {@code confirmPassword} in a {@link RegisterRequest}.
 */
public class PasswordsMatchValidator implements ConstraintValidator<PasswordsMatch, RegisterRequest> {

    @Override
    public void initialize(PasswordsMatch constraintAnnotation) {
        // No initialization needed
    }

    @Override
    public boolean isValid(RegisterRequest request, ConstraintValidatorContext context) {
        if (request == null) {
            return true; // null handled by @NotNull elsewhere
        }
        String pwd     = request.password();
        String confirm = request.confirmPassword();

        if (pwd == null || !pwd.equals(confirm)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Passwords do not match.")
                   .addPropertyNode("confirmPassword")
                   .addConstraintViolation();
            return false;
        }
        return true;
    }
}
