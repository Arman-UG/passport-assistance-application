package com.passportplatform.auth.service;

import com.passportplatform.auth.entity.Session;
import com.passportplatform.auth.entity.enums.SessionStatus;
import com.passportplatform.auth.exception.InvalidTokenException;
import com.passportplatform.auth.exception.TokenReusedException;
import com.passportplatform.auth.repository.SessionRepository;
import com.passportplatform.auth.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class SessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);

    private final SessionRepository sessionRepository;
    private final JwtTokenProvider tokenProvider;
    private final StringRedisTemplate redisTemplate;
    private final int refreshTokenExpiryDays;

    public SessionService(
            SessionRepository sessionRepository,
            JwtTokenProvider tokenProvider,
            StringRedisTemplate redisTemplate,
            @Value("${jwt.refresh-token-expiry-days:7}") int refreshTokenExpiryDays) {
        this.sessionRepository = sessionRepository;
        this.tokenProvider = tokenProvider;
        this.redisTemplate = redisTemplate;
        this.refreshTokenExpiryDays = refreshTokenExpiryDays;
    }

    @Transactional
    public SessionAndRefreshToken createSession(UUID userId, String deviceInfo, String ipAddress) {
        UUID familyId = UUID.randomUUID();
        String refreshToken = tokenProvider.generateRefreshToken(familyId);
        String tokenHash = tokenProvider.hashToken(refreshToken);

        Instant expiresAt = Instant.now().plus(Duration.ofDays(refreshTokenExpiryDays));

        Session session = new Session(
            userId,
            familyId,
            tokenHash,
            deviceInfo != null && deviceInfo.length() > 500 ? deviceInfo.substring(0, 500) : deviceInfo,
            ipAddress != null && ipAddress.length() > 45 ? ipAddress.substring(0, 45) : ipAddress,
            expiresAt
        );

        session = sessionRepository.save(session);

        // Cache in Redis
        cacheSessionInRedis(familyId, tokenHash, session.getId(), userId, expiresAt);

        return new SessionAndRefreshToken(session, refreshToken);
    }

    @Transactional
    public RotatedTokens rotateRefreshToken(String incomingRefreshToken, String ipAddress) {
        UUID familyId;
        try {
            familyId = tokenProvider.extractFamilyId(incomingRefreshToken);
        } catch (Exception e) {
            throw new InvalidTokenException("Malformed refresh token format");
        }

        String incomingHash = tokenProvider.hashToken(incomingRefreshToken);

        // Fetch from DB
        Optional<Session> sessionOpt = sessionRepository.findByTokenFamilyId(familyId);
        if (sessionOpt.isEmpty()) {
            throw new InvalidTokenException("Session not found");
        }

        Session session = sessionOpt.get();

        if (session.getSessionStatus() != SessionStatus.ACTIVE) {
            throw new InvalidTokenException("Session is " + session.getSessionStatus());
        }

        if (Instant.now().isAfter(session.getExpiresAt())) {
            session.setSessionStatus(SessionStatus.EXPIRED);
            sessionRepository.save(session);
            evictSessionFromRedis(familyId);
            throw new InvalidTokenException("Refresh token has expired");
        }

        // Constant-time check of refresh token hash
        byte[] expectedHashBytes = session.getRefreshTokenHash().getBytes();
        byte[] incomingHashBytes = incomingHash.getBytes();

        if (!MessageDigest.isEqual(expectedHashBytes, incomingHashBytes)) {
            // REUSE DETECTED! Revoke entire token family and session
            log.warn("SECURITY ALERT: Refresh token reuse detected for family {}. Revoking session.", familyId);
            session.setSessionStatus(SessionStatus.REVOKED);
            session.setRevokedAt(Instant.now());
            sessionRepository.save(session);
            evictSessionFromRedis(familyId);
            throw new TokenReusedException("Compromised token family detected. All sessions in this chain have been revoked.");
        }

        // Valid token: atomic rotation
        String newRefreshToken = tokenProvider.generateRefreshToken(familyId);
        String newHash = tokenProvider.hashToken(newRefreshToken);

        session.setRefreshTokenHash(newHash);
        session.setLastUsedAt(Instant.now());
        sessionRepository.save(session);

        // Update Redis
        cacheSessionInRedis(familyId, newHash, session.getId(), session.getUserId(), session.getExpiresAt());

        return new RotatedTokens(session, newRefreshToken);
    }

    @Transactional
    public void revokeSession(UUID sessionId) {
        sessionRepository.findById(sessionId).ifPresent(session -> {
            session.setSessionStatus(SessionStatus.REVOKED);
            session.setRevokedAt(Instant.now());
            sessionRepository.save(session);
            evictSessionFromRedis(session.getTokenFamilyId());
        });
    }

    @Transactional
    public void revokeSessionByFamily(UUID familyId) {
        sessionRepository.findByTokenFamilyId(familyId).ifPresent(session -> {
            session.setSessionStatus(SessionStatus.REVOKED);
            session.setRevokedAt(Instant.now());
            sessionRepository.save(session);
            evictSessionFromRedis(familyId);
        });
    }

    public boolean isSessionActive(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .map(s -> s.getSessionStatus() == SessionStatus.ACTIVE && Instant.now().isBefore(s.getExpiresAt()))
                .orElse(false);
    }

    private void cacheSessionInRedis(UUID familyId, String tokenHash, UUID sessionId, UUID userId, Instant expiresAt) {
        try {
            String redisKey = "session:family:" + familyId;
            String val = sessionId + ":" + userId + ":" + tokenHash;
            long ttlSeconds = Math.max(0, Duration.between(Instant.now(), expiresAt).getSeconds());
            redisTemplate.opsForValue().set(redisKey, val, Duration.ofSeconds(ttlSeconds));
        } catch (Exception e) {
            log.debug("Redis cache write failed: {}", e.getMessage());
        }
    }

    private void evictSessionFromRedis(UUID familyId) {
        try {
            redisTemplate.delete("session:family:" + familyId);
        } catch (Exception e) {
            log.debug("Redis eviction failed: {}", e.getMessage());
        }
    }

    public record SessionAndRefreshToken(Session session, String refreshToken) {}
    public record RotatedTokens(Session session, String newRefreshToken) {}
}
