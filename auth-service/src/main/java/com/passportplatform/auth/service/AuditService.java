package com.passportplatform.auth.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.passportplatform.auth.entity.AuditLog;
import com.passportplatform.auth.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    public void logEvent(UUID actorId, String action, String resourceType,
                         String resourceId, String outcome, String ipAddress,
                         String userAgent, Map<String, Object> safeMetadata) {
        try {
            String metadataJson = null;
            if (safeMetadata != null && !safeMetadata.isEmpty()) {
                metadataJson = objectMapper.writeValueAsString(safeMetadata);
            }

            AuditLog entry = new AuditLog(
                actorId, action, resourceType, resourceId, outcome,
                ipAddress, userAgent, metadataJson
            );
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to record audit log: action={}, actorId={}, error={}",
                      action, actorId, e.getMessage());
        }
    }
}
