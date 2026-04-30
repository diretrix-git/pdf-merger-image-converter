"""
Example-based unit tests for validator.py.

Tests cover all validation functions with concrete inputs and edge cases.
"""

import io
import sys
import os
from unittest.mock import MagicMock

import pypdf
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import MAX_FILE_SIZE_BYTES, MAX_COMBINED_SIZE_BYTES, MAX_PAGE_COUNT
from validator import (
    validate_combined_size,
    validate_file_size,
    validate_files_present,
    validate_mime_type,
    validate_minimum_files,
    validate_page_count,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_pdf_bytes(num_pages: int = 1) -> bytes:
    """Create a minimal valid in-memory PDF with the given number of pages."""
    writer = pypdf.PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def make_file_storage(size_bytes: int, filename: str = "test.pdf") -> MagicMock:
    """Create a mock FileStorage with a given content_length."""
    mock = MagicMock()
    mock.filename = filename
    mock.content_length = size_bytes
    mock.stream = io.BytesIO(b"\x00" * size_bytes)
    return mock


# ---------------------------------------------------------------------------
# validate_files_present
# ---------------------------------------------------------------------------


def test_validate_files_present_raises_on_empty_list(app_ctx):
    with pytest.raises(Exception):  # abort raises werkzeug HTTPException
        validate_files_present([])


def test_validate_files_present_raises_on_none_entries(app_ctx):
    with pytest.raises(Exception):
        validate_files_present([None, None])


def test_validate_files_present_passes_with_one_file(app_ctx):
    mock = MagicMock()
    validate_files_present([mock])  # Should not raise


# ---------------------------------------------------------------------------
# validate_minimum_files
# ---------------------------------------------------------------------------


def test_validate_minimum_files_raises_on_single_file(app_ctx):
    with pytest.raises(Exception):
        validate_minimum_files([MagicMock()], minimum=2)


def test_validate_minimum_files_passes_with_two_files(app_ctx):
    validate_minimum_files([MagicMock(), MagicMock()], minimum=2)


def test_validate_minimum_files_passes_with_more_than_minimum(app_ctx):
    validate_minimum_files([MagicMock()] * 5, minimum=2)


# ---------------------------------------------------------------------------
# validate_file_size
# ---------------------------------------------------------------------------


def test_validate_file_size_passes_at_exact_limit(app_ctx):
    f = make_file_storage(MAX_FILE_SIZE_BYTES)
    validate_file_size(f, MAX_FILE_SIZE_BYTES)  # Should not raise


def test_validate_file_size_raises_one_byte_over_limit(app_ctx):
    f = make_file_storage(MAX_FILE_SIZE_BYTES + 1)
    with pytest.raises(Exception):
        validate_file_size(f, MAX_FILE_SIZE_BYTES)


def test_validate_file_size_passes_small_file(app_ctx):
    f = make_file_storage(1024)
    validate_file_size(f, MAX_FILE_SIZE_BYTES)


# ---------------------------------------------------------------------------
# validate_combined_size
# ---------------------------------------------------------------------------


def test_validate_combined_size_passes_at_exact_limit(app_ctx):
    # Two files that together equal exactly the combined limit
    half = MAX_COMBINED_SIZE_BYTES // 2
    files = [make_file_storage(half), make_file_storage(half)]
    validate_combined_size(files, MAX_COMBINED_SIZE_BYTES)


def test_validate_combined_size_raises_one_byte_over(app_ctx):
    half = MAX_COMBINED_SIZE_BYTES // 2
    files = [make_file_storage(half), make_file_storage(half + 1)]
    with pytest.raises(Exception):
        validate_combined_size(files, MAX_COMBINED_SIZE_BYTES)


# ---------------------------------------------------------------------------
# validate_mime_type
# ---------------------------------------------------------------------------


def test_validate_mime_type_passes_for_valid_pdf(app_ctx):
    pdf_bytes = make_pdf_bytes(1)
    validate_mime_type(pdf_bytes, "test.pdf")  # Should not raise


def test_validate_mime_type_raises_for_plain_text(app_ctx):
    with pytest.raises(Exception):
        validate_mime_type(b"This is just plain text, not a PDF.", "fake.pdf")


def test_validate_mime_type_raises_for_png_content(app_ctx):
    # PNG magic bytes
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    with pytest.raises(Exception):
        validate_mime_type(png_header, "image.png")


def test_validate_mime_type_raises_for_pdf_extension_with_non_pdf_content(app_ctx):
    """
    A file named .pdf but containing non-PDF bytes must be rejected.
    This is the key security check — we trust content, not extension.
    """
    fake_pdf_bytes = b"MZ\x90\x00" + b"\x00" * 200  # PE executable header
    with pytest.raises(Exception):
        validate_mime_type(fake_pdf_bytes, "malicious.pdf")


# ---------------------------------------------------------------------------
# validate_page_count
# ---------------------------------------------------------------------------


def test_validate_page_count_passes_at_exact_limit(app_ctx):
    pdf_bytes = make_pdf_bytes(MAX_PAGE_COUNT)
    validate_page_count(pdf_bytes, MAX_PAGE_COUNT)  # Should not raise


def test_validate_page_count_raises_one_page_over_limit(app_ctx):
    pdf_bytes = make_pdf_bytes(MAX_PAGE_COUNT + 1)
    with pytest.raises(Exception):
        validate_page_count(pdf_bytes, MAX_PAGE_COUNT)


def test_validate_page_count_passes_single_page(app_ctx):
    pdf_bytes = make_pdf_bytes(1)
    validate_page_count(pdf_bytes, MAX_PAGE_COUNT)


def test_validate_page_count_raises_for_corrupted_pdf(app_ctx):
    with pytest.raises(Exception):
        validate_page_count(b"not a pdf at all", MAX_PAGE_COUNT)
