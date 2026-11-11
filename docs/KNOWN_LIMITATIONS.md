# Known Limitations

This document lists known limitations, their risk ratings, and planned mitigations.

## Security Limitations

| ID | Limitation | Risk | Mitigation |
|----|-----------|------|------------|
| L-01 | No malware scanning on uploaded documents | MEDIUM | File-type validation (extension + MIME + magic bytes) reduces but does not eliminate risk. Consider integrating ClamAV in production. |
| L-02 | No Multi-Factor Authentication (MFA) | MEDIUM | Single-factor (password) only. Plan: add TOTP in Phase 2 roadmap. |
| L-03 | Email verification can be disabled | LOW | `ENABLE_EMAIL=false` for dev convenience. Must be enabled in production. |
| L-04 | No IP geolocation for suspicious login | LOW | Login rate limiting per IP is implemented. Geo-based detection is not. |
| L-05 | No automated secret rotation | LOW | Manual rotation procedure documented. |
| L-06 | No CAPTCHA on registration/login | LOW | Rate limiting mitigates automated abuse. CAPTCHA is a future enhancement. |
| L-07 | Redis data loss on restart (non-persistent config) | LOW | AOF persistence enabled in Docker config. Plan for managed Redis in production. |

## Functional Limitations

| ID | Limitation | Impact | Plan |
|----|-----------|--------|------|
| F-01 | No real-time notifications | LOW | Polling-based notifications implemented. WebSocket push is a future enhancement. |
| F-02 | No document versioning | LOW | Document replacement is supported. Full version history is a future feature. |
| F-03 | No in-app messaging thread | LOW | Notifications implemented. Threaded messaging is a future feature. |
| F-04 | Agent-customer assignment is manual | LOW | Agents are manually assigned by admin. Auto-assignment is a future feature. |
| F-05 | No integration with Passport Seva portal | NONE | This platform is explicitly NOT integrated with any government system. |
| F-06 | No production email templates | LOW | Basic email sending is implemented. Rich HTML templates are a future enhancement. |

## Operational Limitations

| ID | Limitation | Impact | Plan |
|----|-----------|--------|------|
| O-01 | Single PostgreSQL instance | MEDIUM | No read replicas or HA. Use managed PostgreSQL (RDS, Cloud SQL) in production. |
| O-02 | File storage is local Docker volume | MEDIUM | Not suitable for multi-instance deployment. Replace with S3-compatible storage in production. |
| O-03 | No distributed rate limiting | LOW | Rate limiting works correctly in single-instance deployment. For multi-instance, use Redis-based Bucket4j (already configured). |

## Important Disclaimers

1. **Government Affiliation:** This platform has no affiliation with the Government of India, Ministry of External Affairs, or Passport Seva. It does not issue passports.

2. **Document Security:** While uploaded documents are stored securely and access-controlled, users should be aware they are sharing sensitive identity documents with a third-party assistance service.

3. **Data Retention:** Document retention and deletion policies must be clearly communicated to users and complied with applicable data protection laws (IT Act, DPDP Act 2023).

4. **Legal Compliance:** Operators of this platform must ensure compliance with applicable laws regarding data processing, document handling, and consumer protection.
