"""app/security/file_validator.py — Secure file upload validation."""

from __future__ import annotations

import hashlib
import logging
import os
import re
import uuid
from datetime import datetime, timezone

try:
    import magic
except (ImportError, Exception):
    magic = None
from fastapi import HTTPException, UploadFile, status

from app.config import Settings

logger = logging.getLogger(__name__)

# Maximum bytes read to inspect magic bytes
_MAGIC_READ_BYTES = 16

# Pattern for safe filenames: alphanumeric, dashes, underscores, dots
_SAFE_FILENAME_RE = re.compile(r"[^\w\-.]", re.ASCII)

# Detect double extensions like ".pdf.exe", ".jpg.php" etc.
# A single dot-extension is fine; multiple chained extensions are suspicious.
_DOUBLE_EXT_RE = re.compile(r"\.[a-zA-Z0-9]{1,10}\.[a-zA-Z0-9]{1,10}$")


class FileValidator:
    """Validates uploaded files against a strict security policy."""

    MAGIC_SIGNATURES: dict[str, bytes] = {
        "pdf": b"%PDF",
        "jpg": b"\xff\xd8\xff",
        "jpeg": b"\xff\xd8\xff",
        "png": b"\x89PNG\r\n\x1a\n",
    }

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    async def validate_upload(
        self,
        file: UploadFile,
        content: bytes,
        settings: Settings,
    ) -> None:
        """Run all security checks on an uploaded file.

        Parameters
        ----------
        file:
            The FastAPI ``UploadFile`` object (used for metadata only after
            the caller has already read ``content``).
        content:
            The raw bytes already read from the upload (caller reads once,
            passes here — avoids double-read and streaming confusion).
        settings:
            Application settings for allowed types / max size.

        Raises
        ------
        HTTPException(400):
            On any validation failure.  Detail message is safe for the client.
        """
        self._check_file_size(content, settings.max_file_size_bytes)
        original_filename = self._sanitize_original_filename(file.filename or "upload")
        self._check_no_double_extension(original_filename)
        extension = self._extract_extension(original_filename)
        self._check_extension(extension, settings.allowed_extensions_list)
        self._check_mime_type_header(file.content_type, settings.allowed_mime_types_list)
        self._check_magic_bytes(content, extension)

    # ------------------------------------------------------------------
    # Individual checks (all raise HTTPException on failure)
    # ------------------------------------------------------------------

    def _check_file_size(self, content: bytes, max_bytes: int) -> None:
        size = len(content)
        if size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )
        if size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {max_bytes} bytes.",
            )

    def _check_no_double_extension(self, filename: str) -> None:
        if _DOUBLE_EXT_RE.search(filename):
            logger.warning("Rejected upload with double extension: %s", filename)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename contains multiple extensions which is not permitted.",
            )

    def _extract_extension(self, filename: str) -> str:
        _, dot_ext = os.path.splitext(filename)
        return dot_ext.lstrip(".").lower()

    def _check_extension(self, extension: str, allowed: list[str]) -> None:
        if extension not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '.{extension}' is not permitted.",
            )

    def _check_mime_type_header(
        self, content_type: str | None, allowed: list[str]
    ) -> None:
        if not content_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Content-Type for uploaded file.",
            )
        # Strip parameters like "; charset=utf-8"
        mime = content_type.split(";")[0].strip().lower()
        if mime not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MIME type '{mime}' is not permitted.",
            )

    def _check_magic_bytes(self, content: bytes, extension: str) -> None:
        """Validate magic bytes against the declared extension."""
        expected_signature = self.MAGIC_SIGNATURES.get(extension)
        if expected_signature is None:
            # Extension not in our magic map — reject to be safe.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File type cannot be verified.",
            )
        header = content[:_MAGIC_READ_BYTES]
        if not header.startswith(expected_signature):
            logger.warning(
                "Magic byte mismatch for extension '%s': got %r",
                extension,
                header[:8],
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content does not match its declared type.",
            )

        # Secondary check using python-magic (libmagic) for deeper inspection if available.
        if magic is not None:
            try:
                detected_mime: str = magic.from_buffer(content[:2048], mime=True)
            except Exception as exc:
                logger.error("libmagic detection failed: %s", exc)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File type could not be determined.",
                )

            # pdf extension should produce application/pdf, images produce image/*
            mime_map = {
                "pdf": "application/pdf",
                "jpg": "image/jpeg",
                "jpeg": "image/jpeg",
                "png": "image/png",
            }
            expected_mime = mime_map.get(extension)
            if expected_mime and detected_mime != expected_mime:
                logger.warning(
                    "libmagic MIME mismatch: extension=%s expected=%s got=%s",
                    extension,
                    expected_mime,
                    detected_mime,
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File content does not match its declared MIME type.",
                )

    # ------------------------------------------------------------------
    # Helper utilities
    # ------------------------------------------------------------------

    def generate_storage_key(self, extension: str) -> str:
        """Return a server-generated, non-guessable storage path.

        Format: ``uploads/{year}/{month}/{uuid4}.{ext}``
        The key is **never** derived from client-supplied data.
        """
        now = datetime.now(tz=timezone.utc)
        unique_id = uuid.uuid4()
        return f"uploads/{now.year}/{now.month:02d}/{unique_id}.{extension}"

    def compute_file_hash(self, content: bytes) -> str:
        """Return the SHA-256 hex digest of ``content``."""
        return hashlib.sha256(content).hexdigest()

    def sanitize_original_filename(self, filename: str) -> str:
        """Strip path components, collapse unsafe chars, enforce length limit."""
        return self._sanitize_original_filename(filename)

    def _sanitize_original_filename(self, filename: str) -> str:
        # Strip any directory components (path traversal protection).
        basename = os.path.basename(filename)
        # Replace unsafe characters with underscores.
        safe = _SAFE_FILENAME_RE.sub("_", basename)
        # Enforce maximum length.
        if len(safe) > 255:
            name, ext = os.path.splitext(safe)
            safe = name[: 255 - len(ext)] + ext
        if not safe or safe in (".", ".."):
            safe = "upload"
        return safe
