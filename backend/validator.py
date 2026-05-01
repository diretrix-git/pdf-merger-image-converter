"""
Input validation for uploaded PDF files.

All functions raise a Flask abort(400) with a JSON error body on failure.
Validation is designed to run cheapest-first:
  1. Files present
  2. Minimum file count (merge only)
  3. File count limit (merge only)
  4. Per-file size (no content read yet)
  5. Combined size
  6. MIME type (reads first 2048 bytes)
  7. Magic bytes check (%PDF-)
  8. Encryption check (pikepdf)
  9. Uncompressed size / bomb protection (pikepdf)
  10. Page count (full PDF parse — convert only)
"""

import io
from typing import Union

import magic
import pypdf
from flask import abort, jsonify
from werkzeug.datastructures import FileStorage

from config import ALLOWED_MIME_TYPE


def _abort_400(message: str):
    """Return a JSON 400 response and abort the request."""
    response = jsonify({"error": message})
    response.status_code = 400
    abort(response)


def validate_files_present(files: list) -> None:
    """
    Abort with 400 if the files list is empty or contains only None values.

    Args:
        files: List of FileStorage objects (or None entries).
    """
    if not files or all(f is None for f in files):
        _abort_400("No files provided.")


def validate_minimum_files(files: list, minimum: int) -> None:
    """
    Abort with 400 if fewer than `minimum` files are provided.

    Args:
        files:   List of FileStorage objects.
        minimum: Minimum required count.
    """
    if len(files) < minimum:
        _abort_400(
            f"At least {minimum} PDF files are required. "
            f"Received {len(files)}."
        )


def validate_file_count(files: list, max_count: int) -> None:
    """
    Abort with 400 if more than max_count files are provided.

    Args:
        files:     List of FileStorage objects.
        max_count: Maximum allowed file count.
    """
    if len(files) > max_count:
        _abort_400(
            f"Maximum {max_count} files allowed per request. "
            f"Received {len(files)}."
        )


def validate_file_size(file: FileStorage, max_bytes: int) -> None:
    """
    Abort with 400 if the file's reported size exceeds max_bytes.

    Uses content_length when available; falls back to seeking to the end of
    the stream to measure actual size without consuming the stream.

    Args:
        file:      A Werkzeug FileStorage object.
        max_bytes: Maximum allowed size in bytes.
    """
    # Try the Content-Length header first (fast path)
    size = file.content_length
    if size and size > max_bytes:
        name = file.filename or "upload"
        _abort_400(
            f"File '{name}' exceeds the "
            f"{max_bytes // (1024 * 1024)} MB limit."
        )

    # Fall back to measuring the stream (handles chunked transfers)
    stream = file.stream
    stream.seek(0, 2)  # Seek to end
    actual_size = stream.tell()
    stream.seek(0)     # Reset for later reads

    if actual_size > max_bytes:
        name = file.filename or "upload"
        _abort_400(
            f"File '{name}' exceeds the "
            f"{max_bytes // (1024 * 1024)} MB limit."
        )


def validate_combined_size(files: list[FileStorage], max_bytes: int) -> None:
    """
    Abort with 400 if the combined size of all files exceeds max_bytes.

    Args:
        files:     List of FileStorage objects.
        max_bytes: Maximum allowed combined size in bytes.
    """
    total = 0
    for f in files:
        size = f.content_length or 0
        if size == 0:
            # Measure stream without consuming it
            f.stream.seek(0, 2)
            size = f.stream.tell()
            f.stream.seek(0)
        total += size

    if total > max_bytes:
        _abort_400(
            f"Combined file size exceeds the "
            f"{max_bytes // (1024 * 1024)} MB limit."
        )


def validate_mime_type(file_bytes: bytes, filename: str) -> None:
    """
    Abort with 400 if the file content is not application/pdf.

    Inspects the actual file bytes using python-magic rather than trusting
    the file extension or the browser-supplied Content-Type header.

    Args:
        file_bytes: Raw bytes of the uploaded file (at least 2048 bytes
                    is sufficient for reliable detection).
        filename:   Sanitized filename used in the error message.
    """
    # Read only the first 2048 bytes for MIME detection
    sample = file_bytes[:2048]
    detected = magic.from_buffer(sample, mime=True)

    if detected != ALLOWED_MIME_TYPE:
        _abort_400(f"File '{filename}' is not a valid PDF.")


def validate_magic_bytes(file_bytes: bytes, filename: str) -> None:
    """
    Check actual PDF magic bytes (%PDF-), not just MIME type.

    This provides a fast, cheap secondary check that the file starts with
    the canonical PDF header before any deeper parsing occurs.

    Args:
        file_bytes: Raw bytes of the uploaded file.
        filename:   Sanitized filename used in the error message.
    """
    if not file_bytes.startswith(b"%PDF-"):
        _abort_400(f"File '{filename}' is not a valid PDF (invalid header).")


def validate_not_encrypted(pdf_bytes: bytes, filename: str) -> None:
    """
    Abort with 400 if the PDF is password-protected/encrypted.

    Uses pikepdf to attempt opening the file. A PasswordError means the
    file requires a password and cannot be processed.

    Args:
        pdf_bytes: Raw bytes of the PDF file.
        filename:  Sanitized filename used in the error message.
    """
    import pikepdf
    try:
        with pikepdf.open(io.BytesIO(pdf_bytes)) as pdf:
            pass  # Opens fine — not encrypted
    except pikepdf.PasswordError:
        _abort_400(
            f"File '{filename}' is password-protected. "
            "Please remove the password before uploading."
        )
    except Exception:
        _abort_400(f"File '{filename}' could not be read. It may be corrupted.")


def validate_uncompressed_size(pdf_bytes: bytes, filename: str, max_bytes: int) -> None:
    """
    PDF bomb protection — estimate uncompressed size by reading all stream objects.

    Aborts with 400 if the estimated uncompressed size exceeds max_bytes.
    This prevents decompression bombs (tiny compressed PDFs that expand to
    gigabytes of data) from exhausting server memory.

    All processing is in-memory (io.BytesIO) — no files are written to disk.

    Args:
        pdf_bytes: Raw bytes of the PDF file.
        filename:  Sanitized filename used in the error message.
        max_bytes: Maximum allowed uncompressed size in bytes.
    """
    import pikepdf
    try:
        total = 0
        with pikepdf.open(io.BytesIO(pdf_bytes)) as pdf:
            for obj in pdf.objects:
                try:
                    if isinstance(obj, pikepdf.Stream):
                        total += len(obj.read_bytes())
                    elif hasattr(obj, 'read_bytes'):
                        total += len(obj.read_bytes())
                except Exception:
                    pass
                if total > max_bytes:
                    _abort_400(
                        f"File '{filename}' appears to be a compressed bomb "
                        f"(uncompressed size exceeds {max_bytes // (1024 * 1024)} MB)."
                    )
    except Exception as e:
        # If we already aborted, re-raise the HTTPException
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            raise
        # Otherwise treat as corrupted
        _abort_400(f"File '{filename}' could not be read. It may be corrupted.")


def validate_page_count(pdf_bytes: bytes, max_pages: int) -> None:
    """
    Abort with 400 if the PDF contains more than max_pages pages.

    Args:
        pdf_bytes: Raw bytes of the PDF file.
        max_pages: Maximum allowed page count.
    """
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        page_count = len(reader.pages)
    except Exception:
        _abort_400("Could not read the PDF file. It may be corrupted.")

    if page_count > max_pages:
        _abort_400(
            f"PDF exceeds the {max_pages}-page limit "
            f"({page_count} pages)."
        )
