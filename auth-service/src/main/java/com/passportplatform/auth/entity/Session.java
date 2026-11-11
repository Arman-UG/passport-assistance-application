package com.passportplatform.auth.entity;

import com.passportplatform.auth.entity.enums.SessionStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping to auth.sessions table.
 */
@Entity
@Table(name = "sessions", schema = "auth",
    uniqueConstraints = @UniqueConstraint(name = "uq_sessions_token_family",
        columnNames = "token_family_id"))
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token_family_id", nullable = false)
    private UUID tokenFamilyId;

    @Column(name = "refresh_token_hash", nullable = false, columnDefinition = "TEXT")
    private String refreshTokenHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_status", nullable = false, length = 20)
    private SessionStatus sessionStatus = SessionStatus.ACTIVE;

    @Column(name = "device_info", length = 500)
    private String deviceInfo;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    // ── Constructors ───────────────────────────────────────────────────────────

    protected Session() {}

    public Session(UUID userId, UUID tokenFamilyId, String refreshTokenHash,
                   String deviceInfo, String ipAddress, Instant expiresAt) {
        this.userId = userId;
        this.tokenFamilyId = tokenFamilyId;
        this.refreshTokenHash = refreshTokenHash;
        this.deviceInfo = deviceInfo;
        this.ipAddress = ipAddress;
        this.expiresAt = expiresAt;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────────

    public UUID getId() { return id; }

    public UUID getUserId() { return userId; }

    public UUID getTokenFamilyId() { return tokenFamilyId; }

    public String getRefreshTokenHash() { return refreshTokenHash; }
    public void setRefreshTokenHash(String refreshTokenHash) {
        this.refreshTokenHash = refreshTokenHash;
    }

    public SessionStatus getSessionStatus() { return sessionStatus; }
    public void setSessionStatus(SessionStatus sessionStatus) {
        this.sessionStatus = sessionStatus;
    }

    public String getDeviceInfo() { return deviceInfo; }

    public String getIpAddress() { return ipAddress; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(Instant lastUsedAt) { this.lastUsedAt = lastUsedAt; }

    public Instant getExpiresAt() { return expiresAt; }

    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }
}
