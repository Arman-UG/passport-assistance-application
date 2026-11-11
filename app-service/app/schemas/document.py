"""app/schemas/document.py — Pydantic v2 schemas for Document endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# Valid review statuses
# ---------------------------------------------------------------------------
VALID_REVIEW_STATUSES = frozenset({"APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"})


# ---------------------------------------------------------------------------
# DocumentRequirement
# ---------------------------------------------------------------------------

class DocumentRequirementResponse(BaseModel):
    """Public representation of a document requirement definition."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str]
    allowed_formats: str
    max_file_size_bytes: int
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Checklist
# ---------------------------------------------------------------------------

class ChecklistItemResponse(BaseModel):
    """Checklist item with embedded requirement details and submission status."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    application_id: UUID
    requirement_id: UUID
    is_mandatory: bool
    agent_notes: Optional[str]
    assigned_by: Optional[UUID]
    created_at: datetime

    # Populated separately when fetching with documents
    requirement: Optional[DocumentRequirementResponse] = None
    # Latest document submitted for this checklist item (None if not yet uploaded)
    latest_document_status: Optional[str] = None


# ---------------------------------------------------------------------------
# Document upload / response
# ---------------------------------------------------------------------------

class DocumentUploadResponse(BaseModel):
    """Slim confirmation returned after a successful upload."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    checklist_id: UUID
    application_id: UUID
    review_status: str
    mime_type: str
    file_size_bytes: int
    original_filename: str
    uploaded_at: datetime


class DocumentResponse(BaseModel):
    """Full representation of an application document record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    checklist_id: UUID
    application_id: UUID
    uploaded_by: UUID
    original_filename: str
    storage_key: str
    mime_type: str
    file_size_bytes: int
    file_hash: str
    review_status: str
    rejection_reason: Optional[str]
    reviewed_by: Optional[UUID]
    reviewed_at: Optional[datetime]
    uploaded_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Document review
# ---------------------------------------------------------------------------

class DocumentReviewRequest(BaseModel):
    """Payload sent by an agent to review a document."""

    model_config = ConfigDict(extra="forbid")

    review_status: str = Field(
        ...,
        description="Must be one of: APPROVED, REJECTED, RESUBMISSION_REQUIRED",
    )
    rejection_reason: Optional[str] = Field(
        None,
        max_length=2000,
        description="Required when review_status is REJECTED or RESUBMISSION_REQUIRED.",
    )

    @field_validator("review_status")
    @classmethod
    def validate_review_status(cls, v: str) -> str:
        normalized = v.upper()
        if normalized not in VALID_REVIEW_STATUSES:
            raise ValueError(
                f"Invalid review_status '{v}'. "
                "Must be one of: APPROVED, REJECTED, RESUBMISSION_REQUIRED"
            )
        return normalized

    def model_post_init(self, __context: object) -> None:
        if self.review_status in ("REJECTED", "RESUBMISSION_REQUIRED"):
            if not self.rejection_reason or not self.rejection_reason.strip():
                raise ValueError(
                    "rejection_reason is required when review_status is "
                    f"'{self.review_status}'."
                )
