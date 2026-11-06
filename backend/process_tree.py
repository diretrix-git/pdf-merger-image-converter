"""Contain cooperating, stdin-gated workers and clean up their process trees.

The command must read ``start\n`` from stdin before importing parsers or
creating children. This gate lets Windows attach the worker to its Job Object
before any work starts. POSIX containment covers descendants that retain the
worker's process group; this is lifecycle isolation, not a security sandbox.
"""

from contextlib import contextmanager
import os
import signal
import subprocess
import threading
import time


class _Cleanup:
    """Bounded best effort which defers the first failure until cleanup ends."""

    def __init__(self):
        self.error = None

    def attempt(self, operation):
        # In particular, a one-shot SIGINT at a native call boundary must not
        # prevent the TERM/KILL fallback or reaping. Persistent errors stay
        # retryable by the caller; never spin forever on repeated interrupts.
        for _ in range(2):
            try:
                operation()
                return True
            except BaseException as error:
                if self.error is None:
                    self.error = error
        return False

    def propagate(self):
        if self.error is not None:
            raise self.error


@contextmanager
def _defer_handle_close_sigint():
    """Update Windows handle ownership before dispatching a pending SIGINT.

    Python signal handlers run only in the main thread. Do not replay a native
    CloseHandle merely because SIGINT arrived after its irreversible side effect.
    This small critical section does not cover SIGKILL, host loss or native hangs.
    """
    handler = signal.getsignal(signal.SIGINT)
    if threading.current_thread() is not threading.main_thread() or not callable(handler):
        yield
        return
    pending = []
    signal.signal(signal.SIGINT, lambda number, frame: pending.append((number, frame)))
    try:
        yield
    finally:
        signal.signal(signal.SIGINT, handler)
        if pending:
            handler(*pending[0])


class _WindowsJob:
    """Own a non-inheritable, kill-on-close Windows Job Object."""

    def __init__(self):
        import ctypes
        from ctypes import wintypes

        class BasicLimits(ctypes.Structure):
            _fields_ = [
                ("PerProcessUserTimeLimit", ctypes.c_int64),
                ("PerJobUserTimeLimit", ctypes.c_int64),
                ("LimitFlags", wintypes.DWORD),
                ("MinimumWorkingSetSize", ctypes.c_size_t),
                ("MaximumWorkingSetSize", ctypes.c_size_t),
                ("ActiveProcessLimit", wintypes.DWORD),
                ("Affinity", ctypes.c_size_t),
                ("PriorityClass", wintypes.DWORD),
                ("SchedulingClass", wintypes.DWORD),
            ]

        class IoCounters(ctypes.Structure):
            _fields_ = [(name, ctypes.c_uint64) for name in (
                "ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
                "ReadTransferCount", "WriteTransferCount", "OtherTransferCount",
            )]

        class ExtendedLimits(ctypes.Structure):
            _fields_ = [
                ("BasicLimitInformation", BasicLimits),
                ("IoInfo", IoCounters),
                ("ProcessMemoryLimit", ctypes.c_size_t),
                ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t),
                ("PeakJobMemoryUsed", ctypes.c_size_t),
            ]

        self._ctypes = ctypes
        self._api = ctypes.WinDLL("kernel32", use_last_error=True)
        self._api.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
        self._api.CreateJobObjectW.restype = wintypes.HANDLE
        self._api.SetInformationJobObject.argtypes = [
            wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD,
        ]
        self._api.SetInformationJobObject.restype = wintypes.BOOL
        self._api.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
        self._api.AssignProcessToJobObject.restype = wintypes.BOOL
        self._api.TerminateJobObject.argtypes = [wintypes.HANDLE, wintypes.UINT]
        self._api.TerminateJobObject.restype = wintypes.BOOL
        self._api.CloseHandle.argtypes = [wintypes.HANDLE]
        self._api.CloseHandle.restype = wintypes.BOOL
        self._handle = self._api.CreateJobObjectW(None, None)
        if not self._handle:
            raise ctypes.WinError(ctypes.get_last_error())
        limits = ExtendedLimits()
        limits.BasicLimitInformation.LimitFlags = 0x00002000  # KILL_ON_JOB_CLOSE
        if not self._api.SetInformationJobObject(
            self._handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)
        ):
            error = ctypes.WinError(ctypes.get_last_error())
            self.close()
            raise error

    def assign(self, process):
        if not self._api.AssignProcessToJobObject(self._handle, int(process._handle)):
            raise self._ctypes.WinError(self._ctypes.get_last_error())

    def close(self):
        if self._handle is None:
            return
        cleanup = _Cleanup()
        handle = self._handle

        def terminate():
            if not self._api.TerminateJobObject(handle, 1):
                raise self._ctypes.WinError(self._ctypes.get_last_error())

        def close_handle():
            if self._handle is None:
                return
            with _defer_handle_close_sigint():
                if not self._api.CloseHandle(handle):
                    raise self._ctypes.WinError(self._ctypes.get_last_error())
                # Retain failed handles, but never replay a successful native
                # close after Python dispatches a deferred SIGINT.
                self._handle = None

        try:
            cleanup.attempt(terminate)
        finally:
            cleanup.attempt(close_handle)
        cleanup.propagate()


