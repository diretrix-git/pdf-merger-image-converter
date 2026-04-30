"""
Input validation for uploaded PDF files.

All functions raise a Flask abort(400) with a JSON error body on failure.
Validation is designed to run cheapest-first:
  1. Files present
  2. Minimum file count (merge only)
  3. Per-file size (no content read yet)
  4. Combined size
  5. MIME type (reads first 2048 bytes)
  6. Page count (full PDF parse — convert only)
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
