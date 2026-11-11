package com.passportplatform.auth.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validates password strength for the {@link ValidPassword} annotation.
 * Checks:
 *  - 8–128 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character (!@#$%^&*()-_=+[]{}|;:'",.<>?/`~\)
 */
public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {

    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 128;

    @Override
    public void initialize(ValidPassword constraintAnnotation) {
        // No initialization needed
    }

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return false;
        }

        int len = password.length();
        if (len < MIN_LENGTH || len > MAX_LENGTH) {
            return false;
        }

        boolean hasUpper   = false;
        boolean hasLower   = false;
        boolean hasDigit   = false;
        boolean hasSpecial = false;

        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c))                   hasUpper   = true;
            else if (Character.isLowerCase(c))              hasLower   = true;
            else if (Character.isDigit(c))                  hasDigit   = true;
            else if (isSpecialCharacter(c))                 hasSpecial = true;
        }

        return hasUpper && hasLower && hasDigit && hasSpecial;
    }

    private boolean isSpecialCharacter(char c) {
        // Allow printable ASCII that is neither alphanumeric
        return (c >= 33 && c <= 47)   // !"#$%&'()*+,-./
            || (c >= 58 && c <= 64)   // :;<=>?@
            || (c >= 91 && c <= 96)   // [\]^_`
            || (c >= 123 && c <= 126); // {|}~
    }
}
