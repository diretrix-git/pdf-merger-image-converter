import io
import logging
import shutil
import warnings

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

from config import (
    ALLOWED_MIME_TYPE,
    CONVERSION_DPI,
    MAX_COMBINED_SIZE_BYTES,
    MAX_FILE_SIZE_BYTES,
    MAX_FILES_PER_MERGE,
    MAX_PAGE_COUNT,
    MAX_UNCOMPRESSED_SIZE_BYTES,
)

app = Flask(__name__)

# Restrict CORS to the Vite dev server and production frontend.
CORS(app, origins=[
    "http://localhost:5173",
    "https://pdf-merger-image-converter.vercel.app",
])

# Flask will reject requests whose body exceeds this limit before they hit a route.
app.config["MAX_CONTENT_LENGTH"] = MAX_COMBINED_SIZE_BYTES

# IP-based rate limiting — stored in memory (suitable for single-process deployments).
# For multi-process/multi-worker deployments, switch storage_uri to Redis.
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

# Warn at startup if Poppler is missing — the /to-images endpoint will fail without it.
if shutil.which("pdftoppm") is None:
    warnings.warn(
        "Poppler (pdftoppm) is not found in PATH. "
        "The /to-images endpoint will return a 500 error until Poppler is installed. "
        "See README.md for installation instructions.",
        RuntimeWarning,
        stacklevel=1,
    )


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handles requests that exceed MAX_CONTENT_LENGTH."""
    return jsonify({"error": "Combined file size exceeds the 50 MB limit."}), 413


@app.errorhandler(429)
def rate_limit_exceeded(error):
    """Handles requests that exceed the rate limit."""
    return jsonify({"error": "Too many requests. Please wait a moment and try again."}), 429


@app.errorhandler(500)
def internal_server_error(error):
    """Catch-all for unexpected server errors — never expose stack traces."""
    return jsonify({"error": "An unexpected error occurred."}), 500


@app.errorhandler(Exception)
def handle_unexpected_exception(error):
    """
    Catch unhandled exceptions and return a JSON 500 instead of an HTML page.
    Surfaces a helpful message for known dependency issues (e.g. Poppler missing).
    Internal paths and stack traces are never exposed to the client.
    """
    import logging
    logging.exception("Unhandled exception")

    message = "An unexpected error occurred."

    # Surface a helpful message when Poppler is not installed
    error_str = str(error)
    if "poppler" in error_str.lower() or "pdftoppm" in error_str.lower() or "pdfinfo" in error_str.lower():
        message = (
            "Poppler is not installed or not in PATH. "
            "Install it and add its bin/ directory to PATH, then restart the server. "
            "See README.md for instructions."
        )

    return jsonify({"error": message}), 500


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.route("/merge", methods=["POST"])
@limiter.limit("10 per minute; 50 per day")
def merge():
    """
    Accept multiple PDF files and return a single merged PDF.

    Applies full security validation pipeline:
    - File count limits (min 2, max MAX_FILES_PER_MERGE)
    - Per-file and combined size limits
    - MIME type and magic bytes verification
    - Encryption detection
    - PDF bomb protection (uncompressed size check)
    - JavaScript and metadata stripping on output

    Form field: "files" (multiple FileStorage objects)
    Returns: application/pdf binary download
    """
    from processor import strip_and_merge_pdfs
    from sanitizer import sanitize_filename
    from validator import (
        validate_combined_size,
        validate_file_count,
        validate_file_size,
        validate_files_present,
        validate_magic_bytes,
        validate_mime_type,
        validate_minimum_files,
        validate_not_encrypted,
        validate_uncompressed_size,
    )

    files = request.files.getlist("files")

    # Validation — cheapest checks first
    validate_files_present(files)
    validate_minimum_files(files, minimum=2)
    validate_file_count(files, MAX_FILES_PER_MERGE)

    for f in files:
        validate_file_size(f, MAX_FILE_SIZE_BYTES)

    validate_combined_size(files, MAX_COMBINED_SIZE_BYTES)

    pdf_bytes_list: list[bytes] = []
    for f in files:
        raw = f.read()
        safe_name = sanitize_filename(f.filename or "upload.pdf")
        validate_mime_type(raw, safe_name)
        validate_magic_bytes(raw, safe_name)
        validate_not_encrypted(raw, safe_name)        # Fast bytes scan, pikepdf only if /Encrypt found
        # Skip bomb check for small files — saves ~200ms per file on typical uploads
        if len(raw) > 5 * 1024 * 1024:
            validate_uncompressed_size(raw, safe_name, MAX_UNCOMPRESSED_SIZE_BYTES)
        pdf_bytes_list.append(raw)

    merged = strip_and_merge_pdfs(pdf_bytes_list)

    return send_file(
        merged,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="merged.pdf",
    )


@app.route("/to-images", methods=["POST"])
@limiter.limit("10 per minute; 50 per day")
def to_images():
    """
    Accept a single PDF file and return a ZIP archive of PNG images (one per page).

    Applies full security validation pipeline:
    - File size limits
    - MIME type and magic bytes verification
    - Encryption detection
    - PDF bomb protection (uncompressed size check)
    - Page count limit

    Form field: "file" (single FileStorage object)
    Returns: application/zip binary download (or image/png for single-page PDFs)
    """
    from processor import convert_to_images
    from sanitizer import sanitize_filename
    from validator import (
        validate_file_size,
        validate_files_present,
        validate_magic_bytes,
        validate_mime_type,
        validate_not_encrypted,
        validate_page_count,
        validate_uncompressed_size,
    )

    file = request.files.get("file")

    # Wrap in a list so validate_files_present can reuse the same helper
    validate_files_present([file] if file is not None else [])
    validate_file_size(file, MAX_FILE_SIZE_BYTES)

    # Read and validate the requested output format (default: png)
    image_format = request.form.get("format", "png").lower().strip()
    if image_format not in ("png", "jpg", "jpeg"):
        return jsonify({"error": "Invalid format. Use 'png' or 'jpg'."}), 400
    # Normalise jpeg → jpg
    if image_format == "jpeg":
        image_format = "jpg"

    raw = file.read()
    safe_name = sanitize_filename(file.filename or "upload.pdf")
    validate_mime_type(raw, safe_name)
    validate_magic_bytes(raw, safe_name)
    validate_page_count(raw, MAX_PAGE_COUNT)      # Early — before expensive checks
    validate_not_encrypted(raw, safe_name)        # Fast bytes scan, pikepdf only if /Encrypt found
    # Skip bomb check for small files — saves ~200ms on typical uploads
    if len(raw) > 5 * 1024 * 1024:
        validate_uncompressed_size(raw, safe_name, MAX_UNCOMPRESSED_SIZE_BYTES)

    output_stream, mimetype = convert_to_images(raw, dpi=CONVERSION_DPI, fmt=image_format)

    if mimetype in ("image/png", "image/jpeg"):
        # Single-page PDF — return raw image
        ext = "jpg" if image_format == "jpg" else "png"
        return send_file(
            output_stream,
            mimetype=mimetype,
            as_attachment=True,
            download_name=f"page.{ext}",
        )

    # Multi-page PDF — return a ZIP
    return send_file(
        output_stream,
        mimetype="application/zip",
        as_attachment=True,
        download_name="pages.zip",
    )


@app.route("/health", methods=["GET"])
def health():
    """Health check — reports whether optional dependencies are available."""
    poppler_ok = shutil.which("pdftoppm") is not None
    return jsonify({
        "status": "ok",
        "poppler": poppler_ok,
        "poppler_message": None if poppler_ok else (
            "Poppler is not installed or not in PATH. "
            "Image conversion will not work until it is installed."
        ),
    })


if __name__ == "__main__":
    app.run(port=5000, debug=True)
