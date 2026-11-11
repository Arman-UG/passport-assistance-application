"""app/config.py — Application configuration via Pydantic Settings."""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    database_url: str  # asyncpg DSN  e.g. postgresql+asyncpg://...
    database_url_sync: str  # psycopg2 DSN e.g. postgresql+psycopg2://...

    # ------------------------------------------------------------------
    # Redis
    # ------------------------------------------------------------------
    redis_url: str  # e.g. redis://redis:6379/0

    # ------------------------------------------------------------------
    # JWT (RS256)
    # ------------------------------------------------------------------
    jwt_public_key_base64: str  # Base64-encoded PEM public key
    jwt_issuer: str             # e.g. https://auth.example.com
    jwt_audience: str           # e.g. passport-platform

    # ------------------------------------------------------------------
    # File uploads
    # ------------------------------------------------------------------
    upload_dir: str = "/data/uploads"
    max_file_size_bytes: int = 5_242_880  # 5 MiB

    # Comma-separated lists stored as plain strings so they can live in env vars.
    allowed_extensions: str = "pdf,jpg,jpeg,png"
    allowed_mime_types: str = "application/pdf,image/jpeg,image/png"

    # ------------------------------------------------------------------
    # App metadata
    # ------------------------------------------------------------------
    app_url: str = "http://localhost:3000"  # NEXT_PUBLIC_APP_URL for CORS
    environment: str = "production"         # development | production

    # ------------------------------------------------------------------
    # Rate limiting
    # ------------------------------------------------------------------
    rate_limit_default: str = "100/minute"

    # ------------------------------------------------------------------
    # Computed properties
    # ------------------------------------------------------------------
    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip().lower() for ext in self.allowed_extensions.split(",") if ext.strip()]

    @property
    def allowed_mime_types_list(self) -> List[str]:
        return [mt.strip().lower() for mt in self.allowed_mime_types.split(",") if mt.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith(("postgresql+asyncpg://", "postgresql://asyncpg")):
            # Accept postgresql+asyncpg:// scheme
            if "asyncpg" not in v:
                raise ValueError(
                    "database_url must use the asyncpg driver "
                    "(e.g. postgresql+asyncpg://...)"
                )
        return v

    @field_validator("max_file_size_bytes")
    @classmethod
    def validate_max_file_size(cls, v: int) -> int:
        if v <= 0 or v > 50 * 1024 * 1024:  # hard upper cap: 50 MiB
            raise ValueError("max_file_size_bytes must be between 1 and 52428800")
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()  # type: ignore[call-arg]
