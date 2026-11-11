"""app/services/document_service.py — Document business logic and file management."""

from __future__ import annotations

import os
from pathlib import Path
from uuid import UUID

import aiofiles
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.application import Application, ApplicationChecklist, ApplicationHistory
from app.models.document import ApplicationDocument
from app.schemas.document import DocumentReviewRequest, DocumentUploadResponse
from app.security.file_validator import FileValidator
from app.security.jwt_verifier import TokenData
from app.services.audit_service import OUTCOME_BLOCKED, OUTCOME_SUCCESS, log_event

file_validator = FileValidator()


async def upload_document(
    db: AsyncSession,
    application_id: UUID,
    checklist_id: UUID,
    file: UploadFile,
    current_user: TokenData,
) -> DocumentUploadResponse:
    settings = get_settings()

    # 1. Verify application exists and belongs to current_user
    stmt = (
        select(Application)
        .where(Application.id == application_id)
        .options(selectinload(Application.checklists))
    )
    result = await db.execute(stmt)
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    # Ownership check: customers can only upload to their own application
    if current_user.role == "CUSTOMER" and application.customer_id != current_user.user_id:
        await log_event(
            db, current_user.user_id, "DOCUMENT_UPLOAD_DENIED",
            "Application", str(application_id), OUTCOME_BLOCKED,
            {"reason": "Ownership mismatch"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to upload documents to this application",
        )

    # 2. Verify checklist item belongs to this application
    chk_stmt = select(ApplicationChecklist).where(
        ApplicationChecklist.id == checklist_id,
        ApplicationChecklist.application_id == application_id,
    )
    chk_res = await db.execute(chk_stmt)
    checklist_item = chk_res.scalar_one_or_none()

    if not checklist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found for this application",
        )

    # 3. Read content and validate file
    content = await file.read()
    await file_validator.validate_upload(file, content, settings)

    # 4. Generate safe server-side storage path
    original_filename = file_validator.sanitize_original_filename(file.filename or "upload")
    extension = file_validator._extract_extension(original_filename)
    storage_key = file_validator.generate_storage_key(extension)
    file_hash = file_validator.compute_file_hash(content)

    full_disk_path = Path(settings.upload_dir) / storage_key
    full_disk_path.parent.mkdir(parents=True, exist_ok=True)

    # 5. Write to disk
    async with aiofiles.open(full_disk_path, "wb") as f:
        await f.write(content)

    # 6. Save or update ApplicationDocument
    doc = ApplicationDocument(
        checklist_id=checklist_id,
        application_id=application_id,
        original_filename=original_filename,
        storage_key=storage_key,
        mime_type=file.content_type or "application/octet-stream",
        file_size_bytes=len(content),
        file_hash=file_hash,
        review_status="SUBMITTED",
    )
    db.add(doc)

    # 7. Update application status if it was in draft or documents pending
    if application.application_status in ("INITIATED", "DRAFT", "CHECKLIST_ASSIGNED", "DOCUMENTS_PENDING"):
        prev_status = application.application_status
        application.application_status = "DOCUMENTS_SUBMITTED"
        history = ApplicationHistory(
            application_id=application_id,
            changed_by=current_user.user_id,
            previous_status=prev_status,
            new_status="DOCUMENTS_SUBMITTED",
            remarks=f"Document uploaded: {original_filename}",
        )
        db.add(history)

    await log_event(
        db, current_user.user_id, "DOCUMENT_UPLOAD",
        "ApplicationDocument", str(doc.id), OUTCOME_SUCCESS,
        {"filename": original_filename, "size": len(content)}
    )

    await db.commit()
    await db.refresh(doc)

    return DocumentUploadResponse(
        id=doc.id,
        checklist_id=doc.checklist_id,
        application_id=doc.application_id,
        review_status=doc.review_status,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        original_filename=doc.original_filename,
        uploaded_at=doc.uploaded_at,
    )


async def get_document_for_download(
    db: AsyncSession,
    document_id: UUID,
    current_user: TokenData,
) -> tuple[Path, str, str]:
    stmt = (
        select(ApplicationDocument)
        .where(ApplicationDocument.id == document_id)
        .options(selectinload(ApplicationDocument.application))
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Authorization check
    app = doc.application
    if current_user.role == "CUSTOMER":
        if app.customer_id != current_user.user_id:
            await log_event(
                db, current_user.user_id, "DOCUMENT_DOWNLOAD_DENIED",
                "ApplicationDocument", str(document_id), OUTCOME_BLOCKED,
                {"reason": "Ownership mismatch"}
            )
            raise HTTPException(status_code=403, detail="Forbidden")
    elif current_user.role == "AGENT":
        if app.assigned_agent_id and app.assigned_agent_id != current_user.user_id:
            await log_event(
                db, current_user.user_id, "DOCUMENT_DOWNLOAD_DENIED",
                "ApplicationDocument", str(document_id), OUTCOME_BLOCKED,
                {"reason": "Unassigned agent"}
            )
            raise HTTPException(status_code=403, detail="Forbidden: You are not assigned to this application")

    settings = get_settings()
    disk_path = Path(settings.upload_dir) / doc.storage_key

    if not disk_path.exists():
        raise HTTPException(status_code=404, detail="File on storage not found")

    await log_event(
        db, current_user.user_id, "DOCUMENT_DOWNLOAD",
        "ApplicationDocument", str(document_id), OUTCOME_SUCCESS,
        {"filename": doc.original_filename}
    )

    return disk_path, doc.mime_type, doc.original_filename


async def review_document(
    db: AsyncSession,
    document_id: UUID,
    review_req: DocumentReviewRequest,
    current_user: TokenData,
) -> ApplicationDocument:
    stmt = (
        select(ApplicationDocument)
        .where(ApplicationDocument.id == document_id)
        .options(selectinload(ApplicationDocument.application))
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    app = doc.application
    if current_user.role == "AGENT":
        if app.assigned_agent_id and app.assigned_agent_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="You are not assigned to this application")

    from datetime import datetime, timezone
    doc.review_status = review_req.review_status
    doc.rejection_reason = review_req.rejection_reason
    doc.reviewed_by = current_user.user_id
    doc.reviewed_at = datetime.now(timezone.utc)

    # History entry
    history = ApplicationHistory(
        application_id=app.id,
        changed_by=current_user.user_id,
        previous_status=app.application_status,
        new_status=app.application_status,
        remarks=f"Document {doc.original_filename} reviewed: {doc.review_status}" +
                (f" ({doc.rejection_reason})" if doc.rejection_reason else ""),
    )
    db.add(history)

    await log_event(
        db, current_user.user_id, "DOCUMENT_REVIEW",
        "ApplicationDocument", str(document_id), OUTCOME_SUCCESS,
        {"status": doc.review_status, "rejection_reason": doc.rejection_reason}
    )

    await db.commit()
    await db.refresh(doc)
    return doc
