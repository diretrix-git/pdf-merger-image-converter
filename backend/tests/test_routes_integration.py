"""
Integration tests for the Flask API routes.

Tests use Flask's built-in test client to exercise the full request/response
cycle including validation, processing, and response headers.
"""

import io
import sys
import os
import zipfile

import pypdf
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import app as flask_app
from markers import requires_poppler


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_pdf_bytes(num_pages: int = 1) -> bytes:
    writer = pypdf.PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def pdf_file(num_pages: int = 1, name: str = "test.pdf"):
    return (io.BytesIO(make_pdf_bytes(num_pages)), name)


# ---------------------------------------------------------------------------
# POST /merge
# ---------------------------------------------------------------------------


def test_merge_two_pdfs_returns_valid_pdf(client):
    """POST /merge with two valid PDFs returns a merged PDF binary."""
    response = client.post(
        "/merge",
        data={"files": [pdf_file(2, "a.pdf"), pdf_file(3, "b.pdf")]},
        content_type="multipart/form-data",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    assert response.content_type == "application/pdf"
    assert b"Content-Disposition" in response.headers.get("Content-Disposition", "").encode() or \
           "attachment" in response.headers.get("Content-Disposition", "")

    # Verify the merged PDF has the correct page count (2 + 3 = 5)
    merged_bytes = response.data
    reader = pypdf.PdfReader(io.BytesIO(merged_bytes))
    assert len(reader.pages) == 5


def test_merge_returns_400_for_single_file(client):
    """POST /merge with only one file returns 400."""
    response = client.post(
        "/merge",
        data={"files": [pdf_file(1)]},
        content_type="multipart/form-data",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_merge_returns_400_for_no_files(client):
    """POST /merge with no files returns 400."""
    response = client.post(
        "/merge",
        data={},
        content_type="multipart/form-data",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_merge_returns_400_for_non_pdf_file(client):
    """POST /merge with a non-PDF file returns 400."""
    fake = (io.BytesIO(b"This is not a PDF file at all"), "fake.pdf")
    response = client.post(
        "/merge",
        data={"files": [pdf_file(1), fake]},
        content_type="multipart/form-data",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_merge_content_disposition_header(client):
    """Merged PDF response includes correct Content-Disposition header."""
    response = client.post(
        "/merge",
        data={"files": [pdf_file(1, "a.pdf"), pdf_file(1, "b.pdf")]},
        content_type="multipart/form-data",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    disposition = response.headers.get("Content-Disposition", "")
    assert "attachment" in disposition
    assert "merged.pdf" in disposition


# ---------------------------------------------------------------------------
# POST /to-images
# ---------------------------------------------------------------------------


@requires_poppler
def test_convert_3_page_pdf_returns_zip_with_correct_files(client):
    """POST /to-images with a 3-page PDF returns a ZIP with page_1.png, page_2.png, page_3.png."""
    response = client.post(
        "/to-images",
        data={"file": pdf_file(3, "doc.pdf")},
        content_type="multipart/form-data",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    assert "zip" in response.content_type

    with zipfile.ZipFile(io.BytesIO(response.data)) as zf:
        names = set(zf.namelist())

    assert names == {"page_1.png", "page_2.png", "page_3.png"}


def test_convert_returns_400_for_no_file(client):
    """POST /to-images with no file returns 400."""
    response = client.post(
        "/to-images",
        data={},
        content_type="multipart/form-data",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 400


def test_convert_returns_400_for_non_pdf(client):
    """POST /to-images with a non-PDF file returns 400."""
    fake = (io.BytesIO(b"<html>not a pdf</html>"), "page.pdf")
    response = client.post(
        "/to-images",
        data={"file": fake},
        content_type="multipart/form-data",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 400


@requires_poppler
def test_convert_content_disposition_header(client):
    """Convert response includes correct Content-Disposition header."""
    response = client.post(
        "/to-images",
        data={"file": pdf_file(1, "doc.pdf")},
        content_type="multipart/form-data",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    disposition = response.headers.get("Content-Disposition", "")
    assert "attachment" in disposition
    assert "pages.zip" in disposition


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------


def test_cors_allows_localhost_5173(client):
    """Requests from http://localhost:5173 are accepted."""
    response = client.options(
        "/merge",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    # Flask-CORS sets the Allow-Origin header on preflight
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"


def test_cors_blocks_other_origins(client):
    """Requests from other origins do not receive CORS allow headers."""
    response = client.options(
        "/merge",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    allow_origin = response.headers.get("Access-Control-Allow-Origin", "")
    assert "evil.example.com" not in allow_origin
