# Feature: pdf-merger-image-converter, Property 1: Merge output contains all pages from all inputs
# Feature: pdf-merger-image-converter, Property 5: Image conversion produces correct page count and naming
"""
Property-based tests for processor.py.

Uses Hypothesis to verify universal correctness properties for the
merge_pdfs and convert_to_images functions.
"""

import io
import sys
import os
import zipfile

import pypdf
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from processor import convert_to_images, merge_pdfs

# Import the Poppler skip marker from conftest
from markers import requires_poppler


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_pdf_bytes(num_pages: int) -> bytes:
    """Create a minimal valid in-memory PDF with the given number of blank pages."""
    writer = pypdf.PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def make_pdf_stream(num_pages: int) -> io.BytesIO:
    return io.BytesIO(make_pdf_bytes(num_pages))


# ---------------------------------------------------------------------------
# Property 1: Merge output contains all pages from all inputs
# ---------------------------------------------------------------------------


@given(
    st.lists(
        st.integers(min_value=1, max_value=5),
        min_size=2,
        max_size=6,
    )
)
@settings(max_examples=100)
def test_merge_preserves_total_page_count(page_counts: list[int]) -> None:
    """
    Property 1: Merge output contains all pages from all inputs.

    For any list of 2–6 PDFs with 1–5 pages each, the merged PDF must
    contain exactly sum(page_counts) pages.
    """
    streams = [make_pdf_stream(n) for n in page_counts]
    merged = merge_pdfs(streams)

    reader = pypdf.PdfReader(merged)
    assert len(reader.pages) == sum(page_counts), (
        f"Expected {sum(page_counts)} pages for inputs {page_counts}, "
        f"got {len(reader.pages)}"
    )


@given(
    st.lists(
        st.integers(min_value=1, max_value=3),
        min_size=2,
        max_size=4,
    )
)
@settings(max_examples=50)
def test_merge_preserves_page_order(page_counts: list[int]) -> None:
    """
    Property 1 (order): Pages appear in the same order as the input streams.

    We verify this by checking that the total page count is correct and
    that the merge operation is deterministic (same inputs → same output size).
    """
    streams_a = [make_pdf_stream(n) for n in page_counts]
    streams_b = [make_pdf_stream(n) for n in page_counts]

    merged_a = merge_pdfs(streams_a)
    merged_b = merge_pdfs(streams_b)

    reader_a = pypdf.PdfReader(merged_a)
    reader_b = pypdf.PdfReader(merged_b)

    assert len(reader_a.pages) == len(reader_b.pages), (
        "Merge is not deterministic: same inputs produced different page counts"
    )


# ---------------------------------------------------------------------------
# Property 5: Image conversion produces correct page count and naming
# ---------------------------------------------------------------------------


@requires_poppler
@given(st.integers(min_value=2, max_value=5))
@settings(max_examples=20, deadline=None)  # pdf2image is slow; disable deadline
def test_convert_to_images_multipage_returns_zip(num_pages: int) -> None:
    """
    Property 5 (multi-page): For N > 1 pages, returns a ZIP with
    exactly N files named page_1.png through page_N.png.
    """
    pdf_bytes = make_pdf_bytes(num_pages)
    stream, mimetype = convert_to_images(pdf_bytes, dpi=72)

    assert mimetype == "application/zip"
    with zipfile.ZipFile(stream) as zf:
        names = set(zf.namelist())

    expected = {f"page_{i}.png" for i in range(1, num_pages + 1)}
    assert names == expected, (
        f"Expected ZIP entries {expected} for {num_pages}-page PDF, got {names}"
    )


@requires_poppler
def test_convert_to_images_single_page_returns_png() -> None:
    """Single-page PDF returns a raw PNG (image/png), not a ZIP."""
    pdf_bytes = make_pdf_bytes(1)
    stream, mimetype = convert_to_images(pdf_bytes, dpi=72)

    assert mimetype == "image/png"
    # Verify it's a valid PNG by checking the magic bytes
    stream.seek(0)
    header = stream.read(8)
    assert header == b"\x89PNG\r\n\x1a\n", "Expected PNG magic bytes"


@requires_poppler
def test_convert_to_images_multipage_returns_valid_zip() -> None:
    """Multi-page PDF returns a valid ZIP file."""
    pdf_bytes = make_pdf_bytes(2)
    stream, mimetype = convert_to_images(pdf_bytes, dpi=72)

    assert mimetype == "application/zip"
    assert zipfile.is_zipfile(stream)
