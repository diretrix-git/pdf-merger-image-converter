# Application-wide constants for the PDF Merger & Image Converter backend.
# All size values are in bytes.

MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024           # 50 MB per individual file
MAX_COMBINED_SIZE_BYTES: int = 50 * 1024 * 1024       # 50 MB total per request
MAX_PAGE_COUNT: int = 15                               # Maximum pages for image conversion
MAX_FILES_PER_MERGE: int = 8                           # Maximum files per merge request
MAX_UNCOMPRESSED_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB — PDF bomb protection (reduced for free tier)
CONVERSION_DPI: int = 72                               # DPI for PDF-to-image rendering (72 = fast, 100 = balanced, 150 = high quality)
SMALL_FILE_THRESHOLD_BYTES: int = 5 * 1024 * 1024     # Skip bomb check for files under 5 MB
ALLOWED_MIME_TYPE: str = "application/pdf"             # Only PDFs are accepted
PDF_MAGIC_BYTES: bytes = b"%PDF-"                      # Magic bytes for PDF validation
PROCESSING_TIMEOUT_SECONDS: int = 60                  # Hard timeout for processing
