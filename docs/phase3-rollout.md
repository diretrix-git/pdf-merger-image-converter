# Phase 3 rollout and resource boundaries

## Review boundary

Implementation branch: `fix/phase3-isolated-pdf-workers-2026-11-06`, based on main `074f19784906ecbe5d8e91b285892f8011c84e4a`. Phase 1's thread-timeout, small-compressed-file and privacy findings were reviewed first. Phase 2 documentation PR [#2](https://github.com/diretrix-git/pdf-merger-image-converter/pull/2), head `ea6b945e4e70b9234a7472adb3827925ac530834`, remains a separate unchanged proposal. The implementation README reflects the new source; reconcile overlapping README edits if both proposals are later approved. No schema/database/data migration is needed.

## Lifecycle

1. Acquire a nonblocking process-local admission slot before accessing Flask multipart files/form. Default capacity is one. Excess handled requests get JSON 503 and `Retry-After: 1`. No in-application queue or automatic retry is introduced.
2. Preserve cheap file-count/size/MIME/magic checks and input order. Create a private temporary directory and controlled input filenames; do not derive filesystem paths from upload filenames.
3. Start a one-shot Python worker at a stdin gate. POSIX creates a new session/group; Windows assigns a non-inheritable kill-on-close Job Object before releasing that gate. Containment failure aborts the job.
4. Apply POSIX address-space/CPU/file/core limits before native PDF imports, then deep-validate all inputs, including compressed inputs below 5 MiB. Convert only after page/pixel checks; preserve PNG/JPG/ZIP and merge outputs.
5. Monitor the wall deadline and an optional explicit cancellation event. Cleanup makes bounded attempts (two per operation) at POSIX group TERM, 0.2-second grace and KILL, plus pipe closure and direct-worker kill/wait. It records the first failure and propagates it after best-effort cleanup. The KILL fallback covers interruption at TERM as well as during grace/KILL, including after leader exit. An absent group is completed teardown; completed group stages are never signalled again. Incomplete stages remain retryable instead of setting `_closed` early. Windows attempts Job Object termination and kill-on-close, then waits for the direct process. Neither OS path proves instantaneous descendant exit after a native termination call.
6. Accept bounded dictionary metadata with an integer status and a string error for failure responses. Successful output must be a nonempty regular, non-symlink file within the output budget. Merge permits only application/pdf; conversion permits its requested PNG/JPEG MIME or application/zip. Attempt tree termination and reap the direct worker before reading response bytes. Remove job files before returning the stream; release admission even on errors. Flask/Werkzeug closes request upload streams; the response closes the returned BytesIO. A failed send_file setup closes that buffer too.

If an interruption is already propagating from this job, final worker/directory cleanup attempts preserve it and attach exception notes for additional cleanup failures. A cleanup failure on an otherwise successful job still raises an error. The implementation captures this job's exception explicitly; an already-handled exception in its caller cannot hide cleanup failure. If OS operations continue failing, cleanup can remain incomplete and external lifecycle controls are required. Job-directory cleanup does not securely erase data, and a failed deletion can leave files.

The supervisor deadline starts at staging after upload parsing and cheap checks, not at network acceptance. Normal process startup and staging count against it. Reaping/termination and file deletion add time after the deadline. A CPU-limit death maps to JSON 500, a supervisor wall timeout to 504. Existing frontend error handling surfaces both and capacity 503 without auto-resubmission.

## What is and is not contained

| Area | Implemented boundary | Remaining prerequisite/limitation |
|---|---|---|
| POSIX process tree | Session/group TERM then KILL, even after leader exit; direct child waited | A descendant intentionally calling setsid/setpgid can escape. No seccomp, user namespace, privilege drop or network/filesystem sandbox is added. Use restricted OS/container execution. |
| Windows tree | Job Object assignment before stdin gate, bounded terminate/close attempts; retain failed handles for retry. A callable main-thread SIGINT handler is briefly deferred during CloseHandle plus ownership update, then restored/dispatched, preventing a successful close being replayed on a reusable numeric handle. | Control flow has simulated-API tests only. Native Windows is unverified. Waiting for the leader does not establish all descendants have completed asynchronous termination before directory removal. Validate nested jobs, close failures, pending I/O, native handles and descendant completion before enabling Windows. |
| Wall time / cancellation | Supervisor polling, explicit event, finally cleanup | WSGI generally cannot detect browser disconnect during processing. A disconnected job remains bounded by its normal deadline. There is no new HTTP cancellation endpoint. |
| Abrupt parent/host death | Windows Job Object handle close offers OS-assisted kill; ordinary Python unwind attempts cleanup | SIGKILL/OOM/host loss does not run finally. POSIX children/job directories may remain. Use container-wide kill on service exit and a safe startup/expiry sweep for abandoned temporary files, coordinated across workers. No sweeper is implemented here. |
| CPU / memory | POSIX RLIMIT_CPU, RLIMIT_AS inherited by descendants; core dumps disabled | Per-process virtual-address-space and CPU budgets, not aggregate RSS/tree budgets. CPU accounting is not wall time. OS/native allocator differences require validation. Windows budgets are external; zero disables them. |
| Disk / output | Private job directory, temp environment inherited by Poppler, 100 MiB output check; POSIX RLIMIT_FSIZE per file | No aggregate directory quota or secure erasure. Multipart spooling occurs outside this directory. Proxy logs/swap/backups/host retention remain outside application control. Use a restricted quota-managed ephemeral volume. |
| Decompression | Scan all inputs, per-input decoded-stream budget | A full stream can allocate before being measured; unsupported filters may be skipped. Parser overhead, embedded image decode and all PDF graph cases are not bounded by this scan. |
| Rendering | Conservative declared MediaBox/CropBox/UserUnit budget, 20M/page, 40M/total | This changes acceptance for extreme page geometry; it is not a memory proof. Native renderer complexity and existing intra-worker page rendering threads still require process/container budgets. |
| Concurrency | Semaphore per API process, held through upload validation and job cleanup | Multiply capacity by Gunicorn processes/replicas. Ingress/WSGI/thread queues and response buffers are outside the semaphore. Slow uploads can hold slots before the job deadline; configure ingress body/read timeouts and connection limits. |

