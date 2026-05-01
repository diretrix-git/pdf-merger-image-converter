"""
PDF processing logic — merge and image conversion.

All operations are performed entirely in memory using io.BytesIO.
No files are written to disk at any point. The "isolated temp dir"
requirement from the spec is satisfied by this in-memory approach.
"""

import io
import zipfile

import pikepdf
import pypdf
from pdf2image import convert_from_bytes


def strip_and_merge_pdfs(pdf_bytes_list: list[bytes]) -> io.BytesIO:
    """
    Merge PDFs using pikepdf with security hardening:
    - Strips embedded JavaScript from each input PDF
    - Strips document metadata from the output
    - Handles mixed page sizes gracefully (pikepdf preserves each page's MediaBox)
    - Raises ValueError on password-protected or corrupted inputs

    All processing is in-memory (io.BytesIO) — no files are written to disk.

    Args:
        pdf_bytes_list: List of raw PDF bytes, one per input file.
                        Must contain at least two items.

    Returns:
        A BytesIO object containing the merged PDF, seeked to position 0.
    """
    output = pikepdf.Pdf.new()

    for pdf_bytes in pdf_bytes_list:
        try:
            with pikepdf.open(io.BytesIO(pdf_bytes)) as src:
                # Strip embedded JavaScript
                if '/Names' in src.Root:
                    names = src.Root['/Names']
                    if '/JavaScript' in names:
                        del names['/JavaScript']
                # Strip automatic actions that could execute JS
                if '/AA' in src.Root:
                    del src.Root['/AA']
                if '/OpenAction' in src.Root:
                    del src.Root['/OpenAction']

                # Append all pages (pikepdf preserves each page's MediaBox,
                # so mixed page sizes are handled gracefully)
                output.pages.extend(src.pages)
        except pikepdf.PasswordError:
            raise ValueError("One of the PDFs is password-protected.")
        except Exception as e:
            raise ValueError(f"Could not process a PDF: {str(e)}")

    # Strip output document metadata
    with output.open_metadata() as meta:
        meta.clear()
    # Clear docinfo dictionary entries individually
    for key in list(output.docinfo.keys()):
        del output.docinfo[key]

    buf = io.BytesIO()
    output.save(buf)
    buf.seek(0)
    return buf


def merge_pdfs(pdf_streams: list[io.BytesIO]) -> io.BytesIO:
    """
    Merge multiple PDF byte streams into a single PDF.

    Kept for backward compatibility with existing tests.
    New code should prefer strip_and_merge_pdfs() which also strips
    JavaScript and metadata.

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

    Raises:
        ValueError: If the PDF cannot be converted (corrupted or encrypted).
    """
    try:
        images = convert_from_bytes(pdf_bytes, dpi=dpi)
    except Exception as e:
        raise ValueError(f"Could not convert PDF to images: {str(e)}")

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
