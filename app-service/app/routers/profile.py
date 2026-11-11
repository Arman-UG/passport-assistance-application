"""app/routers/profile.py — Customer notifications and profile endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.application import Notification
from app.security.jwt_verifier import TokenData

router = APIRouter(prefix="/api/profile", tags=["Profile & Notifications"])


@router.get("/me")
async def get_my_profile(current_user: TokenData = Depends(get_current_user)):
    return {
        "user_id": str(current_user.user_id),
        "role": current_user.role,
        "session_id": str(current_user.session_id),
    }


@router.get("/notifications")
async def get_notifications(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Notification)
        .where(Notification.recipient_id == current_user.user_id)
        .order_by(desc(Notification.created_at))
        .limit(50)
    )
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    return [
        {
            "id": str(n.id),
            "application_id": str(n.application_id) if n.application_id else None,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Notification).where(
        Notification.id == notif_id,
        Notification.recipient_id == current_user.user_id,
    )
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Notification marked as read"}
