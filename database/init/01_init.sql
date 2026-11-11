-- ============================================================
-- Passport Platform — PostgreSQL Initialization
-- Runs once on first container start (alphabetical order)
-- ============================================================

-- Create separate schemas for each service
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS app;

-- ============================================================
-- SCHEMA: auth  (owned by Java Auth Service)
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS auth.users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name         VARCHAR(200) NOT NULL,
    email             VARCHAR(255) NOT NULL,
    email_normalized  VARCHAR(255) NOT NULL,
    password_hash     VARCHAR(600) NOT NULL,
    role              VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER'
                      CHECK (role IN ('CUSTOMER','AGENT','ADMIN')),
    account_status    VARCHAR(30)  NOT NULL DEFAULT 'PENDING_VERIFICATION'
                      CHECK (account_status IN (
                          'PENDING_VERIFICATION','ACTIVE','SUSPENDED','DEACTIVATED'
                      )),
    email_verified    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_email_normalized UNIQUE (email_normalized)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON auth.users(account_status);

-- Sessions
CREATE TABLE IF NOT EXISTS auth.sessions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_family_id     UUID        NOT NULL,
    refresh_token_hash  VARCHAR(600) NOT NULL,
    session_status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                        CHECK (session_status IN ('ACTIVE','REVOKED','EXPIRED')),
    device_info         VARCHAR(500),
    ip_address          INET,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ,
    CONSTRAINT uq_token_family UNIQUE (token_family_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_family   ON auth.sessions(token_family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status   ON auth.sessions(session_status);

-- Email verifications
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(600) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Password resets
CREATE TABLE IF NOT EXISTS auth.password_resets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(600) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auth audit logs
CREATE TABLE IF NOT EXISTS auth.audit_logs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id   VARCHAR(200),
    outcome       VARCHAR(20)  NOT NULL CHECK (outcome IN ('SUCCESS','FAILURE','BLOCKED')),
    ip_address    INET,
    user_agent    VARCHAR(500),
    safe_metadata JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_actor   ON auth.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_action  ON auth.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth.audit_logs(created_at DESC);

-- Auto-update updated_at trigger for users
CREATE OR REPLACE FUNCTION auth.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

-- ============================================================
-- SCHEMA: app  (owned by Python FastAPI App Service)
-- ============================================================

-- Passport applications
CREATE TABLE IF NOT EXISTS app.applications (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id           UUID        NOT NULL,  -- auth.users.id (cross-schema ref)
    assigned_agent_id     UUID,                  -- auth.users.id
    application_reference VARCHAR(20)  NOT NULL UNIQUE,
    application_status    VARCHAR(50)  NOT NULL DEFAULT 'INITIATED'
                          CHECK (application_status IN (
                              'INITIATED','CHECKLIST_ASSIGNED','DOCUMENTS_SUBMITTED',
                              'UNDER_REVIEW','ADDITIONAL_DOCS_REQUESTED','REVIEW_COMPLETE',
                              'PROCESSING','COMPLETED','CANCELLED'
                          )),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_customer   ON app.applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_applications_agent      ON app.applications(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_applications_status     ON app.applications(application_status);
CREATE INDEX IF NOT EXISTS idx_applications_ref        ON app.applications(application_reference);

-- Configurable document requirements (master list)
CREATE TABLE IF NOT EXISTS app.document_requirements (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(200) NOT NULL,
    description       TEXT,
    instructions      TEXT,
    precautions       TEXT,
    accepted_formats  VARCHAR(200) NOT NULL DEFAULT 'pdf,jpg,jpeg,png',
    maximum_file_size INTEGER      NOT NULL DEFAULT 5242880,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order        INTEGER      NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_req_active ON app.document_requirements(is_active);

-- Application-specific checklists (agent assigns subset to each application)
CREATE TABLE IF NOT EXISTS app.application_checklists (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID        NOT NULL REFERENCES app.applications(id) ON DELETE CASCADE,
    requirement_id  UUID        NOT NULL REFERENCES app.document_requirements(id),
    is_mandatory    BOOLEAN     NOT NULL DEFAULT TRUE,
    agent_notes     TEXT,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_req UNIQUE (application_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_checklist_app ON app.application_checklists(application_id);

-- Submitted documents
CREATE TABLE IF NOT EXISTS app.application_documents (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID        NOT NULL REFERENCES app.applications(id) ON DELETE RESTRICT,
    checklist_id      UUID        NOT NULL REFERENCES app.application_checklists(id),
    storage_key       VARCHAR(500) NOT NULL UNIQUE,  -- server-generated random path
    original_filename VARCHAR(255) NOT NULL,
    mime_type         VARCHAR(100) NOT NULL,
    file_size         INTEGER      NOT NULL,
    file_hash         VARCHAR(128) NOT NULL,          -- SHA-256 hex
    review_status     VARCHAR(30)  NOT NULL DEFAULT 'SUBMITTED'
                      CHECK (review_status IN (
                          'SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','RESUBMISSION_REQUIRED'
                      )),
    rejection_reason  TEXT,
    reviewed_by       UUID,                            -- agent auth.users.id
    uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_docs_application ON app.application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_app_docs_checklist   ON app.application_documents(checklist_id);
CREATE INDEX IF NOT EXISTS idx_app_docs_status      ON app.application_documents(review_status);

-- Immutable application history / timeline
CREATE TABLE IF NOT EXISTS app.application_history (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id   UUID        NOT NULL REFERENCES app.applications(id),
    changed_by       UUID        NOT NULL,  -- auth.users.id
    previous_status  VARCHAR(50),
    new_status       VARCHAR(50)  NOT NULL,
    remarks          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_history_application ON app.application_history(application_id);
CREATE INDEX IF NOT EXISTS idx_app_history_created     ON app.application_history(created_at DESC);

-- Agent internal notes (not visible to customer)
CREATE TABLE IF NOT EXISTS app.internal_notes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID        NOT NULL REFERENCES app.applications(id),
    agent_id        UUID        NOT NULL,
    content         TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_application ON app.internal_notes(application_id);

-- Notifications
CREATE TABLE IF NOT EXISTS app.notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    application_id  UUID        REFERENCES app.applications(id) ON DELETE SET NULL,
    title           VARCHAR(300) NOT NULL,
    message         TEXT        NOT NULL,
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON app.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON app.notifications(created_at DESC);

-- App audit logs
CREATE TABLE IF NOT EXISTS app.audit_logs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID        NOT NULL,
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id   VARCHAR(200),
    outcome       VARCHAR(20)  NOT NULL CHECK (outcome IN ('SUCCESS','FAILURE','BLOCKED')),
    safe_metadata JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_audit_actor   ON app.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_app_audit_action  ON app.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_app_audit_created ON app.audit_logs(created_at DESC);

-- Auto-update trigger for applications
CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON app.applications
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- ============================================================
-- Seed: Default document requirement catalogue
-- ============================================================
INSERT INTO app.document_requirements (name, description, instructions, precautions, accepted_formats, maximum_file_size, sort_order)
VALUES
    ('Aadhaar Card',
     'Government-issued 12-digit unique identity card issued by UIDAI.',
     'Upload a clear, colour scan of both sides of your Aadhaar card. Ensure all text is legible.',
     'Mask your Aadhaar number if sharing a virtual ID. Do not upload a photocopy of a photocopy.',
     'pdf,jpg,jpeg,png', 5242880, 10),

    ('PAN Card',
     'Permanent Account Number card issued by the Income Tax Department of India.',
     'Upload a clear, colour scan of the front of your PAN card.',
     'Ensure the PAN number and name are clearly visible and match your application details.',
     'pdf,jpg,jpeg,png', 5242880, 20),

    ('Voter ID (EPIC)',
     'Electors Photo Identity Card issued by the Election Commission of India.',
     'Upload clear scans of both the front and back of your Voter ID card.',
     'Both the photo page and address page must be clearly legible.',
     'pdf,jpg,jpeg,png', 5242880, 30),

    ('Date of Birth Proof',
     'Official document proving your date of birth.',
     'Acceptable documents include: Birth Certificate, School Leaving Certificate, SSC/HSC Marksheet.',
     'The document must clearly state your full name and date of birth exactly as they appear on your application.',
     'pdf,jpg,jpeg,png', 5242880, 40),

    ('Address Proof',
     'Official document confirming your current residential address.',
     'Acceptable documents: Aadhaar, Voter ID, Utility Bill (not older than 3 months), Bank Statement.',
     'The address must match the address provided in your application form.',
     'pdf,jpg,jpeg,png', 5242880, 50),

    ('Passport-Size Photograph',
     'Recent passport-size colour photograph meeting official specifications.',
     'Photo must be: 35mm × 45mm, white background, face clearly visible, taken within last 6 months, in colour.',
     'Black & white photos, selfies or photos with sunglasses/caps are not accepted.',
     'jpg,jpeg,png', 2097152, 60),

    ('School Leaving Certificate',
     'School Leaving Certificate or Transfer Certificate from your last attended school.',
     'Upload a clear scan of the original certificate. Attested copies may be accepted — check with your agent.',
     'The certificate must bear the school seal and principal signature.',
     'pdf,jpg,jpeg,png', 5242880, 70)
ON CONFLICT DO NOTHING;
