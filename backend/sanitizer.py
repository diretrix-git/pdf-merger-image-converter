"""
Filename sanitization utilities.

Never use user-supplied filenames directly in file system operations or
response headers. Always pass through sanitize_filename first.
"""

from werkzeug.utils import secure_filename


def sanitize_filename(filename: str) -> str:
    """
    Strip path traversal sequences and special characters from a filename.

    Uses werkzeug's secure_filename, which:
    - Removes path separators (/ and \\)
    - Strips leading dots and spaces
    - Replaces unsafe characters with underscores

    Falls back to "upload.pdf" when secure_filename returns an empty string
    (e.g. when the input is all special characters or empty).

    Args:
        filename: The raw filename string from the upload.

    Returns:
        A safe filename string, never empty.
    """
    safe = secure_filename(filename)
    return safe if safe else "upload.pdf"
