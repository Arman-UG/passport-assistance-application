"""app/routers/agent.py — Agent management & review operations."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_agent
from app.models.application import (
    Application,
    ApplicationChecklist,
    ApplicationHistory,
    InternalNote,
    Notification,
)
from app.schemas.application import ApplicationResponse, ApplicationStatusUpdate
from app.security.jwt_verifier import TokenData
from app.services.audit_service import OUTCOME_SUCCESS, log_event

router = APIRouter(prefix="/api/agent", tags=["Agent Operations"])


class InternalNoteCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class CustomerNotificationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=2000)


class ChecklistAssignmentItem(BaseModel):
    requirement_id: UUID
    is_mandatory: bool = True
    agent_notes: str | None = None


@router.get("/applications")
async def list_agent_applications(
    current_user: TokenData = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """List applications assigned to the agent (or all if ADMIN)."""
    stmt = (
        select(Application)
        .options(
            selectinload(Application.checklists).selectinload(ApplicationChecklist.documents)
        )
        .order_by(desc(Application.updated_at))
    )

    if current_user.role == "AGENT":
        stmt = stmt.where(
            (Application.assigned_agent_id == current_user.user_id) |
            (Application.assigned_agent_id.is_(None))
        )

    result = await db.execute(stmt)
    apps = result.scalars().all()

    response = []
    for app in apps:
        total_docs = len(app.checklists)
        uploaded_count = sum(1 for c in app.checklists if c.documents)
        approved_count = sum(1 for c in app.checklists if any(d.review_status == "APPROVED" for d in c.documents))

        response.append({
            "id": str(app.id),
            "customer_id": str(app.customer_id),
            "assigned_agent_id": str(app.assigned_agent_id) if app.assigned_agent_id else None,
            "application_reference": app.application_reference,
            "application_status": app.application_status,
            "created_at": app.created_at.isoformat(),
            "updated_at": app.updated_at.isoformat(),
            "metrics": {
                "total_required": total_docs,
                "uploaded_count": uploaded_count,
                "approved_count": approved_count,
            }
        })

    return response


@router.patch("/applications/{app_id}/status", response_model=ApplicationResponse)
async def update_status(
    app_id: UUID,
    status_update: ApplicationStatusUpdate,
    current_user: TokenData = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Update application progression status."""
    stmt = select(Application).where(Application.id == app_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    prev_status = app.application_status
    app.application_status = status_update.new_status

    history = ApplicationHistory(
        application_id=app.id,
        changed_by=current_user.user_id,
        previous_status=prev_status,
        new_status=status_update.new_status,
        remarks=status_update.remarks or f"Status changed to {status_update.new_status} by agent",
    )
    db.add(history)

    await log_event(
        db, current_user.user_id, "APPLICATION_STATUS_UPDATED",
        "Application", str(app.id), OUTCOME_SUCCESS,
        {"from": prev_status, "to": status_update.new_status}
    )

    await db.commit()
    await db.refresh(app)
    return app


@router.post("/applications/{app_id}/assign")
async def assign_agent(
    app_id: UUID,
    current_user: TokenData = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Assign current agent to the application."""
    stmt = select(Application).where(Application.id == app_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.assigned_agent_id = current_user.user_id
    await db.commit()
    return {"message": "Application assigned successfully"}


@router.post("/applications/{app_id}/checklist")
async def assign_checklist(
    app_id: UUID,
    items: list[ChecklistAssignmentItem],
    current_user: TokenData = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Configure or add custom checklist items for an application."""
    stmt = select(Application).where(Application.id == app_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    for item in items:
        # Check if already exists
        chk_stmt = select(ApplicationChecklist).where(
            ApplicationChecklist.application_id == app_id,
            ApplicationChecklist.requirement_id == item.requirement_id,
        )
        existing = (await db.execute(chk_stmt)).scalar_one_or_none()

        if not existing:
            new_item = ApplicationChecklist(
                application_id=app_id,
                requirement_id=item.requirement_id,
                is_mandatory=item.is_mandatory,
                agent_notes=item.agent_notes,
                assigned_by=current_user.user_id,
            )
            db.add(new_item)

    await db.commit()
    return {"message": "Checklist updated"}


@router.post("/applications/{app_id}/notes")
async def add_internal_note(
    app_id: UUID,
    note: InternalNoteCreate,
    current_user: TokenData = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Add agent internal note (never exposed to customer)."""
    new_note = InternalNote(
        application_id=app_id,
        author_id=current_user.user_id,
        content=note.content,
    )
    db.add(new_note)
    await db.commit()
    return {"message": "Internal note recorded"}


@router.get("/applications/{app_id}/notes")
async def get_internal_notes(
    app_id: UUID,
    current_user: TokenData = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve agent internal notes for an application."""
    stmt = (
        select(InternalNote)
        .where(InternalNote.application_id == app_id)
        .order_by(desc(InternalNote.created_at))
    )
    res = await db.execute(stmt)
    notes = res.scalars().all()
    return [
        {
            "id": str(n.id),
            "author_id": str(n.author_id),
            "content": n.content,
            "created_at": n.created_at.isoformat(),
        }
        for n in notes
    ]


@router.post("/applications/{app_id}/notify")
async def send_customer_notification(
    app_id: UUID,
    notif: CustomerNotificationCreate,
    current_user: TokenData = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Send an in-app notification to the customer."""
    stmt = select(Application).where(Application.id == app_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    notification = Notification(
        recipient_id=app.customer_id,
        application_id=app.id,
        sent_by=current_user.user_id,
        title=notif.title,
        message=notif.message,
    )
    db.add(notification)
    await db.commit()
    return {"message": "Notification dispatched to customer"}
