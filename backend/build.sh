#!/usr/bin/env bash
# Render build script — installs Poppler (required by pdf2image) then Python deps
set -e

apt-get install -y poppler-utils
pip install -r requirements.txt
