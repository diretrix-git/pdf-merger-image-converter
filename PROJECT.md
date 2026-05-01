# MergeSnap — Complete Project Knowledge Base

> Read this file first in any new session. It captures the full current state of the project — architecture, all decisions made, security hardening applied, known issues, and what still needs doing.

---

## What is this?

**MergeSnap** is a personal-use web app with two features:
1. **Merge PDFs** — combine up to 8 PDFs into one, in order
2. **Convert to PNGs** — convert a PDF's pages to PNG images (single page → raw PNG, multi-page → ZIP of PNGs)

All processing is **in-memory** (Python `io.BytesIO`). Nothing is written to disk. Nothing is stored after the response is sent.

---

## Repository

- GitHub: `https://github.com/diretrix-git/pdf-merger-image-converter`
- Default branch: `main`
- Root folder: `pdf-app/`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12, Flask 3.1, pikepdf 9.4, pypdf 5.4, pdf2image 1.17, Pillow 11.2, python-magic 0.4, Flask-Limiter 3.9 |
| Frontend | React 19, TypeScript, Vite 5, Tailwind CSS 3, Framer Motion 12, Locomotive Scroll 4, Sonner (toasts) |
| Tests (backend) | pytest 8.3, Hypothesis 6.13 |
| Tests (frontend) | Vitest 2.1, @testing-library/react 16 |

---

## Folder Structure

```
pdf-app/
├── backend/
│   ├── app.py           # Flask app, routes, rate limiting, error handlers
│   ├── config.py        # All constants (limits, DPI, timeouts)
│   ├── validator.py     # All input validation functions
│   ├── processor.py     # PDF merge + image conversion logic
│   ├── sanitizer.py     # Filename sanitization (werkzeug.secure_filename)
│   ├── requirements.txt # Pinned Python dependencies
│   └── tests/
│       ├── conftest.py
│       ├── markers.py              # requires_poppler skip marker
│       ├── test_validator.py       # Example-based validator tests
│       ├── test_validator_properties.py  # Hypothesis property tests
│       ├── test_processor_properties.py  # Hypothesis property tests
│       └── test_routes_integration.py    # Flask test client integration tests
└── frontend/
    ├── src/
    │   ├── App.tsx              # Root component — state, API wiring only
    │   ├── api.ts               # HTTP client (fetch-based)
    │   ├── downloadBlob.ts      # Blob → browser download helper
    │   ├── types.ts             # FileEntry, Toast, AppState interfaces
    │   ├── locomotive-scroll.d.ts  # Type declaration for locomotive-scroll
    │   ├── components/
    │   │   ├── Navbar.tsx           # Centered pill nav, mobile hamburger
    │   │   ├── CustomCursor.tsx     # Pure RAF cursor (dot + ring)
    │   │   ├── UploadZone.tsx       # Drag-and-drop upload with validation
    │   │   ├── FileList.tsx         # Animated file list with storage bar
    │   │   ├── ActionButtons.tsx    # Merge + Convert buttons with hints
    │   │   ├── ToastContainer.tsx   # Toast notification system
    │   │   └── DownloadModal.tsx    # Custom filename before download
    │   └── test-setup.ts
    ├── src/__tests__/
    │   ├── api.test.ts
    │   ├── UploadZone.test.tsx
    │   ├── FileList.test.tsx
    │   └── ActionButtons.test.tsx
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── package.json
```

---

## Running Locally

### Backend
```bash
cd pdf-app/backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
flask run --port 5000
```

### Frontend
```bash
cd pdf-app/frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

### Tests
```bash
# Backend
cd pdf-app/backend
venv\Scripts\python.exe -m pytest tests/ -v

