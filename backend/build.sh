#!/usr/bin/env bash
# Render build script — Python dependencies only.
# Poppler (poppler-utils) must be added via Render dashboard:
#   Service → Environment → System Packages → add "poppler-utils"
set -e

pip install -r requirements.txt
