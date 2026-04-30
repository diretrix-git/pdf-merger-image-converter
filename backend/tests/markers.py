"""
Shared pytest markers for the backend test suite.
"""

import shutil
import pytest


def _poppler_available() -> bool:
    """Return True if pdftoppm (Poppler) is available in PATH."""
    return shutil.which("pdftoppm") is not None


requires_poppler = pytest.mark.skipif(
    not _poppler_available(),
    reason=(
        "Poppler is not installed or not in PATH. "
        "Install it and add its bin/ directory to PATH to run these tests. "
        "See README.md for installation instructions."
    ),
)
