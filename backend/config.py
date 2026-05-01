# Application-wide constants for the PDF Merger & Image Converter backend.
# All size values are in bytes.

MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024           # 50 MB per individual file
MAX_COMBINED_SIZE_BYTES: int = 50 * 1024 * 1024       # 50 MB total per request
MAX_PAGE_COUNT: int = 20                               # Maximum pages for image conversion
MAX_FILES_PER_MERGE: int = 8                           # Maximum files per merge request
MAX_UNCOMPRESSED_SIZE_BYTES: int = 200 * 1024 * 1024  # 200 MB — PDF bomb protection
CONVERSION_DPI: int = 150                              # DPI for PDF-to-image rendering
ALLOWED_MIME_TYPE: str = "application/pdf"             # Only PDFs are accepted
PDF_MAGIC_BYTES: bytes = b"%PDF-"                      # Magic bytes for PDF validation
PROCESSING_TIMEOUT_SECONDS: int = 60                  # Hard timeout for processing
