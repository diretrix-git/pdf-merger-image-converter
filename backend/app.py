import io
import shutil
import warnings

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

from config import (
    ALLOWED_MIME_TYPE,
    CONVERSION_DPI,
    MAX_COMBINED_SIZE_BYTES,
    MAX_FILE_SIZE_BYTES,
    MAX_PAGE_COUNT,
)

app = Flask(__name__)

# Restrict CORS to the Vite dev server only.
CORS(app, origins=["http://localhost:5173"])

# Flask will reject requests whose body exceeds this limit before they hit a route.
app.config["MAX_CONTENT_LENGTH"] = MAX_COMBINED_SIZE_BYTES

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


@app.errorhandler(500)
def internal_server_error(error):
    """Catch-all for unexpected server errors — never expose stack traces."""
    return jsonify({"error": "An unexpected error occurred."}), 500


@app.errorhandler(Exception)
def handle_unexpected_exception(error):
    """
    Catch unhandled exceptions and return a JSON 500 instead of an HTML page.
    Surfaces a helpful message for known dependency issues (e.g. Poppler missing).
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
# Routes — filled in after Validator and Processor are implemented
# ---------------------------------------------------------------------------


@app.route("/merge", methods=["POST"])
def merge():
    """
    Accept multiple PDF files and return a single merged PDF.

    Form field: "files" (multiple FileStorage objects)
    Returns: application/pdf binary download
    """
    from processor import merge_pdfs
    from sanitizer import sanitize_filename
    from validator import (
        validate_combined_size,
        validate_file_size,
        validate_files_present,
        validate_mime_type,
        validate_minimum_files,
    )

    files = request.files.getlist("files")

    # Validation — cheapest checks first
    validate_files_present(files)
    validate_minimum_files(files, minimum=2)

    for f in files:
        validate_file_size(f, MAX_FILE_SIZE_BYTES)

    validate_combined_size(files, MAX_COMBINED_SIZE_BYTES)

    pdf_streams: list[io.BytesIO] = []
    for f in files:
        raw = f.read()
        validate_mime_type(raw, sanitize_filename(f.filename or "upload.pdf"))
        pdf_streams.append(io.BytesIO(raw))

    merged = merge_pdfs(pdf_streams)

    return send_file(
        merged,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="merged.pdf",
    )


@app.route("/to-images", methods=["POST"])
def to_images():
    """
    Accept a single PDF file and return a ZIP archive of PNG images (one per page).

    Form field: "file" (single FileStorage object)
    Returns: application/zip binary download
    """
    from processor import convert_to_images
    from sanitizer import sanitize_filename
    from validator import (
        validate_file_size,
        validate_files_present,
        validate_mime_type,
        validate_page_count,
    )

    file = request.files.get("file")

    # Wrap in a list so validate_files_present can reuse the same helper
    validate_files_present([file] if file is not None else [])
    validate_file_size(file, MAX_FILE_SIZE_BYTES)

    raw = file.read()
    validate_mime_type(raw, sanitize_filename(file.filename or "upload.pdf"))
    validate_page_count(raw, MAX_PAGE_COUNT)

    output_stream, mimetype = convert_to_images(raw, dpi=CONVERSION_DPI)

    if mimetype == "image/png":
        # Single-page PDF — return a raw PNG
        return send_file(
            output_stream,
            mimetype="image/png",
            as_attachment=True,
            download_name="page.png",
        )

    # Multi-page PDF — return a ZIP of PNGs
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
