"""Bounded request admission and disposable subprocess supervision."""
from contextlib import contextmanager
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import time

from process_tree import ManagedProcess
from config import MAX_UNCOMPRESSED_SIZE_BYTES, PROCESSING_TIMEOUT_SECONDS


class JobError(Exception):
    status = 500
    def __init__(self, message, status=None):
        super().__init__(message)
        if status is not None: self.status = status


class JobTimeout(JobError):
    status = 504


class JobCancelled(JobError):
    status = 503


class JobOverloaded(JobError):
    status = 503


def _integer(name, default, minimum=0):
    value = int(os.environ.get(name, default))
    if value < minimum: raise ValueError(f"{name} must be >= {minimum}")
    return value


def _cleanup_preserving_interrupt(operation, label, pending):
    try:
        operation()
    except BaseException as error:
        if pending is None or isinstance(pending, Exception):
            raise
        # Preserve an active KeyboardInterrupt/SystemExit while recording that
        # additional cleanup failed. On normal/error returns cleanup failures
        # still propagate; they are never converted to a successful response.
        pending.add_note(f"Additional {label} failed ({type(error).__name__}); cleanup may be incomplete.")


@contextmanager
def _job_directory(root):
    directory = tempfile.TemporaryDirectory(prefix="mergesnap-job-", dir=root)
    pending = None
    try:
        yield directory.name
    except BaseException as error:
        pending = error
        raise
    finally:
        _cleanup_preserving_interrupt(directory.cleanup, "job directory cleanup", pending)


class JobRunner:
    def __init__(self, max_jobs=None, timeout=None, temp_root=None):
        self.max_jobs = max_jobs if max_jobs is not None else _integer("PDF_MAX_JOBS", 1, 1)
        self.timeout = timeout if timeout is not None else _integer("PDF_TIMEOUT_SECONDS", PROCESSING_TIMEOUT_SECONDS, 1)
        if self.max_jobs < 1 or self.timeout <= 0: raise ValueError("Invalid job limits")
        self.temp_root = Path(temp_root) if temp_root is not None else None
        self.memory_mb = _integer("PDF_WORKER_MEMORY_MB", 512 if os.name == "posix" else 0)
        self.cpu_seconds = _integer("PDF_WORKER_CPU_SECONDS", 30 if os.name == "posix" else 0)
        if os.name != "posix" and (self.memory_mb or self.cpu_seconds):
            raise ValueError("POSIX resource limits unavailable; use external Windows resource containment")
        self.output_limit = _integer("PDF_MAX_OUTPUT_BYTES", 100 * 1024 * 1024, 1)
        self.expansion_limit = MAX_UNCOMPRESSED_SIZE_BYTES
        self._slots = threading.BoundedSemaphore(self.max_jobs)

    @contextmanager
    def admission(self):
        if not self._slots.acquire(blocking=False):
            raise JobOverloaded("PDF processing is busy. Please retry shortly.")
        active = True
        def execute(*args, **kwargs):
            if not active: raise RuntimeError("Job admission has ended")
            return self._execute(*args, **kwargs)
        try: yield execute
        finally:
            active = False
            self._slots.release()

    def run(self, *args, **kwargs):
        with self.admission() as execute: return execute(*args, **kwargs)

    def _command(self, directory):
        return [sys.executable, str(Path(__file__).with_name("worker.py")), str(directory)]

    def _execute(self, operation, inputs, fmt="png", dpi=72, cancel_event=None):
        if operation not in {"merge", "convert"}: raise ValueError("Unknown PDF operation")
        deadline = time.monotonic() + self.timeout
        with _job_directory(self.temp_root) as name:
            directory = Path(name)
            entries = []
            for index, (data, filename) in enumerate(inputs):
                path = f"input-{index}.pdf"
                (directory / path).write_bytes(data)
                entries.append({"path": path, "name": filename})
            (directory / "request.json").write_text(json.dumps({
                "operation": operation, "inputs": entries, "format": fmt, "dpi": dpi,
                "memory_mb": self.memory_mb, "cpu_seconds": self.cpu_seconds,
                "output_limit": self.output_limit, "expansion_limit": self.expansion_limit,
            }), encoding="utf-8")
            worker = None
            pending = None
            try:
                if cancel_event is not None and cancel_event.is_set():
                    raise JobCancelled("PDF processing was cancelled.")
                with open(os.devnull, "wb") as stderr:
                    worker = ManagedProcess(self._command(directory), cwd=directory, stderr=stderr)
                    worker.release()
                    while worker.process.poll() is None:
                        if cancel_event is not None and cancel_event.is_set():
                            raise JobCancelled("PDF processing was cancelled.")
                        if time.monotonic() >= deadline:
                            raise JobTimeout(f"PDF processing timed out after {self.timeout:g} seconds.")
                        time.sleep(.02)
                    if time.monotonic() >= deadline:
                        raise JobTimeout(f"PDF processing timed out after {self.timeout:g} seconds.")
                    # Reap/terminate descendants before trusting output or deleting files.
                    worker.close()
                    if worker.process.returncode != 0:
                        raise JobError("PDF worker stopped unexpectedly or exceeded a resource limit.")
                    metadata = directory / "result.json"
                    if not metadata.is_file() or metadata.is_symlink() or metadata.stat().st_size > 8192:
                        raise JobError("PDF worker returned an invalid result.")
                    try: result = json.loads(metadata.read_text(encoding="utf-8"))
                    except (ValueError, OSError) as error: raise JobError("PDF worker returned an invalid result.") from error
                    if not isinstance(result, dict):
                        raise JobError("PDF worker returned an invalid result.")
                    status = result.get("status")
                    if type(status) is not int or status not in (200, 400, 422, 500):
                        raise JobError("PDF worker returned an invalid result.")
                    if status != 200:
                        message = result.get("error")
                        if not isinstance(message, str):
                            raise JobError("PDF worker returned an invalid result.")
                        raise JobError(message, status)
                    output = directory / "output.bin"
                    mime = result.get("mimetype")
                    allowed_mimes = {"application/pdf"} if operation == "merge" else {
                        "application/zip", "image/jpeg" if fmt in ("jpg", "jpeg") else "image/png",
                    }
                    if not isinstance(mime, str) or mime not in allowed_mimes or not output.is_file() or output.is_symlink():
                        raise JobError("PDF worker returned an invalid result.")
                    size = output.stat().st_size
                    if size == 0:
                        raise JobError("PDF worker returned an invalid result.")
                    if size > self.output_limit:
                        raise JobError("PDF output exceeds the configured size limit.", 400)
                    return io.BytesIO(output.read_bytes()), mime
            except BaseException as error:
                pending = error
                raise
            finally:
                if worker is not None:
                    _cleanup_preserving_interrupt(worker.close, "worker cleanup", pending)


runner = JobRunner()
