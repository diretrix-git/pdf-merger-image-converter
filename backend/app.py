import logging
import shutil
import warnings

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

from config import (
    CONVERSION_DPI,
    MAX_COMBINED_SIZE_BYTES,
    MAX_FILE_SIZE_BYTES,
    MAX_FILES_PER_MERGE,
)

from jobs import JobError, runner

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

# Poppler is optional: PyMuPDF remains the primary renderer.
if shutil.which("pdftoppm") is None:
    warnings.warn(
        "Poppler (pdftoppm) is not found in PATH. "
        "The image conversion fallback will be unavailable. "
        "See README.md for installation instructions.",
        RuntimeWarning,
        stacklevel=1,
    )


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------


@app.errorhandler(JobError)
def job_failed(error):
    response = jsonify({"error": str(error)})
    response.status_code = error.status
    if error.status == 503:
        response.headers["Retry-After"] = "1"
    return response


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
    """Admit before parsing uploads; run expensive PDF work in isolation."""
    from sanitizer import sanitize_filename
    from validator import (
        validate_combined_size, validate_file_count, validate_file_size,
        validate_files_present, validate_magic_bytes, validate_mime_type,
        validate_minimum_files,
    )

    with runner.admission() as execute:
        files = request.files.getlist("files")
        validate_files_present(files)
        validate_minimum_files(files, minimum=2)
        validate_file_count(files, MAX_FILES_PER_MERGE)
        for file in files:
            validate_file_size(file, MAX_FILE_SIZE_BYTES)
        validate_combined_size(files, MAX_COMBINED_SIZE_BYTES)
        inputs = []
        for file in files:
            raw = file.read()
            name = sanitize_filename(file.filename or "upload.pdf")
            validate_mime_type(raw, name)
            validate_magic_bytes(raw, name)
            inputs.append((raw, name))
        output, mimetype = execute("merge", inputs)
    return _download(output, mimetype, "merged.pdf")


@app.route("/to-images", methods=["POST"])
@limiter.limit("10 per minute; 50 per day")
def to_images():
    """Preserve single-image/ZIP downloads with isolated validation/rendering."""
    from sanitizer import sanitize_filename
    from validator import (
        validate_file_size, validate_files_present, validate_magic_bytes,
        validate_mime_type,
    )

    with runner.admission() as execute:
        file = request.files.get("file")
        validate_files_present([file] if file is not None else [])
        validate_file_size(file, MAX_FILE_SIZE_BYTES)
        image_format = request.form.get("format", "png").lower().strip()
        if image_format not in ("png", "jpg", "jpeg"):
            return jsonify({"error": "Invalid format. Use 'png' or 'jpg'."}), 400
        if image_format == "jpeg":
            image_format = "jpg"
        raw = file.read()
        name = sanitize_filename(file.filename or "upload.pdf")
        validate_mime_type(raw, name)
        validate_magic_bytes(raw, name)
        output, mimetype = execute("convert", [(raw, name)], fmt=image_format, dpi=CONVERSION_DPI)
    filename = f"page.{image_format}" if mimetype in ("image/png", "image/jpeg") else "pages.zip"
    return _download(output, mimetype, filename)


def _download(output, mimetype, filename):
    try:
        response = send_file(output, mimetype=mimetype, as_attachment=True, download_name=filename)
        response.call_on_close(output.close)
        return response
    except BaseException:
        output.close()
        raise


@app.route("/health", methods=["GET"])
def health():
    """Health check — reports whether optional dependencies are available."""
    poppler_ok = shutil.which("pdftoppm") is not None
    return jsonify({
        "status": "ok",
        "poppler": poppler_ok,
        "poppler_message": None if poppler_ok else (
            "Poppler is not installed or not in PATH. "
            "The image conversion fallback is unavailable; PyMuPDF remains primary."
        ),
    })


if __name__ == "__main__":
    app.run(port=5000, debug=True)
