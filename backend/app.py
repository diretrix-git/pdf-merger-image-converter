import io

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

    zip_stream = convert_to_images(raw, dpi=CONVERSION_DPI)

    return send_file(
        zip_stream,
        mimetype="application/zip",
        as_attachment=True,
        download_name="pages.zip",
    )


if __name__ == "__main__":
    app.run(port=5000, debug=True)
