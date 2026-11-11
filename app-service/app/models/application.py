"""app/models/application.py — SQLAlchemy ORM models for core application entities."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.document import ApplicationDocument


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

class Application(Base):
    """Main passport application record."""

    __tablename__ = "applications"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    assigned_agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    application_reference: Mapped[str] = mapped_column(
        String(32), nullable=False, unique=True
    )
    application_status: Mapped[str] = mapped_column(
        String(64), nullable=False, default="DRAFT"
    )
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    checklists: Mapped[List["ApplicationChecklist"]] = relationship(
        "ApplicationChecklist",
        back_populates="application",
        cascade="all, delete-orphan",
        lazy="select",
    )
    history: Mapped[List["ApplicationHistory"]] = relationship(
        "ApplicationHistory",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ApplicationHistory.created_at",
        lazy="select",
    )
    notes: Mapped[List["InternalNote"]] = relationship(
        "InternalNote",
        back_populates="application",
        cascade="all, delete-orphan",
        lazy="select",
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification",
        back_populates="application",
        lazy="select",
    )
    documents: Mapped[List["ApplicationDocument"]] = relationship(
        "ApplicationDocument",
        back_populates="application",
        cascade="all, delete-orphan",
        lazy="select",
    )


# ---------------------------------------------------------------------------
# DocumentRequirement
# ---------------------------------------------------------------------------

class DocumentRequirement(Base):
    """Master list of document types that can be required for an application."""

    __tablename__ = "document_requirements"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    allowed_formats: Mapped[str] = mapped_column(
        String(255), nullable=False, default="pdf,jpg,jpeg,png"
    )
    max_file_size_bytes: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=5_242_880
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    # Relationships
    checklists: Mapped[List["ApplicationChecklist"]] = relationship(
        "ApplicationChecklist",
        back_populates="requirement",
        lazy="select",
    )


# ---------------------------------------------------------------------------
# ApplicationChecklist
# ---------------------------------------------------------------------------

class ApplicationChecklist(Base):
    """Junction between an Application and a DocumentRequirement."""

    __tablename__ = "application_checklists"
    __table_args__ = (
        UniqueConstraint("application_id", "requirement_id", name="uq_checklist_app_req"),
        {"schema": "app"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.document_requirements.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    agent_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    # Relationships
    application: Mapped["Application"] = relationship(
        "Application", back_populates="checklists"
    )
    requirement: Mapped["DocumentRequirement"] = relationship(
        "DocumentRequirement", back_populates="checklists"
    )
    documents: Mapped[List["ApplicationDocument"]] = relationship(
        "ApplicationDocument",
        back_populates="checklist",
        lazy="select",
    )


# ---------------------------------------------------------------------------
# ApplicationHistory
# ---------------------------------------------------------------------------

class ApplicationHistory(Base):
    """Immutable audit trail of status changes on an application."""

    __tablename__ = "application_history"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    changed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    previous_status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    new_status: Mapped[str] = mapped_column(String(64), nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    # Relationships
    application: Mapped["Application"] = relationship(
        "Application", back_populates="history"
    )


# ---------------------------------------------------------------------------
# InternalNote
# ---------------------------------------------------------------------------

class InternalNote(Base):
    """Agent-only internal notes on an application (not visible to customer)."""

    __tablename__ = "internal_notes"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    # Relationships
    application: Mapped["Application"] = relationship(
        "Application", back_populates="notes"
    )


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------

class Notification(Base):
    """In-app notifications sent to customers."""

    __tablename__ = "notifications"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    application_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.applications.id", ondelete="SET NULL"),
        nullable=True,
    )
    sent_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    # Relationships
    application: Mapped[Optional["Application"]] = relationship(
        "Application", back_populates="notifications"
    )
