"""app/routers/documents.py — Document upload, download, and review endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_agent, get_current_user
from app.models.application import DocumentRequirement
from app.models.document import ApplicationDocument
from app.schemas.document import (
    DocumentRequirementResponse,
    DocumentResponse,
    DocumentReviewRequest,
    DocumentUploadResponse,
)
from app.security.jwt_verifier import TokenData
from app.services.document_service import (
    get_document_for_download,
    review_document,
    upload_document,
)

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("/requirements", response_model=list[DocumentRequirementResponse])
async def list_requirements(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Retrieve all active document requirements."""
    stmt = select(DocumentRequirement).where(DocumentRequirement.is_active == True)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/upload/{app_id}/{checklist_id}",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload(
    app_id: UUID,
    checklist_id: UUID,
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Secure document upload endpoint with file signature validation and private storage."""
    return await upload_document(
        db=db,
        application_id=app_id,
        checklist_id=checklist_id,
        file=file,
        current_user=current_user,
    )


@router.get("/{doc_id}/download")
async def download(
    doc_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Secure document download endpoint enforcing access control."""
    disk_path, mime_type, original_filename = await get_document_for_download(
        db=db,
        document_id=doc_id,
        current_user=current_user,
    )

    return FileResponse(
        path=disk_path,
        media_type=mime_type,
        filename=original_filename,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f'attachment; filename="{original_filename}"',
        },
    )


@router.patch("/{doc_id}/review", response_model=DocumentResponse)
async def review(
    doc_id: UUID,
    review_req: DocumentReviewRequest,
    current_user: TokenData = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Agent / Admin reviews and marks a document APPROVED, REJECTED, or RESUBMISSION_REQUIRED."""
    return await review_document(
        db=db,
        document_id=doc_id,
        review_req=review_req,
        current_user=current_user,
    )
