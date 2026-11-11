"""app/services/audit_service.py — Centralised audit logging service."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AppAuditLog

logger = logging.getLogger(__name__)

# Allowed outcome values
OUTCOME_SUCCESS = "SUCCESS"
OUTCOME_FAILURE = "FAILURE"
OUTCOME_BLOCKED = "BLOCKED"


async def log_event(
    db: AsyncSession,
    actor_id: UUID,
    action: str,
    resource_type: str,
    resource_id: str,
    outcome: str,
    safe_metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Append a single audit event to ``app.audit_logs``.

    Security contract
    -----------------
    The ``safe_metadata`` dict **MUST NOT** contain any of the following:
    - File contents or binary data
    - JWT tokens or session identifiers
    - Passwords, secrets, or private keys
    - Personal health / financial data

    Only pass scalar identifiers, status strings, and counts.

    Parameters
    ----------
    db:          AsyncSession used for the insert.
    actor_id:    UUID of the user who performed the action.
    action:      Short, upper-cased action identifier (e.g. ``DOCUMENT_UPLOAD``).
    resource_type: ORM model class name or logical resource label.
    resource_id: String representation of the resource primary key.
    outcome:     One of ``SUCCESS``, ``FAILURE``, ``BLOCKED``.
    safe_metadata: Optional dict of non-sensitive contextual metadata.
    """
    if outcome not in (OUTCOME_SUCCESS, OUTCOME_FAILURE, OUTCOME_BLOCKED):
        logger.error("Invalid audit outcome '%s' — defaulting to FAILURE", outcome)
        outcome = OUTCOME_FAILURE

    entry = AppAuditLog(
        actor_id=actor_id,
        action=action.upper(),
        resource_type=resource_type,
        resource_id=resource_id,
        outcome=outcome,
        safe_metadata=safe_metadata,
    )
    db.add(entry)
    # We deliberately do NOT commit here — the caller's transaction boundary
    # ensures the audit log is part of the same atomic operation.
    try:
        await db.flush()
    except Exception as exc:
        # Audit log failure must not propagate and break the business operation.
        logger.error(
            "Failed to flush audit log entry [action=%s resource=%s/%s]: %s",
            action,
            resource_type,
            resource_id,
            exc,
        )
