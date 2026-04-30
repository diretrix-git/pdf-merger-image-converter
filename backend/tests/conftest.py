"""
Shared pytest fixtures for the backend test suite.
"""

import sys
import os

import pytest

# Allow imports from the backend package root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture
def app_ctx():
    """
    Push a Flask application context so that abort() and jsonify() work
    inside validator functions during tests.
    """
    from app import app

    with app.app_context():
        yield