# Frontend
cd pdf-app/frontend
node_modules\.bin\vitest run
node_modules\.bin\tsc --noEmit   # TypeScript check
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/merge` | Merge 2–8 PDFs. Form field: `files` (multiple). Returns `merged.pdf`. |
| POST | `/to-images` | Convert PDF pages to PNGs. Form field: `file` (single). Returns PNG (1 page) or ZIP (multi-page). |
| GET | `/health` | Health check. Reports Poppler availability. |

### Limits (config.py)
```python
MAX_FILE_SIZE_BYTES      = 50 MB    # per file
MAX_COMBINED_SIZE_BYTES  = 50 MB    # total per request
MAX_PAGE_COUNT           = 20       # pages per PDF (convert only)
MAX_FILES_PER_MERGE      = 8        # files per merge request
MAX_UNCOMPRESSED_SIZE    = 200 MB   # PDF bomb protection threshold
CONVERSION_DPI           = 150
PROCESSING_TIMEOUT       = 60 sec   # hard timeout via threading
```

---

## Security Hardening (fully implemented)

### File Upload Security
- ✅ **Magic bytes** — `%PDF-` header checked before any processing
- ✅ **MIME type** — python-magic content inspection (not file extension)
- ✅ **Filename sanitization** — `werkzeug.utils.secure_filename()` applied to every uploaded filename before use
- ✅ **Size limits** — 50 MB per file, 50 MB combined, enforced on both frontend and backend
- ✅ **File count limit** — max 8 files per merge, enforced on both frontend and backend
- ✅ **No disk writes** — everything in `io.BytesIO`; no temp files to clean up
- ✅ **Encryption detection** — pikepdf detects password-protected PDFs and returns a clear 400 error

### Safe PDF Processing
- ✅ **Deep JS stripping** — recursive walk of entire pikepdf object tree removes `/JavaScript`, `/JS`, `/AA`, `/OpenAction`, `/Launch`, `/SubmitForm`, `/ImportData`, `/RichMedia`, `/EmbeddedFiles` at every nesting level
- ✅ **Metadata stripping** — XMP metadata and docinfo dictionary cleared from all merged output
- ✅ **PDF bomb protection** — uncompressed stream size checked against 200 MB limit before full processing
- ✅ **Page count checked early** — validated right after magic bytes using pikepdf (reads only page tree, not full content), so a 5000-page PDF is rejected before any heavy processing
- ✅ **Processing timeout** — 60-second hard timeout via `threading.Thread` (cross-platform, works on Windows unlike `signal.alarm`)
- ✅ **Corrupted PDF handling** — all pikepdf/pypdf exceptions caught and returned as clear 400 errors
- ✅ **Mixed page sizes** — pikepdf preserves each page's MediaBox, so mixed-size PDFs merge correctly
- ✅ **Library** — pikepdf (actively maintained, C++ backed) used for security-sensitive operations; pypdf kept for backward-compat tests

### Resource & Abuse Management
- ✅ **IP rate limiting** — Flask-Limiter: 10 requests/minute AND 50 requests/day per IP on both upload endpoints
- ✅ **429 error handler** — returns JSON `{"error": "Too many requests..."}` instead of HTML
- ✅ **413 error handler** — Flask's MAX_CONTENT_LENGTH rejects oversized requests before they hit routes

### API & Backend Security
- ✅ **No internal paths/stack traces** — all error handlers return generic messages only
- ✅ **CORS locked** — `flask-cors` restricted to `http://localhost:5173` only (update for production)
- ✅ **Content-Disposition** — all file download responses set `attachment; filename="..."` header
- ✅ **No wildcard CORS** — never set to `*`

### Privacy & Metadata
- ✅ **Metadata stripped** — XMP + docinfo cleared from all merged PDFs before serving
- ✅ **Privacy banner** — UI shows "Files are automatically deleted after processing and never stored permanently"
- ✅ **No filename logging** — sanitized names used only for error messages, never logged

### Frontend Hardening
- ✅ **Client-side validation** — file type (MIME), size (50 MB), count (8 files) checked before any network request
- ✅ **Buttons disabled during processing** — prevents duplicate submissions
- ✅ **State cleared after download** — files removed from React state after download to prevent memory leaks
- ✅ **Custom cursor disabled on touch** — `cursor: none` only applied on `(hover: hover) and (pointer: fine)` devices
- ✅ **Locomotive Scroll disabled on mobile** — uses native scroll on touch devices to prevent conflicts

---

## Known Gaps / Not Yet Implemented

| Item | Priority | Notes |
|---|---|---|
| Async processing (Celery/RQ) | Medium | Currently synchronous. Large files block the request thread. Acceptable for personal use. |
| Chunked/resumable uploads | Low | tus-js-client. Only needed for files >50 MB (currently rejected). |
| PDF preview before upload | Low | react-pdf or pdf.js. Nice UX but not critical. |
| pip-audit | Low | Run `pip-audit` manually before deploying. Not automated. |
| Docker sandbox for Poppler | Low | Poppler runs in-process. For production, consider running in a restricted container. |
| Redis for rate limiter | Low | Currently uses in-memory storage. For multi-worker deployments, switch to Redis. |
| Signed download URLs | Low | Not applicable — files are returned directly in the response, not stored. |
| Upload progress indicator | Low | fetch doesn't expose upload progress natively; would need axios or XHR. |

---

## Frontend Architecture

### App.tsx (thin orchestrator)
Manages only: `AppState` (files, isLoading, toasts), download modal state, Locomotive Scroll lifecycle, API calls. All UI is in components.

### Key component props
```typescript
// UploadZone
onFilesAdded: (entries: FileEntry[]) => void
onToast: (toast: Omit<Toast, 'id'>) => void
disabled?: boolean
currentFileCount?: number   // for 8-file limit enforcement

// FileList
files: FileEntry[]
onRemove: (id: string) => void
combinedSizeBytes?: number  // drives the storage usage bar

// ActionButtons
fileCount: number
combinedSizeBytes: number
isLoading: boolean
onMerge: () => void
onConvert: () => void
```

### api.ts return types
```typescript
mergePdfs(files: File[]): Promise<Blob>
convertToImages(file: File): Promise<{ blob: Blob; type: 'png' | 'zip' }>
```
`convertToImages` returns `type: 'png'` for single-page PDFs (backend returns `image/png`) and `type: 'zip'` for multi-page (backend returns `application/zip`).

