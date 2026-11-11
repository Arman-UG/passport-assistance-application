"""app/schemas/agent.py — Pydantic v2 schemas for Agent endpoints."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.application import ApplicationHistoryResponse, ApplicationResponse
from app.schemas.document import ChecklistItemResponse, DocumentResponse


# ---------------------------------------------------------------------------
# Checklist assignment
# ---------------------------------------------------------------------------

class ChecklistItemAssign(BaseModel):
    """A single checklist item assignment payload."""

    model_config = ConfigDict(extra="forbid")

    requirement_id: UUID
    is_mandatory: bool = True
    agent_notes: Optional[str] = Field(None, max_length=1000)


class ChecklistAssignRequest(BaseModel):
    """Assign one or more document requirements to an application checklist."""

    model_config = ConfigDict(extra="forbid")

    items: List[ChecklistItemAssign] = Field(
        ..., min_length=1, description="List of checklist items to assign."
    )


# ---------------------------------------------------------------------------
# Internal notes
# ---------------------------------------------------------------------------

class InternalNoteCreate(BaseModel):
    """Create an internal note on an application."""

    model_config = ConfigDict(extra="forbid")

    content: str = Field(..., min_length=1, max_length=5000)


class InternalNoteResponse(BaseModel):
    """Response for a single internal note."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    application_id: UUID
    author_id: UUID
    content: str
    created_at: str  # ISO 8601 string for consistency


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationCreate(BaseModel):
    """Payload for sending a notification to a customer."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1, max_length=5000)


# ---------------------------------------------------------------------------
# Composite customer-application view (agent-facing)
# ---------------------------------------------------------------------------

class CustomerApplicationView(BaseModel):
    """Full view of a customer application for agents: app + documents + history."""

    application: ApplicationResponse
    checklist: List[ChecklistItemResponse] = []
    documents: List[DocumentResponse] = []
    history: List[ApplicationHistoryResponse] = []
