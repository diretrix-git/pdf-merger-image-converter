"""Contain cooperating, stdin-gated workers and clean up their process trees.

The command must read ``start\n`` from stdin before importing parsers or
creating children. This gate lets Windows attach the worker to its Job Object
before any work starts. POSIX containment covers descendants that retain the
worker's process group; this is lifecycle isolation, not a security sandbox.
"""

import os
import signal
import subprocess
import threading
import time


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
        if self._handle is not None:
            handle, self._handle = self._handle, None
            # Kill explicitly and also retain kill-on-close as a fallback.
            self._api.TerminateJobObject(handle, 1)
            if not self._api.CloseHandle(handle):
                raise self._ctypes.WinError(self._ctypes.get_last_error())


class ManagedProcess:
    """Start a contained worker; release it only after containment succeeds."""

    def __init__(self, command, cwd, stderr):
        self.process = None
        self._job = None
        self._closed = False
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
        """Stop the tree even if its leader exited, and reap the leader."""
        with self._lock:
            if self._closed:
                return
            self._closed = True
            process = self.process
            try:
                if process is not None:
                    if os.name == "posix":
                        try:
                            os.killpg(process.pid, signal.SIGTERM)
                        except ProcessLookupError:
                            pass
                        else:
                            # Waiting for only the leader would skip the grace
                            # period when it has exited but children remain.
                            try:
                                time.sleep(0.2)
                            finally:
                                # An interruption during grace must still kill
                                # descendants, not just the direct child.
                                try:
                                    os.killpg(process.pid, signal.SIGKILL)
                                except ProcessLookupError:
                                    pass
            finally:
                try:
                    if self._job is not None:
                        self._job.close()
                finally:
                    if process is not None:
                        try:
                            if process.stdin is not None:
                                try:
                                    process.stdin.close()
                                except (OSError, ValueError):
                                    pass
                            if process.poll() is None:
                                process.kill()
                            process.wait(timeout=2)
                        finally:
                            # CPython's Windows Popen otherwise retains this
                            # native process handle until garbage collection.
                            if os.name == "nt" and process.returncode is not None:
                                process._handle.Close()
