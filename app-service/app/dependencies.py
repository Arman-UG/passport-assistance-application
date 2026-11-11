"""app/dependencies.py — FastAPI dependency injection helpers."""

from __future__ import annotations

import logging
from typing import Callable

from fastapi import Depends, HTTPException, Request, status

from app.security.jwt_verifier import TokenData, get_jwt_verifier

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Token extraction
# ---------------------------------------------------------------------------

async def get_token_from_cookie_or_header(request: Request) -> str:
    """Extract the Bearer token from the Authorization header.

    Expected format: ``Authorization: Bearer <token>``

    Raises:
        HTTPException(401): if the header is absent or malformed.
    """
    authorization: str | None = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must use the Bearer scheme.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token.strip()


# ---------------------------------------------------------------------------
# Current-user resolution
# ---------------------------------------------------------------------------

async def get_current_user(
    token: str = Depends(get_token_from_cookie_or_header),
) -> TokenData:
    """Verify the JWT and return typed TokenData.

    Raises:
        HTTPException(401): if the token is invalid or expired.
    """
    verifier = get_jwt_verifier()
    return verifier.get_current_user(token)


# ---------------------------------------------------------------------------
# Role-based access control
# ---------------------------------------------------------------------------

def require_role(*roles: str) -> Callable:
    """Return a FastAPI dependency that enforces one of the given roles.

    Usage::

        @router.get("/admin-only")
        async def admin_endpoint(user: TokenData = Depends(require_role("ADMIN"))):
            ...
    """
    allowed: frozenset[str] = frozenset(r.upper() for r in roles)

    async def _check_role(
        current_user: TokenData = Depends(get_current_user),
    ) -> TokenData:
        if current_user.role not in allowed:
            logger.warning(
                "Access denied: user=%s role=%s required_one_of=%s",
                current_user.user_id,
                current_user.role,
                allowed,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return _check_role


# ---------------------------------------------------------------------------
# Convenience shorthands
# ---------------------------------------------------------------------------

#: Dependency that resolves to TokenData for CUSTOMER role only.
get_current_customer = require_role("CUSTOMER")

#: Dependency that resolves to TokenData for AGENT or ADMIN roles.
get_current_agent = require_role("AGENT", "ADMIN")

#: Dependency that resolves to TokenData for ADMIN role only.
get_current_admin = require_role("ADMIN")
