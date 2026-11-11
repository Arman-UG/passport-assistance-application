package com.passportplatform.auth.exception;

public class TokenReusedException extends RuntimeException {
    public TokenReusedException(String message) {
        super(message);
    }
}
