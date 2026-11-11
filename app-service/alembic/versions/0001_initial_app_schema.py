"""0001 — Initial app schema: create all tables for passport-platform app-service.

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# ---------------------------------------------------------------------------
# Revision identifiers, used by Alembic.
# ---------------------------------------------------------------------------
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 0. Create schema
    # ------------------------------------------------------------------
    op.execute("CREATE SCHEMA IF NOT EXISTS app")

    # ------------------------------------------------------------------
    # 1. Custom enum types
    # ------------------------------------------------------------------
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE app.application_status_enum AS ENUM (
                'DRAFT',
                'SUBMITTED',
                'DOCUMENTS_PENDING',
                'UNDER_REVIEW',
                'ADDITIONAL_INFO_REQUIRED',
                'APPROVED',
                'REJECTED',
                'CANCELLED'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE app.document_review_status_enum AS ENUM (
                'PENDING',
                'APPROVED',
                'REJECTED',
                'RESUBMISSION_REQUIRED'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE app.audit_outcome_enum AS ENUM (
                'SUCCESS',
                'FAILURE',
                'BLOCKED'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # ------------------------------------------------------------------
    # 2. app.applications
    # ------------------------------------------------------------------
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_agent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "application_reference",
            sa.String(32),
            nullable=False,
            server_default=sa.text("upper(substring(gen_random_uuid()::text, 1, 8))"),
        ),
        sa.Column(
            "application_status",
            sa.Text(),
            nullable=False,
            server_default="DRAFT",
        ),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        schema="app",
    )
    op.create_index("ix_app_applications_customer_id", "applications",
                    ["customer_id"], schema="app")
    op.create_index("ix_app_applications_agent_id", "applications",
                    ["assigned_agent_id"], schema="app")
    op.create_index("ix_app_applications_reference", "applications",
                    ["application_reference"], unique=True, schema="app")

    # ------------------------------------------------------------------
    # 3. app.document_requirements
    # ------------------------------------------------------------------
    op.create_table(
        "document_requirements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("allowed_formats", sa.String(255), nullable=False,
                  server_default="pdf,jpg,jpeg,png"),
        sa.Column("max_file_size_bytes", sa.BigInteger(), nullable=False,
                  server_default="5242880"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="TRUE"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        schema="app",
    )

    # ------------------------------------------------------------------
    # 4. app.application_checklists
    # ------------------------------------------------------------------
    op.create_table(
        "application_checklists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requirement_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_mandatory", sa.Boolean(), nullable=False, server_default="TRUE"),
        sa.Column("agent_notes", sa.Text(), nullable=True),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(
            ["application_id"], ["app.applications.id"],
            name="fk_checklist_application", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["requirement_id"], ["app.document_requirements.id"],
            name="fk_checklist_requirement", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("application_id", "requirement_id",
                            name="uq_checklist_app_req"),
        schema="app",
    )
    op.create_index("ix_app_checklists_application_id", "application_checklists",
                    ["application_id"], schema="app")

    # ------------------------------------------------------------------
    # 5. app.application_documents
    # ------------------------------------------------------------------
    op.create_table(
        "application_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("checklist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("storage_key", sa.String(512), nullable=False),
        sa.Column("mime_type", sa.String(127), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False),
        sa.Column(
            "review_status",
            sa.Text(),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("uploaded_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(
            ["checklist_id"], ["app.application_checklists.id"],
            name="fk_document_checklist", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["application_id"], ["app.applications.id"],
            name="fk_document_application", ondelete="CASCADE",
        ),
        sa.UniqueConstraint("storage_key", name="uq_document_storage_key"),
        schema="app",
    )
    op.create_index("ix_app_documents_checklist_id", "application_documents",
                    ["checklist_id"], schema="app")
    op.create_index("ix_app_documents_application_id", "application_documents",
                    ["application_id"], schema="app")
    op.create_index("ix_app_documents_uploaded_by", "application_documents",
                    ["uploaded_by"], schema="app")

    # ------------------------------------------------------------------
    # 6. app.application_history
    # ------------------------------------------------------------------
    op.create_table(
        "application_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("previous_status", sa.String(64), nullable=True),
        sa.Column("new_status", sa.String(64), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(
            ["application_id"], ["app.applications.id"],
            name="fk_history_application", ondelete="CASCADE",
        ),
        schema="app",
    )
    op.create_index("ix_app_history_application_id", "application_history",
                    ["application_id"], schema="app")

    # ------------------------------------------------------------------
    # 7. app.internal_notes
    # ------------------------------------------------------------------
    op.create_table(
        "internal_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(
            ["application_id"], ["app.applications.id"],
            name="fk_note_application", ondelete="CASCADE",
        ),
        schema="app",
    )
    op.create_index("ix_app_notes_application_id", "internal_notes",
                    ["application_id"], schema="app")

    # ------------------------------------------------------------------
    # 8. app.notifications
    # ------------------------------------------------------------------
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("recipient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sent_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="FALSE"),
        sa.Column("read_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(
            ["application_id"], ["app.applications.id"],
            name="fk_notification_application", ondelete="SET NULL",
        ),
        schema="app",
    )
    op.create_index("ix_app_notifications_recipient_id", "notifications",
                    ["recipient_id"], schema="app")

    # ------------------------------------------------------------------
    # 9. app.audit_logs
    # ------------------------------------------------------------------
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.String(255), nullable=False),
        sa.Column("outcome", sa.String(16), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        schema="app",
    )
    op.create_index("ix_app_audit_logs_actor_id", "audit_logs",
                    ["actor_id"], schema="app")
    op.create_index("ix_app_audit_logs_resource", "audit_logs",
                    ["resource_type", "resource_id"], schema="app")
    op.create_index("ix_app_audit_logs_created_at", "audit_logs",
                    ["created_at"], schema="app")

    # ------------------------------------------------------------------
    # 10. updated_at auto-trigger function + triggers
    # ------------------------------------------------------------------
    op.execute("""
        CREATE OR REPLACE FUNCTION app.set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$;
    """)

    for table in ("applications", "application_documents"):
        op.execute(f"""
            CREATE TRIGGER trg_{table}_updated_at
            BEFORE UPDATE ON app.{table}
            FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        """)


def downgrade() -> None:
    # Drop triggers
    for table in ("applications", "application_documents"):
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON app.{table}")

    op.execute("DROP FUNCTION IF EXISTS app.set_updated_at()")

    # Drop tables (reverse order)
    op.drop_table("audit_logs", schema="app")
    op.drop_table("notifications", schema="app")
    op.drop_table("internal_notes", schema="app")
    op.drop_table("application_history", schema="app")
    op.drop_table("application_documents", schema="app")
    op.drop_table("application_checklists", schema="app")
    op.drop_table("document_requirements", schema="app")
    op.drop_table("applications", schema="app")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS app.audit_outcome_enum")
    op.execute("DROP TYPE IF EXISTS app.document_review_status_enum")
    op.execute("DROP TYPE IF EXISTS app.application_status_enum")

    op.execute("DROP SCHEMA IF EXISTS app CASCADE")
