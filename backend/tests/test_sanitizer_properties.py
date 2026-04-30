# Feature: pdf-merger-image-converter, Property 7: Filename sanitization is idempotent
"""
Property-based tests for sanitizer.sanitize_filename.

Property 7: Filename sanitization is idempotent
  For any filename string, applying the sanitizer twice SHALL produce the same
  result as applying it once: sanitize(sanitize(s)) == sanitize(s).
"""

import sys
import os

# Allow imports from the backend package root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from hypothesis import given, settings
from hypothesis import strategies as st

from sanitizer import sanitize_filename


@given(st.text())
@settings(max_examples=200)
def test_sanitize_filename_is_idempotent(filename: str) -> None:
    """
    Property 7: sanitize_filename(sanitize_filename(s)) == sanitize_filename(s)
    for all string inputs.
    """
    once = sanitize_filename(filename)
    twice = sanitize_filename(once)
    assert once == twice, (
        f"Sanitization is not idempotent for input {filename!r}: "
        f"first pass={once!r}, second pass={twice!r}"
    )


def test_sanitize_filename_never_returns_empty() -> None:
    """sanitize_filename always returns a non-empty string."""
    assert sanitize_filename("") != ""
    assert sanitize_filename("   ") != ""
    assert sanitize_filename("...") != ""
    assert sanitize_filename("!@#$%^&*()") != ""


def test_sanitize_filename_strips_path_traversal() -> None:
    """Path traversal sequences are removed."""
    result = sanitize_filename("../../etc/passwd")
    assert "/" not in result
    assert "\\" not in result
    assert ".." not in result


def test_sanitize_filename_normal_pdf() -> None:
    """A normal PDF filename passes through cleanly."""
    assert sanitize_filename("my_document.pdf") == "my_document.pdf"
