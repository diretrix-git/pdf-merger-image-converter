# Phase 3 validation record

Local validation on 2026-11-06. Base main: `074f19784906ecbe5d8e91b285892f8011c84e4a`; implementation branch: `fix/phase3-isolated-pdf-workers-2026-11-06`. Results apply to the implementation/source tree containing this record. No deployment, production credentials or production PDFs were used.

## Environment and results

Linux x86_64, Python 3.12.14, Node 24.22.1, npm 11.9.0, Poppler 26.05.0. Backend pinned requirements and frontend lockfile installed without manifest changes. `npm ci --ignore-scripts` was used for this local installation. The Dockerfile targets Python 3.11; Docker was unavailable, so no image build is claimed.

| Directory | Command/check | Result |
|---|---|---|
| `backend` baseline | `python -m pytest tests/ --ignore=tests/test_process_tree.py -q` before supervisor changes | 51 passed, 5 PyMuPDF SWIG deprecation warnings |
| `backend` final | `python -m pytest tests/ -q` | **82 passed**, 5 existing PyMuPDF SWIG deprecation warnings; no skips with Poppler present |
| `backend` | `python -m compileall -q .` | Passed syntax/byte-compilation check |
| `backend` | `python -m pip check` | Passed: no broken installed requirements; not a security audit |
| `backend` | `gunicorn app:app --threads 4 --workers 1 --timeout 180 --graceful-timeout 75 --check-config` | Passed configuration/import check; not a deployed server test |
| `frontend` baseline | `npx vitest run` / `npm run build` | 37 tests passed / build passed |
| `frontend` final | `npx vitest run` | **41 passed** across 4 files |
| `frontend` | `npx tsc -b --pretty false` | Passed |
| `frontend` | `npm run build` | Passed TypeScript and optimized Vite build |
| `frontend` baseline and final | `npm run lint` | Exit 1, same **5 baseline errors**, identical diagnostics after normalizing checkout paths; no added errors |
| repository | `git diff --check` | Passed |
| repository | Exact-branch Vercel JSON and Docker CMD assertions | Passed; only implementation branch disabled, 4 WSGI threads, graceful allowance greater than default worker deadline |

The backend has no configured lint/typecheck/bundle-build command. `compileall` is not static typing or linting. Generated Python caches and frontend `dist` are ignored; no tracked backend build artifacts or bundles exist in the baseline. Existing PyMuPDF SWIG warnings, npm's environment `http-proxy` warning and Vite's stale Browserslist-data warning remain. Dependency upgrades/security advisory remediation were not included or falsely reported as completed.

## Baseline lint failures preserved

An independent detached checkout of the pinned main was linted using the same installed lockfile dependencies. Final diagnostics matched it exactly after path normalization:

- `frontend/src/App.tsx:54:17` and `:59:25`: `@typescript-eslint/no-explicit-any`.
- `frontend/src/components/CTASection.tsx:4:27`: `@typescript-eslint/no-explicit-any`.
- `frontend/src/components/Navbar.tsx:14:27`: `@typescript-eslint/no-explicit-any`.
- `frontend/src/components/DownloadModal.tsx:33:7`: `react-hooks/set-state-in-effect`.

No application frontend source was changed. Four new HTTP-client tests prove JSON 503/504 messages surface without automatic retry. These tests mock fetch; they do not prove browser downloads against a deployed proxy.

## Regression evidence

| Tests | Evidence and boundary |
|---|---|
| `tests/test_process_tree.py` (6) | Real gated subprocesses; explicit release; close before release; failed gate release; TERM-resistant child/grandchild killed; surviving descendants after normal/crashed leader exit stopped; idempotent close; no late marker writes. POSIX descendant checks consider a zombie non-running; the directly owned worker is reaped. Native Windows Job Object behavior is unverified. |
| `tests/test_jobs.py` (15) | Real supervisor/worker invocation, synthetic PDFs; timeout PID no longer exists; slot reuse; private directory emptied; worker crash and JSON error propagation; concurrent admission rejection; explicit cancellation and Python interruption cleanup; ordered merge; PNG/JPG; malformed PDF; small compressed stream rejected with lowered test budget; huge declared page rejected before rendering; actual POSIX CPU-spin limit termination; forced primary failure exercises real Poppler JPEG/ZIP fallback; process-start and mid-staging disk errors clean up and release capacity. |
| `tests/test_worker_routes.py` (10) | Real Flask request/response integration and disposable workers: merge order, download/MIME contract, PNG/JPG/jpeg alias and ordered ZIP entries; simulated gated hanging/crashing/error worker; JSON 504/500/400; concurrent second request gets 503 + Retry-After before malformed multipart parsing; capacity reusable; parent format-validation failure releases admission. |
| Existing backend suite (51) | Processor/validator/sanitizer properties and Flask routes retained. Whole suite passes with the new boundary. |
| `frontend/src/__tests__/api.test.ts` (+4) | Both APIs surface 503/504 JSON errors and perform exactly one fetch. Existing 37 frontend tests remain passing. |

A hanging/crashing worker is deterministic synthetic Python work, not a claim that every hostile PDF has been reproduced. All PDF fixtures are generated in tests. Test-only time/budget overrides are local runner attributes; no production feature flag or arbitrary worker command API was added.

Red/green history: new supervisor tests initially failed because `jobs` did not exist. Before route integration, worker timeout/crash/error/overload route regressions failed against the old routes (200 responses or worker-never-started). The worker validation protocol initially exposed a 500/400 status bug: Flask `abort(response)` can leave HTTPException.code unset, so response.status_code must be used. That was corrected before the final pass. The interruption test initially patched the shared `time` module and interrupted cleanup itself; it now raises interruption through the cancellation probe, without changing the cleanup clock. The cleanup code also retains unconditional group KILL in the grace-period finally path.

## Review and gaps

A separate read-only review inspected supervision, routes, processing and tests and reran the then-current 76-test suite successfully. It found no blocking ordinary-path defects, including no inherited-CropBox bypass in its synthetic geometry probe. Six additional startup/staging/resource/fallback/validation tests were subsequently run in the final 82-test suite by the implementer.

Not performed: native Windows/macOS validation, Docker image build, Python 3.11 run, real-browser end-to-end against the new API, production/proxy/load testing, secure-erasure verification, aggregate RSS/disk benchmarks, full dependency vulnerability or legal compliance audit. A local pass is not production readiness. Follow [rollout prerequisites and resource limits](phase3-rollout.md) before approval/release. No merges, hosting changes, deployments, visibility changes, edits to documentation PR #2, or portfolio changes form part of this implementation.
