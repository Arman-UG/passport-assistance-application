"""tests/test_file_validator.py — Security tests for file upload validation."""

import pytest
from fastapi import HTTPException, UploadFile
from app.config import Settings
from app.security.file_validator import FileValidator
import io

@pytest.fixture
def validator():
    return FileValidator()

@pytest.fixture
def settings():
    return Settings(
        database_url="postgresql+asyncpg://test:test@localhost/test",
        database_url_sync="postgresql://test:test@localhost/test",
        redis_url="redis://localhost:6379/0",
        jwt_public_key_base64="dGVzdA==",
        jwt_issuer="passport-platform-auth",
        jwt_audience="passport-platform",
        upload_dir="/tmp/uploads",
        max_file_size_bytes=5242880,
        allowed_extensions="pdf,jpg,jpeg,png",
        allowed_mime_types="application/pdf,image/jpeg,image/png",
    )

@pytest.mark.asyncio
async def test_valid_pdf_upload(validator, settings):
    pdf_content = b"%PDF-1.4\n%test content\n%%EOF"
    upload = UploadFile(filename="passport_form.pdf", file=io.BytesIO(pdf_content), headers={"content-type": "application/pdf"})
    
    # Should not raise exception
    await validator.validate_upload(upload, pdf_content, settings)

@pytest.mark.asyncio
async def test_valid_jpg_upload(validator, settings):
    jpg_content = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb"
    upload = UploadFile(filename="photo.jpg", file=io.BytesIO(jpg_content), headers={"content-type": "image/jpeg"})
    
    await validator.validate_upload(upload, jpg_content, settings)

@pytest.mark.asyncio
async def test_disallowed_extension_rejected(validator, settings):
    content = b"#!/bin/bash\necho hello"
    upload = UploadFile(filename="script.sh", file=io.BytesIO(content), headers={"content-type": "application/x-sh"})
    
    with pytest.raises(HTTPException) as exc_info:
        await validator.validate_upload(upload, content, settings)
    assert exc_info.value.status_code == 400
    assert "extension" in exc_info.value.detail.lower()

@pytest.mark.asyncio
async def test_double_extension_rejected(validator, settings):
    content = b"%PDF-1.4\nMalicious"
    upload = UploadFile(filename="passport.pdf.exe", file=io.BytesIO(content), headers={"content-type": "application/pdf"})
    
    with pytest.raises(HTTPException) as exc_info:
        await validator.validate_upload(upload, content, settings)
    assert exc_info.value.status_code == 400
    assert "multiple extensions" in exc_info.value.detail.lower()

@pytest.mark.asyncio
async def test_magic_byte_mismatch_rejected(validator, settings):
    # File named .pdf with text content
    content = b"Not a real PDF file header"
    upload = UploadFile(filename="fake.pdf", file=io.BytesIO(content), headers={"content-type": "application/pdf"})
    
    with pytest.raises(HTTPException) as exc_info:
        await validator.validate_upload(upload, content, settings)
    assert exc_info.value.status_code == 400
    assert "declared type" in exc_info.value.detail.lower()

@pytest.mark.asyncio
async def test_oversized_file_rejected(validator, settings):
    # Limit is 5MB
    oversized = b"%PDF-1.4\n" + (b"0" * (5242880 + 100))
    upload = UploadFile(filename="huge.pdf", file=io.BytesIO(oversized), headers={"content-type": "application/pdf"})
    
    with pytest.raises(HTTPException) as exc_info:
        await validator.validate_upload(upload, oversized, settings)
    assert exc_info.value.status_code == 400
    assert "exceeds" in exc_info.value.detail.lower()

@pytest.mark.asyncio
async def test_path_traversal_sanitized(validator):
    dangerous_filename = "../../../../../etc/shadow"
    safe = validator.sanitize_original_filename(dangerous_filename)
    assert "/" not in safe
    assert "\\" not in safe
    assert ".." not in safe
    assert safe == "shadow"
