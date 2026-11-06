# MergeSnap

A React and Flask PDF utility. Merge PDF files in their selected file order, or convert a PDF to PNG/JPG images. Uploads are sent to the configured Flask API. Processing is server-side; running both services locally keeps those uploads on that machine.

## Workflows

- Merge 2–8 PDFs; drag to reorder whole files on desktop/mobile. Individual-page rearrangement is not implemented.
- Convert at 72 DPI to PNG or JPG (`jpeg` is accepted by the API). One page returns an image; multiple pages return an ordered ZIP.
- Choose the download filename in the frontend.

## Processing and privacy

Each admitted request uses a disposable Python subprocess. On completion/error/timeout/cancellation, the supervisor makes bounded attempts to terminate its POSIX process group or Windows Job Object, reap the direct child and remove the private job directory. Interrupted/partial cleanup remains retryable; the first interruption propagates after best-effort cleanup. Persistent OS failures can leave resources and are not a successful response. Inputs, protocol files, renderer intermediates and output may temporarily exist on disk. Multipart parsing can also spool uploads outside that directory. Response bytes stay in the API process until the response closes.

This is lifecycle isolation, not a hostile-file sandbox, secure erasure, or a hosting-level retention guarantee. A browser disconnect does not reliably interrupt WSGI computation: work can continue until completion or the configured deadline. Abrupt API/host termination can bypass Python cleanup. See [rollout and limitations](docs/phase3-rollout.md) before exposing the API publicly.

## Stack and prerequisites

Backend: Python 3.11+, Flask, pikepdf, PyMuPDF; pdf2image/Poppler fallback. Frontend: React, TypeScript, Vite, Tailwind. Pinned dependencies remain unchanged in this repair; process supervision uses the Python standard library.

Install `libmagic` for MIME inspection (Linux: `libmagic1`; macOS: `brew install libmagic`; Windows needs a compatible libmagic installation). Poppler is optional for the primary renderer, required for fallback:

| OS | Poppler installation |
|---|---|
| Linux | `sudo apt install poppler-utils libmagic1` |
| macOS | `brew install poppler libmagic` |
| Windows | See [Poppler Windows builds](https://github.com/oschwartz10612/poppler-windows/releases); add `Library\bin` to PATH |

Linux/Python 3.12 was exercised locally. Windows containment is implemented but has not been runtime-verified; macOS and the Python 3.11 Docker image also require platform validation.

## Local setup

From the repository root:

```bash
cd backend
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask --app app run --port 5000
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. `VITE_API_URL` defaults to `http://localhost:5000`; a hosted frontend must point it at the intended API. CORS currently allows localhost:5173 and the existing Vercel frontend origin. CORS is not authentication or server-side access control.

## API and limits

| Endpoint | Request | Successful response |
|---|---|---|
| `POST /merge` | Multipart `files` (2–8 PDFs), in order | `application/pdf`, `merged.pdf` |
| `POST /to-images` | Multipart `file`, optional `format=png\|jpg\|jpeg` | `page.png` / `page.jpg`, or `application/zip`, `pages.zip` |
| `GET /health` | None | API status and Poppler availability; does not execute a PDF job |

Validation errors use JSON `{"error":"..."}` with HTTP 400; oversized bodies use 413, IP rate limits 429, processing timeout 504, worker crash/resource death 500. Capacity exhaustion returns 503 with `Retry-After: 1`, without an application waiting queue. Retry is manual, not automatic. A transport or proxy can still queue requests before Flask handles them.

| Policy | Default |
|---|---|
| Per input / entire request body | 50 MiB / 50 MiB (multipart overhead counts toward body limit) |
| Merge file count / conversion page count | 8 / 15 |
| Conversion DPI | 72 |
| Decoded-stream scan per input | 100 MiB; best effort, including inputs below 5 MiB |
| Render budget | 20 million pixels per page, 40 million across pages |
| Upload IP limit | 10/minute and 50/day; in-memory per API process |
| `PDF_MAX_JOBS` | 1 per API process; no application queue |
| `PDF_TIMEOUT_SECONDS` | 60 seconds from job staging through worker exit; termination/reaping adds cleanup time |
| `PDF_WORKER_MEMORY_MB` | POSIX 512 MiB of virtual address space per process; Windows 0 (external controls required) |
| `PDF_WORKER_CPU_SECONDS` | POSIX 30 CPU seconds per process; Windows 0 |
| `PDF_MAX_OUTPUT_BYTES` | 100 MiB returned output; POSIX also applies this as a per-file worker size limit |

Resource settings of 0 disable the corresponding optional memory/CPU limit. A nonzero memory/CPU setting on Windows is rejected at startup, because this implementation does not enforce those budgets there. Environment configuration is read at API startup. Per-process resource limits do not cap aggregate process-tree memory, all temporary disk usage, the parent API, or request/response buffers.

MIME/magic-byte checks, encrypted-PDF checks, conversion page limits and decoded-stream inspection remain. Deep inspection and processing run in the worker. The stream scan allocates before measuring and can skip unsupported filters, so it is not comprehensive decompression-bomb protection. The new pixel/output budgets deliberately reject oversized work which formerly could exhaust resources. Merging retains the existing selected action-key and metadata removal; no complete PDF sanitization guarantee is made.

## Validation

```bash
cd backend
python -m pytest tests/ -q
python -m compileall -q .
python -m pip check
# Frontend, from repository root:
cd ../frontend
npx vitest run
npx tsc -b --pretty false
npm run build
npm run lint
```

Backend tests generate synthetic documents and exercise process termination, descendant cleanup, timeout, cancellation, crash, concurrency, overload, validation and normal response formats. Some existing renderer tests skip without Poppler. The new forced-fallback test also skips when Poppler is unavailable. The backend has no configured static type checker, linter, or application bundle build; byte-compilation is a syntax check, not a substitute for those tools.

Actual results, baseline lint failures and platform gaps are in [Phase 3 validation](docs/phase3-validation.md). These are local checks, not deployment success.

## Rollout and licensing

The backend Docker command uses one API worker with four threads, so an occupied PDF slot can coexist with overload/health requests. It sets a 75-second graceful shutdown allowance for the default 60-second job deadline. Changing deadlines requires reviewing server/proxy/container shutdown settings together. Configure shared rate limiting before relying on an installation-wide IP quota across multiple API processes.

This implementation branch suppresses Vercel Git deployments for its exact branch name in root, frontend and backend configuration files. It does not alter production branch behavior or hosting settings. No deployment is part of this change. Follow [the rollout checklist](docs/phase3-rollout.md) after review and approval, including dependency-license review. In particular, the existing PyMuPDF package is dual AGPL/commercial licensed. No repository-wide license grant has been added.