## Production prerequisites, after approval

- Validate on the actual target OS, architecture and Python build. This session exercised Linux/Python 3.12.14, not native Windows/macOS or a Docker build of the Python 3.11 image.
- Use a host which supports subprocesses and process groups/Job Objects. Do not assume a generic serverless Flask deployment can enforce this lifecycle.
- Run under a restricted service user in a container/service group which kills all members on exit, with an init/reaper for orphan descendants. Apply aggregate memory, CPU, PID/connection and ephemeral-disk quotas externally; measure peak RSS/disk/latency with synthetic representative workloads before tuning.
- Provide a writable private temporary location. Confirm request-spool and renderer-temp behavior; establish a host retention policy and orphan cleanup without deleting another live job's directory.
- Keep a responsive WSGI configuration. The Docker command uses 1 worker / 4 threads; capacity defaults to 1. Multiple sync workers alone do not make capacity global, and a sole sync worker queues overload before Flask. Bound ingress queues, uploads and slow-client time; validate real 503/504 JSON propagation through the proxy.
- With defaults, allow at least the 60-second worker window plus upload/staging/cleanup time during graceful shutdown. Docker uses 75-second Gunicorn grace and 180-second worker timeout; the outer host must also allow orderly shutdown. If `PDF_TIMEOUT_SECONDS` is increased, adjust server, proxy and host limits together. These settings were not deployed here.
- Review all configurable budgets with representative synthetic files; exercise timeout, worker kill, server shutdown and subsequent healthy requests. Verify files/processes do not accumulate and alert on crash/timeout/overload counts without logging PDF content or credentials.
- Use a shared rate-limit store before making an installation-wide quota claim across processes/replicas; this change preserves in-memory limiting. CORS remains unchanged and is not authorization. Avoid exposing an unauthenticated PDF processor without ingress abuse controls.
- Review dependency vulnerabilities and licensing before release. This change deliberately does not upgrade existing packages. No production files, keys, credentials or customer data were used.
- Vercel guards at root/frontend/backend disable Git deployments only for `fix/phase3-isolated-pdf-workers-2026-11-06`. Other branches retain Vercel defaults. These do not disable manual CLI deploys or other hosts; inspect any external auto-deploy integration before publication. No hosting settings were changed here.
- After approval, deploy the API through the normal controlled process, smoke-test merge order, single PNG/JPG and multipage ZIP with synthetic PDFs, then verify the existing frontend against it. No frontend API migration is required. Do not claim rollout success from local test passes.
- Rollback requires an explicit decision: reverting reintroduces the unkillable daemon-thread timeout. Temporarily disabling processing at ingress is safer than unknowingly restoring that behavior under overload.

## Dependencies and ownership

No new processing package or manifest/lockfile changes were introduced; the supervisor uses stdlib subprocess/threading/tempfile/resource and ctypes on Windows. Installed pinned distribution metadata/license files were checked:

| Existing dependency | Version | Observed license |
|---|---|---|
| PyMuPDF | 1.25.5 | Dual GNU AGPL 3.0 / Artifex commercial |
| pikepdf | 9.4.2 | MPL-2.0 |
| pypdf | 5.4.0 | BSD-style license, bundled LICENSE retains its conditions |
| pdf2image | 1.17.0 | MIT |
| Pillow | 11.2.1 | MIT-CMU |

Preserve upstream attribution and notices. Review PyMuPDF's AGPL/commercial terms for the intended network service/distribution model; this work does not establish license compliance or obtain commercial rights. Poppler is an existing external fallback/system dependency; review the precise OS package, linked codecs and its notices in the eventual deployment image. The repository has no root LICENSE in the inspected baseline, and this PR adds no ownership or license grant. Existing frontend art/assets and third-party notices remain unchanged and require their own publication rights.

Primary references: [Python resource limits](https://docs.python.org/3.11/library/resource.html), [Python subprocess](https://docs.python.org/3.11/library/subprocess.html), [Windows Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects), [PyMuPDF license](https://pymupdf.readthedocs.io/en/latest/about.html#license), [Vercel exact-branch configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled).
