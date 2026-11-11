"""app/models/__init__.py — Re-export all ORM models so that Base.metadata is populated."""

from app.models.application import (  # noqa: F401
    Application,
    ApplicationChecklist,
    ApplicationHistory,
    DocumentRequirement,
    InternalNote,
    Notification,
)
from app.models.document import ApplicationDocument  # noqa: F401
from app.models.audit import AppAuditLog  # noqa: F401

__all__ = [
    "Application",
    "ApplicationChecklist",
    "ApplicationHistory",
    "DocumentRequirement",
    "InternalNote",
    "Notification",
    "ApplicationDocument",
    "AppAuditLog",
]
