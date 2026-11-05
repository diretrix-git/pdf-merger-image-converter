# MergeSnap

A personal-use web app that uploads PDFs from a React frontend to a Flask backend for merging and PNG/JPG conversion. No account workflow is implemented. When run locally, processing occurs on that local backend; a hosted backend receives the uploaded files.

The processing functions use byte buffers and `io.BytesIO`. This does not guarantee zero disk use or immediate deletion: upload parsing/spooling, the Poppler fallback, logs, proxies, and hosting retention need separate review. The source does not establish a hosting-level privacy or retention guarantee.

Documentation baseline: inspected `main` at [`074f19784906ecbe5d8e91b285892f8011c84e4a`](https://github.com/diretrix-git/pdf-merger-image-converter/commit/074f19784906ecbe5d8e91b285892f8011c84e4a). See [source-backed claims](docs/source-backed-claims.md) for exact evidence and limitations. Phase 2 was a static documentation review; tests, conversion, browsers, and services were **NOT RUN**.

---

## Features

- **Merge PDFs**: combine up to 8 PDFs into one file, in the exact order you choose
- **Drag to reorder**: drag files up or down before merging (pointer-based mouse/touch handling is implemented; physical-device behavior was not checked in Phase 2)
- **Convert to PNG or JPG**: convert a PDF's pages to images; choose your format before converting
- **Custom filenames**: name your output file before downloading
- **Buffered processing**: application output uses in-memory buffers; backend uploads and hosting retention still apply

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
- **Poppler**: optional fallback for PDF→image conversion (PyMuPDF is the primary renderer)

### Installing Poppler (optional)

| OS | Command |
|---|---|
| Windows | Download from [poppler-windows releases](https://github.com/oschwartz10612/poppler-windows/releases), extract, add `Library\bin\` to system PATH |
| macOS | `brew install poppler` |
| Linux | `sudo apt install poppler-utils` |

---

## Running Locally

Run these commands from the repository root, using a separate terminal for each service. Local native dependencies such as libmagic must be available for `python-magic`.

### Backend (port 5000)

```bash
cd backend

python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
flask --app app run --port 5000
```

### Frontend (port 5173)

```bash
cd frontend
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
| Per-file size | 50 MiB (52,428,800 bytes) |
| Combined request body | 50 MiB including multipart overhead; combined-file validation also uses 50 MiB |
| Files per merge | 8 max |
| Pages per conversion | 15 max |
| Output DPI | 72 |
| Upload rate limit | 10 requests/minute, 50/day per IP, using process-local memory |
| Processing wait | 60 seconds for merge/conversion thread join; timed-out work is not terminated |

---

## Validation, security, and resource boundaries

- MIME inspection and `%PDF-` magic bytes validate content as well as size/count checks. Parsing libraries can reject password-protected or corrupt files; the early encryption helper only opens files when an `/Encrypt` marker is found in its sampled regions. Do not treat the byte scan alone as exhaustive encryption detection.
- An uncompressed-stream scan is called only for inputs **larger than 5 MiB**. Inputs at or below 5 MiB skip it. The scan calls `read_bytes()` to decompress each stream before adding its size and comparing with the 100 MiB threshold. It is not a bounded decompression or comprehensive PDF-bomb defense.
- Merge/conversion waits up to 60 seconds on a daemon thread. A join timeout raises an error but **does not kill the worker** or bound its later CPU/memory use. Validation runs before that wrapper. This is not a hard processing deadline or resource-isolation boundary.
- Merging attempts recursive removal of a configured set of JavaScript/action/embedded-file keys and clears document XMP/docinfo metadata. Traversal errors are skipped. This is defensive processing, not proof that every dangerous construct or identifying datum is removed.
- Names used in later content-validation messages pass through Werkzeug's `secure_filename` with a fallback. Earlier per-file size checks still include the raw uploaded filename in their error message. The API supplies fixed download names; the frontend also offers a custom filename for the browser download.
- CORS lists `http://localhost:5173` and `https://pdf-merger-image-converter.vercel.app`. CORS is a browser-origin policy, not API authentication.
- IP-based rate limiting applies to upload endpoints using process-local memory. Multiple backend workers do not share that counter; use and verify shared storage before relying on a global limit.
- PyMuPDF is the primary image renderer. Poppler is optional for the `pdf2image` fallback. The current startup warning and `/health` message overstate the effect of missing Poppler; their message does not mean the PyMuPDF path requires it.

The application-specific work coordinates upload validation, file ordering, processing, downloads, and error handling. pikepdf/PyMuPDF perform core PDF operations and Werkzeug supplies filename normalization. Owner-supplied project context identifies MergeSnap as independently built with an AI-assisted development workflow. This source review does not independently establish per-line authorship or contribution boundaries. Public repository visibility is not a verified license grant; dependency obligations, including PyMuPDF, require a separate release review.

---

## Running Tests

Run each block from the repository root in its own terminal.

```bash
# Backend
cd backend
pytest tests/ -v
```

```bash
# Frontend
cd frontend
npx vitest run
```

Several conversion tests are marked to skip when Poppler is absent, even though implementation uses PyMuPDF first. Existing tests cover routes, validation, legacy merge helpers, conversion, and frontend behavior; they do not establish hard timeout enforcement, peak-memory bounds, or hosting retention. Fixed test counts and a fresh passing status are not asserted. These commands were not run during Phase 2.

---

## Deployment

### Backend → Render (Docker)
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set **Runtime** to **Docker**, **Root Directory** to `backend`
4. Deploy: the `Dockerfile` installs all dependencies automatically
5. Set `VITE_API_URL` to the Render backend URL. Add the actual frontend origin to CORS in `backend/app.py` and redeploy if it differs from the configured origins

### Frontend → Vercel
1. Connect your GitHub repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variable: `VITE_API_URL` = your Render URL
4. Deploy
