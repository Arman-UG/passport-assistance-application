# Security Design

## Authentication Flow

### Password Hashing
- Algorithm: **Argon2id**
- Memory: 64 MB (65,536 KiB)
- Iterations: 3
- Parallelism: 1
- Salt: 16 bytes (cryptographically random)
- Hash output: 32 bytes
- Storage: PHC string format only — never plaintext

### JWT Tokens
- Algorithm: **RS256** (asymmetric)
- Private key: held exclusively by the Java Auth Service
- Public key: shared with the Python FastAPI service for verification
- Access token lifetime: 15 minutes
- Access token claims: `sub` (userId), `role`, `sessionId`, `jti`, `iss`, `aud`, `iat`, `exp`

### Refresh Token Design
- Opaque format: `{familyId_hex}.{32_random_bytes_hex}` (64+65 chars)
- Stored as: SHA-256(token) — never plaintext
- Lifetime: 7 days
- Rotation: Every successful use (new pair issued, old invalidated)
- Max session age: 30 days absolute
- Inactivity expiry: 24 hours

### Token Reuse Detection
If a refresh token that has already been rotated is presented:
1. The session family is immediately revoked in Redis and PostgreSQL
2. All tokens in that family are invalidated
3. A `REFRESH_REUSE_DETECTED` audit event is recorded
4. The user must re-authenticate

### Cookie Security
| Cookie | Contents | Flags |
|--------|----------|-------|
| `pp_access` | JWT access token | HttpOnly, Secure, SameSite=Strict |
| `pp_refresh` | Opaque refresh token | HttpOnly, Secure, SameSite=Strict, Path=/api/auth/refresh |
| `pp_csrf` | CSRF token (random) | Secure, SameSite=Strict (JS-readable) |

## Authorization

### Role-Based Access Control
- Roles: `CUSTOMER`, `AGENT`, `ADMIN`
- Assigned at account creation — never self-assignable
- Public registration endpoint is hardcoded to issue `CUSTOMER` role only
- `AGENT` and `ADMIN` accounts require admin provisioning

### Resource Ownership
Every API endpoint that returns or modifies customer data verifies:
- **Customers:** `authenticated_user_id == resource.customer_id`
- **Agents:** `authenticated_user_id == application.assigned_agent_id`
- **Admins:** Always permitted on managed resources

### Deny-by-Default
All FastAPI routes require authentication unless explicitly marked public. Missing or invalid tokens return `401`. Insufficient permissions return `403`.

## File Upload Security

### Validation Pipeline (all checks required)
1. File size limit: 5 MB (enforced by reading actual bytes, not Content-Length header)
2. Extension: allowlist check (pdf, jpg, jpeg, png only)
3. MIME type: allowlist check from Content-Type header
4. Magic bytes: first 8–16 bytes checked against known file signatures
5. No double extensions (e.g., `document.pdf.exe` → rejected)
6. No path traversal characters in filename

### Storage
- All files stored in a Docker volume at `/data/uploads`
- Storage keys are UUID-based, server-generated: `uploads/{year}/{month}/{uuid4}.{ext}`
- Original filenames are sanitized and stored as metadata only
- No file is accessible via a public URL
- Downloads go through an authenticated endpoint that verifies ownership

### Limitation: Malware Scanning
Malware scanning is **not implemented**. File type filtering and magic-byte checking reduce risk but do not guarantee safety. Document this in production deployment notes.

## API Security

### CORS
- Allowed origins: explicitly configured from environment variable
- Credentials: enabled (required for cookies)
- Allowlist updated per environment

### Rate Limiting
- Login: 5 attempts per 15 minutes per email, and per IP
- Global API: 100 requests/minute default via SlowAPI

### SQL Injection Prevention
- Java: Spring Data JPA with parameterized queries; no raw JPQL string concatenation
- Python: SQLAlchemy ORM with bound parameters; no raw SQL string formatting

### XSS Prevention
- React escapes all output by default
- Content-Security-Policy header configured
- `X-Content-Type-Options: nosniff`

### CSRF Protection
- Double-submit cookie pattern
- `pp_csrf` cookie value must match `X-CSRF-Token` request header on all state-changing BFF routes

## Infrastructure Security

### Network Isolation
- Only the Next.js frontend container exposes a public port (3000)
- Auth service, App service, PostgreSQL, and Redis are on an internal Docker network
- No direct browser access to auth or app services

### Secrets Management
- All secrets via environment variables
- `.env` file is gitignored — only `.env.example` is committed
- No hardcoded credentials anywhere in the codebase

### Container Security
- Non-root users inside containers where practical
- Alpine/slim base images
- Dependencies pinned to exact versions

## Known Limitations

1. **No malware scanning** — file type validation only
2. **No email verification in dev** — `ENABLE_EMAIL=false` by default
3. **No MFA** — single-factor authentication only
4. **No IP geolocation** for suspicious login detection
5. **No automated secret rotation**

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for full list with risk ratings.
