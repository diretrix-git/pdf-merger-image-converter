# MergeSnap

A personal-use web app for PDF processing — no sign-up, no storage, nothing sent to the cloud.

- **Merge PDFs** — combine up to 8 PDFs into one, in order, with JavaScript and metadata stripped
- **Convert to PNGs** — convert a PDF's pages to PNG images (single page → PNG file, multi-page → ZIP)

All processing happens in-memory on your local machine. Files are never written to disk and are gone the moment the response is sent.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12, Flask 3.1, pikepdf 9.4, pdf2image 1.17, Flask-Limiter 3.9 |
| Frontend | React 19, TypeScript, Vite 5, Tailwind CSS 3, Framer Motion 12, Locomotive Scroll 4 |

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Poppler** — required for PDF→image conversion

### Installing Poppler

| OS | Command |
|---|---|
| Windows | Download from [poppler-windows releases](https://github.com/oschwartz10612/poppler-windows/releases), extract, add `Library\bin\` to system PATH |
| macOS | `brew install poppler` |
| Linux | `sudo apt install poppler-utils` |

Verify with `pdftoppm -v` in a new terminal. Restart the Flask server after installing.

---

## Running Locally

### Backend (port 5000)

```bash
cd pdf-app/backend

python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
flask run --port 5000
```

### Frontend (port 5173)

```bash
cd pdf-app/frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/merge` | Merge 2–8 PDFs. Form field: `files` (multiple). Returns `merged.pdf`. |
| POST | `/to-images` | Convert a PDF to PNGs. Form field: `file` (single). Returns PNG (1 page) or ZIP (multi-page). |
| GET | `/health` | Reports server status and Poppler availability. |

### Limits

| Limit | Value |
|---|---|
| Per-file size | 50 MB |
| Combined request size | 50 MB |
| Files per merge | 8 max |
| Pages per conversion | 20 max |
| Output DPI | 150 |
| Rate limit | 10 requests/minute, 50/day per IP |

---

## Security

- File content validated by magic bytes (`%PDF-`) and MIME type inspection — not just file extension
- Password-protected PDFs rejected with a clear error
- PDF bomb protection — uncompressed stream size checked before processing
- Embedded JavaScript, auto-actions, and dangerous PDF keys stripped recursively from all merged output
- Document metadata (author, creator, dates) stripped from merged output
- Filenames sanitized with `werkzeug.secure_filename` before any use
- CORS locked to `http://localhost:5173` (update for production deployment)
- IP-based rate limiting on all upload endpoints

---

## Running Tests

```bash
# Backend (51 tests)
cd pdf-app/backend
pytest tests/ -v

# Frontend (34 tests)
cd pdf-app/frontend
npx vitest run
```

Tests that require Poppler are automatically skipped when it's not installed.

---

## Deployment

See `PROJECT.md` for full deployment instructions (Vercel for frontend, Render for backend).

Quick summary:
1. Backend → Render Web Service, root dir `pdf-app/backend`, start command `gunicorn app:app`, build script installs `poppler-utils`
2. Frontend → Vercel, root dir `pdf-app/frontend`, set `VITE_API_URL` env var to your Render URL
3. Update CORS in `backend/app.py` to include your Vercel URL
