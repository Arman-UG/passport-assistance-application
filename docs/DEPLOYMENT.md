# Deployment Guide

## Production Deployment Checklist

### Pre-deployment

- [ ] Generate fresh RSA-4096 key pair for JWT signing
- [ ] Set all CHANGE_ME values in environment to strong random secrets
- [ ] Set `COOKIE_SECURE=true` (HTTPS required)
- [ ] Set `ENABLE_EMAIL=true` and configure SMTP
- [ ] Set `NODE_ENV=production` for Next.js
- [ ] Disable Spring Boot dev tools
- [ ] Set `SPRING_JPA_SHOW_SQL=false`
- [ ] Configure external PostgreSQL with connection pooling (PgBouncer recommended)
- [ ] Configure external Redis with TLS
- [ ] Set up HTTPS termination (nginx/cloud load balancer)
- [ ] Configure proper CORS origin (production domain)
- [ ] Remove `ADMIN_BOOTSTRAP_*` env vars after first setup
- [ ] Set up database backups
- [ ] Review and tighten CORS, CSP, and security headers

### Environment Variables for Production

Add these to the base `.env.example` values:

```env
NODE_ENV=production
COOKIE_SECURE=true
SPRING_PROFILES_ACTIVE=prod
ENABLE_EMAIL=true
```

### Database Migrations

```bash
# Run auth schema (Flyway — runs automatically on Spring Boot startup)
# Verify: docker compose exec auth-service curl -s localhost:8080/actuator/flyway

# Run app schema (Alembic)
docker compose exec app-service alembic upgrade head
```

### HTTPS Setup (nginx example)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Upload size limit
    client_max_body_size 6M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Backup Procedures

```bash
# PostgreSQL backup
docker compose exec postgres pg_dump -U pp_user passport_platform > backup_$(date +%Y%m%d).sql

# Redis backup (AOF is enabled — copy /data/redis/appendonly.aof)

# Document backup
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz data/uploads/
```

### Monitoring

- PostgreSQL: `pg_stat_activity`, connection counts
- Redis: `redis-cli info memory`, key count
- Application logs: structured JSON format, forward to log aggregator
- Security: monitor `auth.audit_logs` for `REFRESH_REUSE_DETECTED` events

### Recovery Procedures

1. **Compromised refresh token family detected:**
   - System auto-revokes the family
   - User is redirected to login
   - Review audit logs for the affected `actor_id`

2. **Database recovery:**
   - Restore from latest backup
   - Redis will re-populate from DB on next access
   - Running sessions may require re-authentication

3. **Secret rotation:**
   - Generate new JWT RSA key pair
   - Update env vars and restart auth-service
   - All existing access tokens become invalid immediately
   - Refresh tokens become unusable (they were opaque, not JWT)
   - All users must log in again (this is expected behavior)
