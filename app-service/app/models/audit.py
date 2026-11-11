"""app/models/audit.py — Immutable audit log ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class AppAuditLog(Base):
    """Append-only audit log.  Rows must never be updated or deleted."""

    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    # Short action identifier, e.g. "DOCUMENT_UPLOAD", "STATUS_CHANGE"
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    # Type of the resource affected, e.g. "ApplicationDocument", "Application"
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    # String representation of the resource PK (UUID or composite)
    resource_id: Mapped[str] = mapped_column(String(255), nullable=False)
    # SUCCESS | FAILURE | BLOCKED
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    # Safe key-value metadata — MUST NOT contain secrets, tokens, or file content.
    safe_metadata: Mapped[Optional[Any]] = mapped_column("safe_metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
