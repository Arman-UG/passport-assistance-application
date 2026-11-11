package com.passportplatform.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.List;

/**
 * Guards {@code /internal/**} endpoints using a pre-shared secret header.
 *
 * <p>The caller must supply {@code X-Internal-Secret: <secret>}.
 * Comparison is done in constant time to prevent timing attacks.
 * All other paths are ignored by this filter.
 */
@Component
public class InternalSecretFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(InternalSecretFilter.class);
    private static final String HEADER_NAME = "X-Internal-Secret";
    private static final String INTERNAL_PATH_PREFIX = "/internal/";
    private static final String INTERNAL_PATH_EXACT  = "/internal";

    private final byte[] secretHash; // SHA-256 of the configured secret

    public InternalSecretFilter(@Value("${internal.api-secret}") String internalApiSecret) {
        if (internalApiSecret == null || internalApiSecret.isBlank()) {
            throw new IllegalStateException("INTERNAL_API_SECRET env var must be set.");
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            this.secretHash  = md.digest(internalApiSecret.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available.", e);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.equals(INTERNAL_PATH_EXACT) && !path.startsWith(INTERNAL_PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest  request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain         chain)
            throws ServletException, IOException {

        String suppliedSecret = request.getHeader(HEADER_NAME);
        if (!constantTimeSecretMatch(suppliedSecret)) {
            log.warn("Rejected /internal request with invalid or missing secret from {}",
                     request.getRemoteAddr());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized\"}");
            return;
        }

        // Authenticate as internal service principal
        UsernamePasswordAuthenticationToken auth =
            new UsernamePasswordAuthenticationToken(
                "internal-service",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_INTERNAL"))
            );
        SecurityContextHolder.getContext().setAuthentication(auth);
        chain.doFilter(request, response);
    }

    /**
     * Constant-time comparison against the stored SHA-256 hash of the expected secret.
     */
    private boolean constantTimeSecretMatch(String supplied) {
        if (supplied == null || supplied.isBlank()) {
            return false;
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] suppliedHash = md.digest(supplied.getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(this.secretHash, suppliedHash);
        } catch (NoSuchAlgorithmException e) {
            return false;
        }
    }
}
