"""app/routers/applications.py — Application endpoints."""

from __future__ import annotations

import random
import string
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_customer, get_current_user
from app.models.application import (
    Application,
    ApplicationChecklist,
    ApplicationHistory,
    DocumentRequirement,
)
from app.models.document import ApplicationDocument
from app.schemas.application import ApplicationHistoryResponse, ApplicationResponse
from app.security.jwt_verifier import TokenData
from app.services.audit_service import OUTCOME_BLOCKED, OUTCOME_SUCCESS, log_event

router = APIRouter(prefix="/api/applications", tags=["Applications"])


def generate_application_reference() -> str:
    """Generate a formatted reference like PP-2026-AB12CD."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"PP-2026-{suffix}"


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    current_user: TokenData = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """Customer initiates a new passport application."""
    ref = generate_application_reference()

    app = Application(
        customer_id=current_user.user_id,
        application_reference=ref,
        application_status="INITIATED",
    )
    db.add(app)
    await db.flush()

    # Automatically seed default active requirements as default checklist
    req_stmt = select(DocumentRequirement).where(DocumentRequirement.is_active == True)
    req_res = await db.execute(req_stmt)
    requirements = req_res.scalars().all()

    for req in requirements:
        chk = ApplicationChecklist(
            application_id=app.id,
            requirement_id=req.id,
            is_mandatory=True,
        )
        db.add(chk)

    # Initial history record
    history = ApplicationHistory(
        application_id=app.id,
        changed_by=current_user.user_id,
        previous_status=None,
        new_status="INITIATED",
        remarks="Application created by applicant",
    )
    db.add(history)

    await log_event(
        db, current_user.user_id, "APPLICATION_CREATED",
        "Application", str(app.id), OUTCOME_SUCCESS,
        {"reference": ref}
    )

    await db.commit()
    await db.refresh(app)
    return app


@router.get("/me", response_model=list[ApplicationResponse])
async def get_my_applications(
    current_user: TokenData = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """List all passport applications belonging to the current customer."""
    stmt = (
        select(Application)
        .where(Application.customer_id == current_user.user_id)
        .order_by(desc(Application.created_at))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(
    app_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get application details with ownership / assignment check."""
    stmt = select(Application).where(Application.id == app_id)
    result = await db.execute(stmt)
    app = result.scalar_one_or_none()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Authorization
    if current_user.role == "CUSTOMER" and app.customer_id != current_user.user_id:
        await log_event(
            db, current_user.user_id, "APPLICATION_ACCESS_DENIED",
            "Application", str(app_id), OUTCOME_BLOCKED, {"reason": "Not owner"}
        )
        raise HTTPException(status_code=403, detail="Forbidden")

    if current_user.role == "AGENT" and app.assigned_agent_id and app.assigned_agent_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: Unassigned application")

    return app


@router.get("/{app_id}/checklist")
async def get_application_checklist(
    app_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full checklist items for an application, including submitted documents and review status."""
    stmt = select(Application).where(Application.id == app_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == "CUSTOMER" and app.customer_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    chk_stmt = (
        select(ApplicationChecklist)
        .where(ApplicationChecklist.application_id == app_id)
        .options(
            selectinload(ApplicationChecklist.requirement),
            selectinload(ApplicationChecklist.documents),
        )
        .order_by(ApplicationChecklist.created_at)
    )
    chk_res = await db.execute(chk_stmt)
    items = chk_res.scalars().all()

    response = []
    for item in items:
        # Latest document if any
        latest_doc = None
        if item.documents:
            latest_doc = sorted(item.documents, key=lambda d: d.uploaded_at, reverse=True)[0]

        response.append({
            "id": str(item.id),
            "application_id": str(item.application_id),
            "requirement_id": str(item.requirement_id),
            "is_mandatory": item.is_mandatory,
            "agent_notes": item.agent_notes,
            "requirement": {
                "id": str(item.requirement.id),
                "name": item.requirement.name,
                "description": item.requirement.description,
                "allowed_formats": item.requirement.allowed_formats,
                "max_file_size_bytes": item.requirement.max_file_size_bytes,
            } if item.requirement else None,
            "document": {
                "id": str(latest_doc.id),
                "original_filename": latest_doc.original_filename,
                "review_status": latest_doc.review_status,
                "rejection_reason": latest_doc.rejection_reason,
                "uploaded_at": latest_doc.uploaded_at.isoformat() if latest_doc.uploaded_at else None,
            } if latest_doc else None,
            "status": latest_doc.review_status if latest_doc else "NOT_SUBMITTED"
        })

    return response


@router.get("/{app_id}/history", response_model=list[ApplicationHistoryResponse])
async def get_application_history(
    app_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full timeline of application status changes."""
    stmt = select(Application).where(Application.id == app_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == "CUSTOMER" and app.customer_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    hist_stmt = (
        select(ApplicationHistory)
        .where(ApplicationHistory.application_id == app_id)
        .order_by(desc(ApplicationHistory.created_at))
    )
    hist_res = await db.execute(hist_stmt)
    return hist_res.scalars().all()
