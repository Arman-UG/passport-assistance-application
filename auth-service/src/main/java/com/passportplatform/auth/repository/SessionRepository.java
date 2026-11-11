package com.passportplatform.auth.repository;

import com.passportplatform.auth.entity.Session;
import com.passportplatform.auth.entity.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    Optional<Session> findByTokenFamilyId(UUID familyId);

    List<Session> findAllByUserIdAndSessionStatus(UUID userId, SessionStatus status);

    @Modifying
    @Query("""
        UPDATE Session s
        SET s.sessionStatus = com.passportplatform.auth.entity.enums.SessionStatus.REVOKED,
            s.revokedAt     = :revokedAt
        WHERE s.userId = :userId
          AND s.sessionStatus = com.passportplatform.auth.entity.enums.SessionStatus.ACTIVE
        """)
    int revokeAllActiveSessions(@Param("userId") UUID userId,
                                @Param("revokedAt") Instant revokedAt);
}
