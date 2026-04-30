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


def convert_to_images(pdf_bytes: bytes, dpi: int = 150) -> io.BytesIO:
    """
    Convert each page of a PDF to a PNG image and package them in a ZIP archive.

    Images are named page_1.png through page_N.png (1-based index).
    All operations are in-memory — no temporary files are created.

    Args:
        pdf_bytes: Raw bytes of the PDF file.
        dpi:       Resolution for rendering. Defaults to 150 DPI.

    Returns:
        A BytesIO object containing the ZIP archive, seeked to position 0.
    """
    # Convert PDF pages to PIL Image objects
    images = convert_from_bytes(pdf_bytes, dpi=dpi)

    # Build the ZIP archive in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for index, image in enumerate(images, start=1):
            # Save each PIL image as PNG into a BytesIO buffer
            img_buffer = io.BytesIO()
            image.save(img_buffer, format="PNG")
            img_buffer.seek(0)

            # Write into the ZIP with the page_{n}.png naming convention
            zf.writestr(f"page_{index}.png", img_buffer.read())

    zip_buffer.seek(0)
    return zip_buffer
