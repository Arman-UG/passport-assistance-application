"""app/security/jwt_verifier.py — RS256 JWT verification using python-jose."""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from jose import ExpiredSignatureError, JWTError, jwt
from jose.exceptions import JWTClaimsError

from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class TokenData:
    """Decoded and validated JWT claims used as the current-user context."""

    user_id: UUID
    role: str
    session_id: UUID


class JWTVerifier:
    """Stateless RS256 JWT verifier.  One instance is shared per process."""

    _ALGORITHM = "RS256"

    def __init__(self) -> None:
        settings = get_settings()
        try:
            pem_bytes: bytes = base64.b64decode(settings.jwt_public_key_base64)
            # python-jose accepts PEM strings directly.
            self._public_key: str = pem_bytes.decode("utf-8")
        except Exception as exc:
            raise RuntimeError(
                "Failed to decode jwt_public_key_base64. "
                "Ensure the env var contains a valid base64-encoded PEM public key."
            ) from exc

        self._issuer: str = settings.jwt_issuer
        self._audience: str = settings.jwt_audience

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def verify_token(self, token: str) -> dict:
        """Verify an RS256 JWT and return decoded claims.

        Checks performed by python-jose automatically:
        - Signature (RS256 with the configured public key)
        - ``exp`` claim (not expired)
        - ``iss`` claim (must match settings.jwt_issuer)
        - ``aud`` claim (must match settings.jwt_audience)

        Raises:
            HTTPException(401): on any verification failure.
        """
        try:
            claims: dict = jwt.decode(
                token,
                self._public_key,
                algorithms=[self._ALGORITHM],
                issuer=self._issuer,
                audience=self._audience,
                options={"require": ["exp", "iss", "aud", "sub"]},
            )
        except ExpiredSignatureError:
            logger.warning("JWT verification failed: token expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except JWTClaimsError as exc:
            logger.warning("JWT verification failed: invalid claims — %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except JWTError as exc:
            logger.warning("JWT verification failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return claims

    def get_current_user(self, token: str) -> TokenData:
        """Verify token and extract typed TokenData from claims.

        Expected custom claims inside the JWT payload:
        - ``sub``        → user UUID string
        - ``role``       → one of CUSTOMER / AGENT / ADMIN
        - ``session_id`` → session UUID string

        Raises:
            HTTPException(401): if token is invalid or required claims are missing.
        """
        claims = self.verify_token(token)

        try:
            user_id = UUID(claims["sub"])
            role: str = str(claims["role"]).upper()
            session_id = UUID(claims["session_id"])
        except (KeyError, ValueError, TypeError) as exc:
            logger.warning("JWT claims extraction failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is missing required claims.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return TokenData(user_id=user_id, role=role, session_id=session_id)


# ---------------------------------------------------------------------------
# Module-level singleton — imported by dependencies.py
# ---------------------------------------------------------------------------
_verifier: JWTVerifier | None = None


def get_jwt_verifier() -> JWTVerifier:
    """Return the shared JWTVerifier singleton (lazy-initialised)."""
    global _verifier
    if _verifier is None:
        _verifier = JWTVerifier()
    return _verifier
