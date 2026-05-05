FROM python:3.11-slim

# System dependencies:
# - poppler-utils: fallback PDF renderer (pdf2image) — PyMuPDF is primary
# - libmagic1: required by python-magic for MIME type detection
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 10000

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:10000", "--workers", "1", "--timeout", "180", "--graceful-timeout", "30"]