class ManagedProcess:
    """Start a contained worker; release it only after containment succeeds."""

    def __init__(self, command, cwd, stderr):
        self.process = None
        self._job = None
        self._closed = False
        self._tree_stopped = False
        self._released = False
        self._lock = threading.RLock()
        if os.name not in ("posix", "nt"):
            raise RuntimeError("Worker process containment is unavailable")
        try:
            if os.name == "nt":
                self._job = _WindowsJob()
            self.process = subprocess.Popen(
                command,
                cwd=cwd,
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=stderr,
                close_fds=True,
                start_new_session=os.name == "posix",
            )
            if self._job is not None:
                # The worker remains at its stdin gate until assignment succeeds.
                # Unsupported/nonnestable jobs fail closed, never uncontained.
                self._job.assign(self.process)
        except BaseException:
            try:
                self.close()
            except Exception:
                pass
            raise

    def release(self):
        with self._lock:
            if self._closed or self._released:
                raise RuntimeError("Worker is closed or already released")
            try:
                self.process.stdin.write(b"start\n")
                self.process.stdin.flush()
                self.process.stdin.close()
                self._released = True
            except BaseException:
                try:
                    self.close()
                except Exception:
                    pass
                raise

    def close(self):
        """Attempt tree termination/reaping, then propagate the first failure.

        Completed stages are retained across retries. This is bounded best
        effort, not protection against SIGKILL, host loss or persistent OS errors.
        """
        with self._lock:
            if self._closed:
                return
            cleanup = _Cleanup()
            process = self.process
            stdin_closed = process is None or process.stdin is None
            reaped = process is None
            handle_closed = os.name != "nt" or process is None
            term_sent = False

            def group_signal(sig):
                nonlocal term_sent
                try:
                    os.killpg(process.pid, sig)
                    if sig == signal.SIGTERM:
                        term_sent = True
                except ProcessLookupError:
                    # The numeric PGID can be reused once its group disappears.
                    # Treat absence as completed teardown, never signal it again.
                    self._tree_stopped = True

            def close_stdin():
                try:
                    process.stdin.close()
                except (OSError, ValueError):
                    # A broken release pipe may already be closed.
                    if not process.stdin.closed:
                        raise

            def kill_leader():
                if process.poll() is None:
                    try:
                        process.kill()
                    except ProcessLookupError:
                        pass

            try:
                if process is not None and os.name == "posix" and not self._tree_stopped:
                    cleanup.attempt(lambda: group_signal(signal.SIGTERM))
                    if term_sent:
                        cleanup.attempt(lambda: time.sleep(0.2))
            finally:
                # This fallback covers TERM as well as grace-period failures.
                # Keep it independent of leader exit; descendants can outlive it.
                if not self._tree_stopped:
                    if os.name == "posix" and process is not None:
                        self._tree_stopped = cleanup.attempt(lambda: group_signal(signal.SIGKILL))
                    elif self._job is not None:
                        self._tree_stopped = cleanup.attempt(self._job.close)
                    else:
                        self._tree_stopped = True
                # Once group teardown succeeds, never signal that numeric PGID
                # again just because a later pipe/wait/handle operation failed.
                if process is not None:
                    if process.stdin is not None:
                        stdin_closed = cleanup.attempt(close_stdin)
                    cleanup.attempt(kill_leader)
                    reaped = cleanup.attempt(lambda: process.wait(timeout=2))
                    if os.name == "nt" and reaped:
                        handle_closed = cleanup.attempt(process._handle.Close)
                self._closed = self._tree_stopped and stdin_closed and reaped and handle_closed
            cleanup.propagate()
