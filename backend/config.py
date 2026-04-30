# Application-wide constants for the PDF Merger & Image Converter backend.
# All size values are in bytes.

MAX_FILE_SIZE_BYTES: int = 20 * 1024 * 1024      # 20 MB per individual file
MAX_COMBINED_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB total per request
MAX_PAGE_COUNT: int = 30                          # Maximum pages for image conversion
CONVERSION_DPI: int = 150                         # DPI for PDF-to-image rendering
ALLOWED_MIME_TYPE: str = "application/pdf"        # Only PDFs are accepted
