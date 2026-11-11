-- Flyway migration V1: Initialize auth schema tables
-- Schema: auth

CREATE SCHEMA IF NOT EXISTS auth;

-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.users (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(200)    NOT NULL,
    email               VARCHAR(255)    NOT NULL,
    email_normalized    VARCHAR(255)    NOT NULL,
    email_verified      BOOLEAN         NOT NULL DEFAULT FALSE,
    password_hash       TEXT            NOT NULL,
    role                VARCHAR(20)     NOT NULL DEFAULT 'CUSTOMER'
                        CHECK (role IN ('CUSTOMER', 'AGENT', 'ADMIN')),
    account_status      VARCHAR(30)     NOT NULL DEFAULT 'PENDING_VERIFICATION'
                        CHECK (account_status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    failed_login_count  INTEGER         NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    last_login_ip       VARCHAR(45),
    created_by          UUID,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_normalized ON auth.users (email_normalized);
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users (role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON auth.users (account_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON auth.users (created_at);

-- ─── SESSIONS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.sessions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_family_id     UUID            NOT NULL,
    refresh_token_hash  TEXT            NOT NULL,
    session_status      VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE'
                        CHECK (session_status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    device_info         VARCHAR(500),
    ip_address          VARCHAR(45),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_used_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ     NOT NULL,
    revoked_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_token_family ON auth.sessions (token_family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON auth.sessions (session_status);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON auth.sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON auth.sessions (refresh_token_hash);

-- ─── EMAIL VERIFICATIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_verif_token_hash ON auth.email_verifications (token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verif_user_id ON auth.email_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verif_expires ON auth.email_verifications (expires_at);

-- ─── PASSWORD RESETS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.password_resets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pwd_reset_token_hash ON auth.password_resets (token_hash);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user_id ON auth.password_resets (user_id);

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.audit_logs (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID,
    action          VARCHAR(100)        NOT NULL,
    resource_type   VARCHAR(100),
    resource_id     VARCHAR(255),
    outcome         VARCHAR(20)         NOT NULL
                    CHECK (outcome IN ('SUCCESS', 'FAILURE', 'BLOCKED')),
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON auth.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON auth.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON auth.audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_outcome ON auth.audit_logs (outcome);

-- ─── updated_at trigger function ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON auth.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();
