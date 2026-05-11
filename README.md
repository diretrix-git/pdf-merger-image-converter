# MergeSnap

A personal-use web app for PDF processing — no sign-up, no storage, nothing sent to the cloud.

All processing happens in-memory on your local machine. Files are never written to disk and are gone the moment the response is sent.

---

## Features

- **Merge PDFs** — combine up to 8 PDFs into one file, in the exact order you choose
- **Drag to reorder** — drag files up or down before merging (works on both desktop and mobile)
- **Convert to PNG or JPG** — convert a PDF's pages to images; choose your format before converting
- **Custom filenames** — name your output file before downloading
- **Privacy first** — all processing is in-memory, files are deleted immediately after download

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11, Flask 3.1, pikepdf 9.4, PyMuPDF 1.25, Flask-Limiter 3.9 |
| Frontend | React 19, TypeScript, Vite 5, Tailwind CSS 3, Framer Motion 12, Locomotive Scroll 4 |

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Poppler** — optional fallback for PDF→image conversion (PyMuPDF handles most cases without it)

### Installing Poppler (optional)

| OS | Command |
|---|---|
| Windows | Download from [poppler-windows releases](https://github.com/oschwartz10612/poppler-windows/releases), extract, add `Library\bin\` to system PATH |
| macOS | `brew install poppler` |
| Linux | `sudo apt install poppler-utils` |

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
| POST | `/to-images` | Convert a PDF to images. Form fields: `file` (single), `format` (`png` or `jpg`). Returns image (1 page) or ZIP (multi-page). |
| GET | `/health` | Reports server status and Poppler availability. |

### Limits

| Limit | Value |
|---|---|
| Per-file size | 50 MB |
| Combined request size | 50 MB |
| Files per merge | 8 max |
| Pages per conversion | 15 max |
| Output DPI | 72 |
| Rate limit | 10 requests/minute, 50/day per IP |

---

## Security

- File content validated by magic bytes (`%PDF-`) and MIME type inspection — not just file extension
- Password-protected PDFs rejected with a clear error
- PDF bomb protection — uncompressed stream size checked before processing
- Embedded JavaScript, auto-actions, and dangerous PDF keys stripped recursively from all merged output
- Document metadata (author, creator, dates) stripped from merged output
- Filenames sanitized with `werkzeug.secure_filename` before any use
- CORS locked to `http://localhost:5173` and `https://pdf-merger-image-converter.vercel.app`
- IP-based rate limiting on all upload endpoints

---

## Running Tests

```bash
# Backend (51 tests)
cd pdf-app/backend
pytest tests/ -v

# Frontend (37 tests)
cd pdf-app/frontend
npx vitest run
```

Tests that require Poppler are automatically skipped when it's not installed.

---

## Deployment

### Backend → Render (Docker)
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set **Runtime** to **Docker**, **Root Directory** to `pdf-app/backend`
4. Deploy — the `Dockerfile` installs all dependencies automatically
5. Copy your Render URL → add to CORS in `backend/app.py` → redeploy

### Frontend → Vercel
1. Connect your GitHub repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `pdf-app/frontend`
3. Add environment variable: `VITE_API_URL` = your Render URL
4. Deploy
