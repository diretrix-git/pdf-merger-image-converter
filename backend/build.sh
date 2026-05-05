#!/usr/bin/env bash
# Render build script
set -e

# Install Poppler (required by pdf2image for PDF→image conversion)
sudo apt-get update -y
sudo apt-get install -y poppler-utils

# Install Python dependencies
pip install -r requirements.txt
