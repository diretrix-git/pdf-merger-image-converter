# Isolated PDF jobs: Phase 3 plan

Base main: `074f19784906ecbe5d8e91b285892f8011c84e4a` (the supplied baseline prefix resolves to this full commit). Reviewed Phase 1 and Phase 2 documentation PR #2, head `ea6b945e4e70b9234a7472adb3827925ac530834`, before implementation. That documentation branch is unchanged.

## Design

Keep Flask routes, multipart fields, limits, file order, MIME/download names, primary PyMuPDF rendering and Poppler fallback. Admit at most one job per WSGI process by default, without a waiting queue; excess upload requests receive JSON 503 and Retry-After. Acquire before multipart parsing. All PDF parsing, page/expansion inspection and rendering occur inside a fresh subprocess, not the request process. Each job has a private temporary directory and a bounded output file; return the existing in-memory response after worker exit and cleanup.

Use a gated subprocess: POSIX gets a separate session/process group; Windows gets a native kill-on-close Job Object before the worker is released. Always terminate the process tree and reap the direct child, including success/crash cases with surviving descendants. The supervisor polls a wall deadline/cancellation event and cleans up in finally. Optional POSIX address-space/CPU/file limits apply before PDF imports; they are per-process limits, not aggregate RSS/container guarantees. Windows memory/CPU budgets require external containment; unsupported requested limits fail closed. No new processing library is needed.

The existing best-effort decompressed-stream scan moves inside isolation and applies to small inputs too. It still allocates a stream before measuring it and cannot be advertised as a complete PDF-bomb defense. Add conservative render-pixel and output caps. WSGI does not reliably report browser disconnects during computation; cancellation means an explicit supervisor event or Python interruption. Abrupt supervisor/host death and hostile escape from POSIX groups require external OS/container controls.

## Tasks

1. Record backend/frontend baseline results. Write failing process/job tests proving termination, slot release, error propagation and temporary cleanup.
2. Implement the process-tree helper, supervisor and worker protocol. Move expensive validation behind the boundary; preserve normal PDF results and frontend contracts.
3. Add synthetic-PDF route regressions for order, PNG/JPG/ZIP, malformed inputs, small compressed streams, timeout/crash and overload; retain the existing suite.
4. Run backend/frontend tests, supported type/lint/build checks, dependency/license checks and a fresh review. Distinguish baseline failures and platform verification gaps.
5. Update README/rollout/validation notes and exact-branch deployment suppression. Commit on `fix/phase3-isolated-pdf-workers-2026-11-06`, open a separate draft PR, and stop without merging/deploying or editing PR #2/portfolio.

## Independent-review corrections

Repair the reproduced lifecycle failure at `38182e24`: defer the first cleanup exception, make bounded attempts at group termination and direct-worker reaping, retain incomplete state for retry, and never signal an already-completed group again during a later partial-cleanup retry. Preserve POSIX cleanup after leader exit. Keep Windows job handles until successful close and attempt kill-on-close fallback even after termination errors; validate control flow with simulated APIs without claiming native platform validation.

Tighten the private result protocol: string MIME appropriate for merge or requested conversion format (plus ZIP), nonempty regular output, existing size/metadata bounds, controlled malformed-result errors. Keep public successful responses unchanged. First run permanent signal/protocol regressions against `38182e24`, then rerun after repair, full checks and targeted probes. Update rollout/validation evidence, obtain a fresh review, and append a commit to the existing PR branch without merging or deploying.
