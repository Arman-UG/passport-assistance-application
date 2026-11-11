# Passport Application Assistance Platform

A production-oriented platform that acts as a mediator between customers and passport agents. It simplifies the passport application preparation process by allowing customers to register, access their dashboard, understand document requirements, submit documents, and track application progress.

> **Disclaimer:** This platform is NOT an official government passport issuance system. It is not affiliated with the Government of India or Passport Seva.

---

## Architecture

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | Next.js 15 + TypeScript + Tailwind | 3000 | UI + BFF (cookie auth, CSRF, proxy) |
| **Auth Service** | Java 21 + Spring Boot 3.4 | 8080 | Authentication authority (internal only) |
| **App Service** | Python 3.12 + FastAPI | 8000 | Application management (internal only) |
| **Database** | PostgreSQL 16 | 5432 | Permanent store (internal only) |
| **Cache** | Redis 7.4 | 6379 | Sessions, rate limits (internal only) |

**Only port 3000 (Next.js) is exposed publicly.** All other services communicate on an internal Docker network.

---

## Quick Start (Development)

### Prerequisites
- Docker Desktop 4.x+
- Git

### 1. Clone and configure

```bash
git clone <repo-url>
cd passport-platform
cp .env.example .env
```

### 2. Generate JWT RS256 keys

```bash
# Generate RSA key pair
openssl genrsa -out auth_private.pem 4096
openssl rsa -in auth_private.pem -pubout -out auth_public.pem

# Base64-encode (single line, no newlines)
# On Linux/Mac:
PRIVATE_KEY=$(base64 -w 0 auth_private.pem)
PUBLIC_KEY=$(base64 -w 0 auth_public.pem)

# On Windows (PowerShell):
$PRIVATE_KEY = [Convert]::ToBase64String([IO.File]::ReadAllBytes("auth_private.pem"))
$PUBLIC_KEY  = [Convert]::ToBase64String([IO.File]::ReadAllBytes("auth_public.pem"))
```

Paste the values into `.env` as `JWT_PRIVATE_KEY_BASE64` and `JWT_PUBLIC_KEY_BASE64` (also `JWT_PUBLIC_KEY_BASE64_APP`).

> ⚠️ **Delete the .pem files after copying the values.** Never commit them.

### 3. Set remaining .env values

Edit `.env` and replace all `CHANGE_ME_*` placeholders with strong random values.

### 4. Start Docker Desktop and run

```bash
docker compose up --build
```

### 5. Access the application

- **Frontend:** http://localhost:3000
- **Auth Service health:** http://localhost:8080/actuator/health (internal)
- **App Service health:** http://localhost:8000/health (internal)

### 6. Seed an admin account

Set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in `.env` before first startup. The auth service will create the admin account on startup. **Change the password immediately after first login.**

---

## Project Structure

```
passport-platform/
├── frontend/          # Service A — Next.js Frontend + BFF
├── auth-service/      # Service B — Java Spring Boot Auth
├── app-service/       # Service C — Python FastAPI App
├── database/
│   └── init/          # PostgreSQL initialization SQL
├── data/              # Docker volume data (gitignored)
├── docs/              # Architecture and security docs
├── docker-compose.yml
├── .env.example       # Environment variable template
└── README.md
```

---

## Development Workflow

```bash
# Start all services
docker compose up

# Rebuild a specific service after code changes
docker compose up --build auth-service

# View logs
docker compose logs -f auth-service
docker compose logs -f app-service
docker compose logs -f frontend

# Run database migrations (FastAPI/Alembic)
docker compose exec app-service alembic upgrade head

# Access PostgreSQL
docker compose exec postgres psql -U pp_user -d passport_platform

# Access Redis
docker compose exec redis redis-cli -a <REDIS_PASSWORD>
```

---

## Security Notes

- Tokens are stored in **HttpOnly, Secure cookies** — never in localStorage.
- Passwords are hashed with **Argon2id** (64 MB memory, 3 iterations).
- JWT tokens use **RS256** asymmetric signing.
- Refresh tokens are stored as **SHA-256 hashes** only.
- Uploaded documents are stored in a **private Docker volume** — no public URLs.
- All backend services are **not reachable from the browser** — only the Next.js BFF is public-facing.

See [docs/SECURITY.md](docs/SECURITY.md) for the full security design.

---

## Technology Stack

| Component | Version |
|-----------|---------|
| Next.js | 15.1.x |
| React | 19.0.x |
| TypeScript | 5.7.x |
| Tailwind CSS | 3.4.x |
| Java | 21 (LTS) |
| Spring Boot | 3.4.1 |
| Python | 3.12 |
| FastAPI | 0.115.5 |
| PostgreSQL | 16.x |
| Redis | 7.4.x |

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Contracts](docs/API_CONTRACTS.md)
- [Security Design](docs/SECURITY.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security Test Report](docs/TEST_REPORT.md)
- [Known Limitations](docs/KNOWN_LIMITATIONS.md)

---

## License

This project is developed for educational and commercial assistance purposes. See LICENSE for terms.
