# PDF Merger & Image Converter

A personal-use web app with two features:
- **Merge PDFs** — combine multiple PDF files into one, in order
- **Convert to Images** — convert each page of a PDF into a downloadable PNG, packaged as a ZIP

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11+, Flask, pypdf, pdf2image, Pillow, python-magic |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Locomotive Scroll |

## Project Structure

```
pdf-app/
├── backend/          # Flask API (port 5000)
│   ├── app.py
│   ├── config.py
│   ├── validator.py
│   ├── sanitizer.py
│   ├── processor.py
│   ├── requirements.txt
│   └── tests/
└── frontend/         # React/Vite SPA (port 5173)
    ├── src/
    │   ├── components/
    │   ├── api.ts
    │   ├── downloadBlob.ts
    │   ├── types.ts
    │   └── App.tsx
    └── package.json
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- [Poppler](https://poppler.freedesktop.org/) installed and in PATH
  - **Windows**: Download from [poppler-windows](https://github.com/oschwartz10612/poppler-windows/releases), extract, add `bin/` to PATH
  - **macOS**: `brew install poppler`
  - **Linux**: `sudo apt install poppler-utils`

## Running Locally

### Backend

```bash
cd pdf-app/backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
flask run --port 5000
```

### Frontend

```bash
cd pdf-app/frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173, backend at http://localhost:5000.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/merge` | Merge multiple PDFs. Form field: `files` (multiple). Returns `merged.pdf`. |
| POST | `/to-images` | Convert PDF pages to PNGs. Form field: `file` (single). Returns `pages.zip`. |

### Limits

- Per file: 20 MB max
- Combined request: 50 MB max
- Image conversion: 30 pages max, 150 DPI output

## Running Tests

```bash
cd pdf-app/backend
pytest tests/
```
