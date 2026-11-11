"""app/schemas/application.py — Pydantic v2 schemas for Application endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# Valid application statuses (single source of truth for validation)
# ---------------------------------------------------------------------------
VALID_APPLICATION_STATUSES = frozenset(
    {
        "DRAFT",
        "SUBMITTED",
        "DOCUMENTS_PENDING",
        "UNDER_REVIEW",
        "ADDITIONAL_INFO_REQUIRED",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
    }
)


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ApplicationCreate(BaseModel):
    """Creating an application requires no body fields; customer_id comes from JWT."""

    model_config = ConfigDict(extra="forbid")


class ApplicationStatusUpdate(BaseModel):
    """Payload for agent/admin status changes."""

    model_config = ConfigDict(extra="forbid")

    new_status: str = Field(..., description="Target application status.")
    remarks: Optional[str] = Field(
        None, max_length=2000, description="Optional remarks for the history entry."
    )

    @field_validator("new_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        normalized = v.upper()
        if normalized not in VALID_APPLICATION_STATUSES:
            raise ValueError(
                f"Invalid status '{v}'. Must be one of: "
                + ", ".join(sorted(VALID_APPLICATION_STATUSES))
            )
        return normalized


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ApplicationResponse(BaseModel):
    """Public representation of a passport application."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    customer_id: UUID
    assigned_agent_id: Optional[UUID]
    application_reference: str
    application_status: str
    created_at: datetime
    updated_at: datetime


class ApplicationHistoryResponse(BaseModel):
    """Single status-change history entry."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    application_id: UUID
    changed_by: UUID
    previous_status: Optional[str]
    new_status: str
    remarks: Optional[str]
    created_at: datetime
