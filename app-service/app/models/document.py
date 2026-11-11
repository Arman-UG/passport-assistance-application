"""app/models/document.py — ApplicationDocument ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.application import Application, ApplicationChecklist


class ApplicationDocument(Base):
    """A single document file uploaded by a customer for a checklist item."""

    __tablename__ = "application_documents"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    checklist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.application_checklists.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.applications.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # File metadata
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    # Server-generated path; never derived from client input.
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column("file_size", BigInteger, nullable=False)
    # SHA-256 hex digest for integrity checks and deduplication hints.
    file_hash: Mapped[str] = mapped_column(String(128), nullable=False)

    # Review workflow
    review_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="SUBMITTED"
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    checklist: Mapped["ApplicationChecklist"] = relationship(
        "ApplicationChecklist", back_populates="documents"
    )
    application: Mapped["Application"] = relationship(
        "Application", back_populates="documents"
    )
