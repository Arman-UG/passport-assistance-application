"""app/routers/__init__.py — API route exports."""

from app.routers.agent import router as agent_router
from app.routers.applications import router as applications_router
from app.routers.documents import router as documents_router
from app.routers.profile import router as profile_router

__all__ = [
    "applications_router",
    "documents_router",
    "agent_router",
    "profile_router",
]
