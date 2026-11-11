package com.passportplatform.auth.service;

import com.passportplatform.auth.dto.LoginRequest;
import com.passportplatform.auth.dto.LoginResponse;
import com.passportplatform.auth.dto.RefreshRequest;
import com.passportplatform.auth.dto.RegisterRequest;
import com.passportplatform.auth.dto.TokenValidationResponse;
import com.passportplatform.auth.entity.User;
import com.passportplatform.auth.entity.enums.AccountStatus;
import com.passportplatform.auth.exception.AccountStatusException;
import com.passportplatform.auth.exception.InvalidTokenException;
import com.passportplatform.auth.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserService userService;
    private final SessionService sessionService;
    private final Argon2PasswordService passwordService;
    private final JwtTokenProvider tokenProvider;
    private final RateLimitService rateLimitService;
    private final AuditService auditService;

    public AuthService(
            UserService userService,
            SessionService sessionService,
            Argon2PasswordService passwordService,
            JwtTokenProvider tokenProvider,
            RateLimitService rateLimitService,
            AuditService auditService) {
        this.userService = userService;
        this.sessionService = sessionService;
        this.passwordService = passwordService;
        this.tokenProvider = tokenProvider;
        this.rateLimitService = rateLimitService;
        this.auditService = auditService;
    }

    @Transactional
    public LoginResponse register(RegisterRequest req, String ipAddress, String userAgent) {
        // Enforce rate limiting
        rateLimitService.checkLoginRateLimit(userService.normalizeEmail(req.email()), ipAddress);

        User user = userService.createCustomer(req);

        // Audit log registration
        auditService.logEvent(
            user.getId(), "USER_REGISTER", "User", user.getId().toString(),
            "SUCCESS", ipAddress, userAgent,
            Map.of("role", user.getRole().name(), "email", user.getEmail())
        );

        // Automatically create session & issue tokens for seamless login
        SessionService.SessionAndRefreshToken sessionInfo = sessionService.createSession(
            user.getId(), userAgent, ipAddress
        );

        UUID jti = UUID.randomUUID();
        String accessToken = tokenProvider.generateAccessToken(
            user.getId(), user.getRole().name(), sessionInfo.session().getId(), jti
        );

        return new LoginResponse(
            accessToken,
            sessionInfo.refreshToken(),
            new LoginResponse.UserInfo(
                user.getId(), user.getFullName(), user.getEmail(), user.getRole().name()
            )
        );
    }

    @Transactional
    public LoginResponse login(LoginRequest req, String ipAddress, String userAgent) {
        String normalizedEmail = userService.normalizeEmail(req.email());

        // Check rate limiting
        rateLimitService.checkLoginRateLimit(normalizedEmail, ipAddress);

        Optional<User> userOpt = userService.findByEmailNormalized(normalizedEmail);
        if (userOpt.isEmpty()) {
            rateLimitService.recordLoginFailure(normalizedEmail, ipAddress);
            auditService.logEvent(
                null, "USER_LOGIN_FAILED", "User", normalizedEmail,
                "FAILURE", ipAddress, userAgent,
                Map.of("reason", "Account not found")
            );
            // Generic message to prevent email enumeration
            throw new BadCredentialsException("Invalid email address or password.");
        }

        User user = userOpt.get();

        // Verify password
        boolean valid = passwordService.verifyPassword(req.password(), user.getPasswordHash());
        if (!valid) {
            user.setFailedLoginCount(user.getFailedLoginCount() + 1);
            userService.updateUser(user);

            rateLimitService.recordLoginFailure(normalizedEmail, ipAddress);
            auditService.logEvent(
                user.getId(), "USER_LOGIN_FAILED", "User", user.getId().toString(),
                "FAILURE", ipAddress, userAgent,
                Map.of("reason", "Bad password", "failedAttempts", user.getFailedLoginCount())
            );
            throw new BadCredentialsException("Invalid email address or password.");
        }

        // Check account status
        if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
            auditService.logEvent(
                user.getId(), "USER_LOGIN_BLOCKED", "User", user.getId().toString(),
                "BLOCKED", ipAddress, userAgent, Map.of("status", user.getAccountStatus().name())
            );
            throw new AccountStatusException("This account has been suspended. Please contact customer support.");
        }
        if (user.getAccountStatus() == AccountStatus.DEACTIVATED) {
            auditService.logEvent(
                user.getId(), "USER_LOGIN_BLOCKED", "User", user.getId().toString(),
                "BLOCKED", ipAddress, userAgent, Map.of("status", user.getAccountStatus().name())
            );
            throw new AccountStatusException("This account is deactivated.");
        }

        // Reset rate limit and failed count on success
        rateLimitService.resetLoginAttempts(normalizedEmail);
        user.setFailedLoginCount(0);
        user.setLastLoginAt(Instant.now());
        user.setLastLoginIp(ipAddress != null && ipAddress.length() > 45 ? ipAddress.substring(0, 45) : ipAddress);
        userService.updateUser(user);

        // Create new session
        SessionService.SessionAndRefreshToken sessionInfo = sessionService.createSession(
            user.getId(), userAgent, ipAddress
        );

        UUID jti = UUID.randomUUID();
        String accessToken = tokenProvider.generateAccessToken(
            user.getId(), user.getRole().name(), sessionInfo.session().getId(), jti
        );

        auditService.logEvent(
            user.getId(), "USER_LOGIN_SUCCESS", "User", user.getId().toString(),
            "SUCCESS", ipAddress, userAgent,
            Map.of("sessionId", sessionInfo.session().getId().toString(), "role", user.getRole().name())
        );

        return new LoginResponse(
            accessToken,
            sessionInfo.refreshToken(),
            new LoginResponse.UserInfo(
                user.getId(), user.getFullName(), user.getEmail(), user.getRole().name()
            )
        );
    }

    @Transactional
    public LoginResponse refresh(RefreshRequest req, String ipAddress, String userAgent) {
        SessionService.RotatedTokens rotated = sessionService.rotateRefreshToken(req.refreshToken(), ipAddress);

        User user = userService.findById(rotated.session().getUserId())
            .orElseThrow(() -> new InvalidTokenException("User associated with session not found"));

        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new AccountStatusException("Account is not active");
        }

        UUID jti = UUID.randomUUID();
        String newAccessToken = tokenProvider.generateAccessToken(
            user.getId(), user.getRole().name(), rotated.session().getId(), jti
        );

        auditService.logEvent(
            user.getId(), "TOKEN_REFRESH", "Session", rotated.session().getId().toString(),
            "SUCCESS", ipAddress, userAgent,
            Map.of("familyId", rotated.session().getTokenFamilyId().toString())
        );

        return new LoginResponse(
            newAccessToken,
            rotated.newRefreshToken(),
            new LoginResponse.UserInfo(
                user.getId(), user.getFullName(), user.getEmail(), user.getRole().name()
            )
        );
    }

    @Transactional
    public void logout(String authHeader, String refreshToken, String ipAddress, String userAgent) {
        UUID userId = null;
        UUID sessionId = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                Claims claims = tokenProvider.parseAndValidateAccessToken(token);
                userId = tokenProvider.extractUserId(claims);
                sessionId = tokenProvider.extractSessionId(claims);
                sessionService.revokeSession(sessionId);
            } catch (Exception ignored) {}
        }

        if (refreshToken != null && !refreshToken.isBlank()) {
            try {
                UUID familyId = tokenProvider.extractFamilyId(refreshToken);
                sessionService.revokeSessionByFamily(familyId);
            } catch (Exception ignored) {}
        }

        auditService.logEvent(
            userId, "USER_LOGOUT", "Session", sessionId != null ? sessionId.toString() : "UNKNOWN",
            "SUCCESS", ipAddress, userAgent, Map.of()
        );
    }

    public TokenValidationResponse validateToken(String token) {
        try {
            Claims claims = tokenProvider.parseAndValidateAccessToken(token);
            UUID userId = tokenProvider.extractUserId(claims);
            String role = tokenProvider.extractRole(claims);
            UUID sessionId = tokenProvider.extractSessionId(claims);

            boolean sessionActive = sessionService.isSessionActive(sessionId);
            if (!sessionActive) {
                return new TokenValidationResponse(false, null, null, null);
            }

            return new TokenValidationResponse(true, userId, role, sessionId);
        } catch (Exception e) {
            return new TokenValidationResponse(false, null, null, null);
        }
    }
}
