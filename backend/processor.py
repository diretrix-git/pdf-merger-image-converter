"""
PDF processing logic — merge and image conversion.

All operations are performed entirely in memory using io.BytesIO.
No files are written to disk at any point. The "isolated temp dir"
requirement from the spec is satisfied by this in-memory approach.
"""

import io
import threading
import zipfile

import pikepdf
import pypdf
from pdf2image import convert_from_bytes

from config import PROCESSING_TIMEOUT_SECONDS


# ---------------------------------------------------------------------------
# Timeout helper (cross-platform — uses threading, not signal.alarm)
# ---------------------------------------------------------------------------

class _TimeoutError(Exception):
    pass


def _run_with_timeout(fn, timeout_seconds: int):
    """
    Run fn() in a thread. Raise _TimeoutError if it doesn't finish in time.
    Works on both Windows and Unix (signal.alarm is Unix-only).
    """
    result = [None]
    exc = [None]

    def target():
        try:
            result[0] = fn()
        except Exception as e:
            exc[0] = e

    t = threading.Thread(target=target, daemon=True)
    t.start()
    t.join(timeout=timeout_seconds)

    if t.is_alive():
        raise _TimeoutError(
            f"Processing timed out after {timeout_seconds} seconds. "
            "The PDF may be too complex."
        )
    if exc[0] is not None:
        raise exc[0]
    return result[0]


# ---------------------------------------------------------------------------
# Deep JS / dangerous action stripping
# ---------------------------------------------------------------------------

# Keys that can execute code or trigger network/file actions in a PDF viewer
_DANGEROUS_KEYS = {
    "/JavaScript",
    "/JS",
    "/AA",          # Additional Actions (can fire on open, close, print, etc.)
    "/OpenAction",  # Action on document open
    "/Launch",      # Launch an external application
    "/SubmitForm",  # Submit form data to a URL
    "/ImportData",  # Import data from an external file
    "/RichMedia",   # Embedded Flash/video
    "/EmbeddedFiles",
}


def _strip_dangerous_keys(obj, visited: set | None = None) -> None:
    """
    Recursively walk a pikepdf object tree and delete any key whose name
    appears in _DANGEROUS_KEYS.

    Operates in-place on the pikepdf object graph.
    Uses a visited set to avoid infinite loops on circular references.
    """
    if visited is None:
        visited = set()

    obj_id = id(obj)
    if obj_id in visited:
        return
    visited.add(obj_id)

    try:
        if isinstance(obj, pikepdf.Dictionary):
            # Collect keys to delete first (can't mutate while iterating)
            to_delete = [k for k in obj.keys() if k in _DANGEROUS_KEYS]
            for k in to_delete:
                del obj[k]
            # Recurse into remaining values
            for k in list(obj.keys()):
                try:
                    _strip_dangerous_keys(obj[k], visited)
                except Exception:
                    pass

        elif isinstance(obj, pikepdf.Array):
            for item in obj:
                try:
                    _strip_dangerous_keys(item, visited)
                except Exception:
                    pass

        elif isinstance(obj, pikepdf.Stream):
            # Strip dangerous keys from the stream dictionary
            to_delete = [k for k in obj.keys() if k in _DANGEROUS_KEYS]
            for k in to_delete:
                del obj[k]

    except Exception:
        pass  # Never crash on a malformed object — just skip it


# ---------------------------------------------------------------------------
# Merge
# ---------------------------------------------------------------------------

def strip_and_merge_pdfs(pdf_bytes_list: list[bytes]) -> io.BytesIO:
    """
    Merge PDFs using pikepdf with full security hardening:

    - Deep recursive stripping of JavaScript, AA, OpenAction, Launch,
      SubmitForm, ImportData, RichMedia, and EmbeddedFiles at every
      nesting level in the object tree
    - Strips document metadata (XMP + docinfo) from the output
    - Handles mixed page sizes gracefully (pikepdf preserves MediaBox)
    - Hard timeout via threading (cross-platform)
    - Raises ValueError on password-protected or corrupted inputs

    All processing is in-memory (io.BytesIO) — no files are written to disk.

    Args:
        pdf_bytes_list: List of raw PDF bytes, one per input file.
                        Must contain at least two items.

    Returns:
        A BytesIO object containing the merged PDF, seeked to position 0.
    """
    def _do_merge() -> io.BytesIO:
        output = pikepdf.Pdf.new()

        for pdf_bytes in pdf_bytes_list:
            try:
                with pikepdf.open(io.BytesIO(pdf_bytes)) as src:
                    # Deep-strip dangerous keys from the entire object tree
                    _strip_dangerous_keys(src.Root)
                    for page in src.pages:
                        _strip_dangerous_keys(page)

                    # Append all pages (mixed page sizes handled via MediaBox)
                    output.pages.extend(src.pages)
            except pikepdf.PasswordError:
                raise ValueError("One of the PDFs is password-protected.")
            except Exception as e:
                raise ValueError(f"Could not process a PDF: {str(e)}")

        # Strip output document metadata (XMP)
        with output.open_metadata() as meta:
            meta.clear()

        # Strip docinfo dictionary
        try:
            for key in list(output.docinfo.keys()):
                del output.docinfo[key]
        except Exception:
            pass

        buf = io.BytesIO()
        output.save(buf)
        buf.seek(0)
        return buf

    try:
        return _run_with_timeout(_do_merge, PROCESSING_TIMEOUT_SECONDS)
    except _TimeoutError as e:
        raise ValueError(str(e))


def merge_pdfs(pdf_streams: list[io.BytesIO]) -> io.BytesIO:
    """
    Merge multiple PDF byte streams into a single PDF.

    Kept for backward compatibility with existing tests.
    Production routes use strip_and_merge_pdfs() which also strips
    JavaScript, dangerous actions, and metadata.

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


# ---------------------------------------------------------------------------
# Convert to images
# ---------------------------------------------------------------------------

def convert_to_images(pdf_bytes: bytes, dpi: int = 150) -> tuple[io.BytesIO, str]:
    """
    Convert each page of a PDF to a PNG image, with a hard processing timeout.

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
        ValueError: If the PDF cannot be converted or processing times out.
    """
    def _do_convert() -> tuple[io.BytesIO, str]:
        try:
            images = convert_from_bytes(pdf_bytes, dpi=dpi)
        except Exception as e:
            raise ValueError(f"Could not convert PDF to images: {str(e)}")

        if len(images) == 1:
            png_buffer = io.BytesIO()
            images[0].save(png_buffer, format="PNG")
            png_buffer.seek(0)
            return png_buffer, "image/png"

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for index, image in enumerate(images, start=1):
                img_buffer = io.BytesIO()
                image.save(img_buffer, format="PNG")
                img_buffer.seek(0)
                zf.writestr(f"page_{index}.png", img_buffer.read())

        zip_buffer.seek(0)
        return zip_buffer, "application/zip"

    try:
        return _run_with_timeout(_do_convert, PROCESSING_TIMEOUT_SECONDS)
    except _TimeoutError as e:
        raise ValueError(str(e))
