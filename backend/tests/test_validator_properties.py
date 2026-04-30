# Feature: pdf-merger-image-converter, Property 2: MIME validation rejects non-PDF content
# Feature: pdf-merger-image-converter, Property 3: Per-file size limit is enforced before processing
# Feature: pdf-merger-image-converter, Property 4: Combined size limit is enforced before processing
# Feature: pdf-merger-image-converter, Property 6: Page count limit is enforced before processing
"""
Property-based tests for validator.py.

Uses Hypothesis to verify universal correctness properties across a wide
range of generated inputs.
"""

import io
import sys
import os
from unittest.mock import MagicMock, patch

import pypdf
import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import (
    MAX_COMBINED_SIZE_BYTES,
    MAX_FILE_SIZE_BYTES,
    MAX_PAGE_COUNT,
)
from validator import (
    validate_combined_size,
    validate_file_size,
    validate_mime_type,
    validate_page_count,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_pdf_bytes(num_pages: int) -> bytes:
    writer = pypdf.PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def make_file_storage(size_bytes: int) -> MagicMock:
    mock = MagicMock()
    mock.filename = "test.pdf"
    mock.content_length = size_bytes
    mock.stream = io.BytesIO(b"\x00" * min(size_bytes, 1024))
    return mock


# ---------------------------------------------------------------------------
# Property 2: MIME validation rejects non-PDF content
# ---------------------------------------------------------------------------


# Common non-PDF byte patterns to test against
NON_PDF_HEADERS = [
    b"\x89PNG\r\n\x1a\n",          # PNG
    b"GIF89a",                      # GIF
    b"\xff\xd8\xff",                # JPEG
    b"PK\x03\x04",                  # ZIP
    b"MZ",                          # PE executable
    b"<html>",                      # HTML
    b"This is plain text content",  # Plain text
    b"\x00\x01\x00\x00",           # Binary blob
]


@pytest.mark.parametrize("header", NON_PDF_HEADERS)
def test_mime_validation_rejects_non_pdf_headers(header, app_ctx):
    """
    Property 2: MIME validation rejects non-PDF content.
    Files with known non-PDF magic bytes must be rejected.
    """
    content = header + b"\x00" * 2048
    with pytest.raises(Exception):
        validate_mime_type(content, "file.pdf")


@given(st.binary(min_size=2048, max_size=4096))
@settings(max_examples=100)
def test_mime_validation_rejects_random_bytes(file_bytes: bytes, app_ctx):
    """
    Property 2: Random byte streams that don't start with the PDF magic bytes
    (%PDF-) should be rejected.
    """
    # Skip if the random bytes happen to start with a valid PDF header
    assume(not file_bytes.startswith(b"%PDF-"))
    with pytest.raises(Exception):
        validate_mime_type(file_bytes, "random.pdf")


# ---------------------------------------------------------------------------
# Property 3: Per-file size limit is enforced before processing
# ---------------------------------------------------------------------------


@given(st.integers(min_value=MAX_FILE_SIZE_BYTES + 1, max_value=MAX_FILE_SIZE_BYTES * 2))
@settings(max_examples=100)
def test_per_file_size_limit_enforced(size: int, app_ctx):
    """
    Property 3: Per-file size limit is enforced before processing.
    Any file exceeding MAX_FILE_SIZE_BYTES must be rejected with 400.
    The Processor must never be invoked.
    """
    f = make_file_storage(size)
    with patch("processor.merge_pdfs") as mock_merge, \
         patch("processor.convert_to_images") as mock_convert:
        with pytest.raises(Exception):
            validate_file_size(f, MAX_FILE_SIZE_BYTES)
        mock_merge.assert_not_called()
        mock_convert.assert_not_called()


# ---------------------------------------------------------------------------
# Property 4: Combined size limit is enforced before processing
# ---------------------------------------------------------------------------


@given(
    st.lists(
        st.integers(min_value=1, max_value=MAX_COMBINED_SIZE_BYTES // 2),
        min_size=2,
        max_size=5,
    )
)
@settings(max_examples=100)
def test_combined_size_limit_enforced(sizes: list, app_ctx):
    """
    Property 4: Combined size limit is enforced before processing.
    When the sum of all file sizes exceeds MAX_COMBINED_SIZE_BYTES, a 400
    must be returned and the Processor must never be invoked.
    """
    # Only test cases where the combined size actually exceeds the limit
    assume(sum(sizes) > MAX_COMBINED_SIZE_BYTES)

    files = [make_file_storage(s) for s in sizes]
    with patch("processor.merge_pdfs") as mock_merge, \
         patch("processor.convert_to_images") as mock_convert:
        with pytest.raises(Exception):
            validate_combined_size(files, MAX_COMBINED_SIZE_BYTES)
        mock_merge.assert_not_called()
        mock_convert.assert_not_called()


# ---------------------------------------------------------------------------
# Property 6: Page count limit is enforced before processing
# ---------------------------------------------------------------------------


@given(st.integers(min_value=MAX_PAGE_COUNT + 1, max_value=MAX_PAGE_COUNT + 20))
@settings(max_examples=50)  # PDF generation is slow; 50 is sufficient
def test_page_count_limit_enforced(num_pages: int, app_ctx):
    """
    Property 6: Page count limit is enforced before processing.
    Any PDF with more than MAX_PAGE_COUNT pages must be rejected with 400
    before any image conversion occurs.
    """
    pdf_bytes = make_pdf_bytes(num_pages)
    with patch("processor.convert_to_images") as mock_convert:
        with pytest.raises(Exception):
            validate_page_count(pdf_bytes, MAX_PAGE_COUNT)
        mock_convert.assert_not_called()
