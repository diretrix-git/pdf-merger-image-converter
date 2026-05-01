"""
PDF processing logic — merge and image conversion.

All operations are performed entirely in memory using io.BytesIO.
No files are written to disk at any point.
"""

import io
import zipfile

import pypdf
from pdf2image import convert_from_bytes


def merge_pdfs(pdf_streams: list[io.BytesIO]) -> io.BytesIO:
    """
    Merge multiple PDF byte streams into a single PDF.

    Pages are appended in the order the streams are provided, preserving
    the original page order within each input PDF.

    Args:
        pdf_streams: List of BytesIO objects, each containing a valid PDF.
                     Must contain at least two streams.

    Returns:
        A BytesIO object containing the merged PDF, seeked to position 0.
    """
    writer = pypdf.PdfWriter()

    for stream in pdf_streams:
        stream.seek(0)
        reader = pypdf.PdfReader(stream)
        for page in reader.pages:
            writer.add_page(page)

    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output


def convert_to_images(pdf_bytes: bytes, dpi: int = 150) -> tuple[io.BytesIO, str]:
    """
    Convert each page of a PDF to a PNG image.

    - 1-page PDF  → returns a raw PNG BytesIO + mimetype "image/png"
    - Multi-page  → returns a ZIP BytesIO + mimetype "application/zip"
      ZIP entries are named page_1.png … page_N.png (1-based).

    All operations are in-memory — no temporary files are created.

    Args:
        pdf_bytes: Raw bytes of the PDF file.
        dpi:       Resolution for rendering. Defaults to 150 DPI.

    Returns:
        Tuple of (BytesIO seeked to 0, mimetype string).
    """
    images = convert_from_bytes(pdf_bytes, dpi=dpi)

    if len(images) == 1:
        # Single page — return a raw PNG, no ZIP needed
        png_buffer = io.BytesIO()
        images[0].save(png_buffer, format="PNG")
        png_buffer.seek(0)
        return png_buffer, "image/png"

    # Multiple pages — package into a ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for index, image in enumerate(images, start=1):
            img_buffer = io.BytesIO()
            image.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            zf.writestr(f"page_{index}.png", img_buffer.read())

    zip_buffer.seek(0)
    return zip_buffer, "application/zip"