### Scroll
Locomotive Scroll initialized in `useEffect` with cleanup. Instance exposed on `window.__locomotiveScroll` so `Navbar.tsx` can call `loco.scrollTo(target, { offset: 0 })` for accurate section navigation. Falls back to `window.scrollTo` on mobile.

### Custom cursor
Pure RAF loop in `CustomCursor.tsx` — no React state, no Framer Motion. Dot tracks exactly, ring lerps at 18% per frame. Disabled on touch devices.

---

## Validation Order (backend)

Both routes run validation cheapest-first to fail fast:

```
1. Files present check
2. Minimum file count (merge: ≥2)
3. Maximum file count (merge: ≤8)
4. Per-file size check (stream seek, no content read)
5. Combined size check
6. MIME type check (python-magic, reads 2048 bytes)
7. Magic bytes check (%PDF- header)
8. Page count check (pikepdf page tree only — EARLY, before heavy ops)
9. Encryption check (pikepdf open attempt)
10. Uncompressed size / bomb protection (pikepdf stream read)
```

---

## Deployment (Vercel + Render)

### Backend → Render
1. Add `gunicorn==23.0.0` to `requirements.txt` (already done)
2. Create `pdf-app/backend/build.sh`:
   ```bash
   #!/usr/bin/env bash
   apt-get install -y poppler-utils
   pip install -r requirements.txt
   ```
3. Render settings:
   - Root directory: `pdf-app/backend`
   - Build command: `./build.sh`
   - Start command: `gunicorn app:app`
4. Update CORS in `app.py` to include your Vercel URL
5. Free tier spins down after 15 min inactivity (~30s cold start)

### Frontend → Vercel
1. In `api.ts`, change `BASE_URL` to use env var:
   ```typescript
   const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
   ```
2. Create `pdf-app/frontend/.env.production`:
   ```
   VITE_API_URL=https://your-render-url.onrender.com
   ```
3. Vercel settings:
   - Root directory: `pdf-app/frontend`
   - Framework: Vite
   - Build command: `npm run build`
   - Output: `dist`
   - Add env var: `VITE_API_URL=https://your-render-url.onrender.com`

---

## Poppler (required for image conversion)

pdf2image wraps Poppler's `pdftoppm` binary. Must be installed separately.

- **Windows**: Download from https://github.com/oschwartz10612/poppler-windows/releases, extract, add `bin/` to PATH
- **macOS**: `brew install poppler`
- **Linux/Render**: `apt-get install -y poppler-utils`

Verify: `pdftoppm -v` in a new terminal. Restart Flask after installing.

The `/health` endpoint reports Poppler availability: `GET http://localhost:5000/health`

---

## Git Commit History (key milestones)

```
chore: initialize project structure and scaffold
feat(backend): add Flask app with CORS config and route stubs
feat(backend): add sanitizer with idempotency property tests
feat(backend): add validator with example-based and property tests
feat(backend): add processor (merge + convert) with property tests
test(backend): add integration tests for /merge and /to-images routes
feat(frontend): scaffold Vite+React+TS, Tailwind, Vitest, shared types
feat(frontend): add api.ts, downloadBlob.ts with unit tests
feat(frontend): add UI components with tests
feat(frontend): wire App component with state, API calls, Locomotive Scroll
fix(backend): surface Poppler error clearly, add /health endpoint
feat(frontend): hero+tool combined, features/how-it-works sections, file count+storage bar
feat(frontend): add Navbar and DownloadModal (custom filename before download)
fix(frontend): smooth cursor (pure RAF), centered pill nav, scroll offset fix
feat: rename to MergeSnap, update hero title, convert button label
feat: smart convert — single-page PDF returns PNG directly, multi-page returns ZIP
security(backend): add pikepdf, flask-limiter, update config limits
security(backend): magic bytes, file count limit, bomb protection, encryption check
security(backend): strip JS/metadata on merge, timeout protection
security(backend): IP rate limiting (10/min + 50/day) on upload endpoints
security(frontend): 50MB limit, 8-file count limit, privacy banner, clear state after download
security(backend): deep recursive JS stripping, early page count check, daily rate cap
```

---

## Test Coverage Summary

| Suite | Count | Notes |
|---|---|---|
| Backend unit (validator) | 16 | Example-based, covers all validation functions |
| Backend property (validator) | 8 | Hypothesis — MIME rejection, size limits, page count |
| Backend property (processor) | 5 | Hypothesis — merge page count/order, convert naming |
| Backend integration (routes) | 14 | Flask test client — merge, convert, CORS, error cases |
| Frontend unit (api) | 7 | Mocked fetch — blob return, error handling |
| Frontend unit (UploadZone) | 6 | File type, size, count validation |
| Frontend unit (FileList) | 7 | Render, remove, size display |
| Frontend unit (ActionButtons) | 12 | Disabled states, button callbacks |

Tests requiring Poppler are marked `@requires_poppler` and skipped automatically when Poppler is not in PATH.
