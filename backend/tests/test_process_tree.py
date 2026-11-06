"""Process containment uses real, benign workers; no PDF dependency is needed."""

import importlib
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

import pytest


LEADER = r'''
import pathlib, subprocess, sys, time
root = pathlib.Path(sys.argv[1])
if sys.stdin.buffer.readline() != b"start\n":
    raise SystemExit(8)
(root / "released").write_text("yes")
child = r"""
import os, pathlib, signal, subprocess, sys, time
root = pathlib.Path(sys.argv[1])
signal.signal(signal.SIGTERM, signal.SIG_IGN)
(root / "child.pid").write_text(str(os.getpid()))
grandchild = r"import os,pathlib,signal,sys,time; p=pathlib.Path(sys.argv[1]); signal.signal(signal.SIGTERM, signal.SIG_IGN); (p/'grandchild.pid').write_text(str(os.getpid())); time.sleep(1.0); (p/'late-grandchild').write_text('survived'); time.sleep(30)"
subprocess.Popen([sys.executable, "-c", grandchild, str(root)])
while not (root / "grandchild.pid").exists():
    time.sleep(.01)
(root / "ready").write_text("yes")
time.sleep(1.0)
(root / "late-child").write_text("survived")
time.sleep(30)
"""
subprocess.Popen([sys.executable, "-c", child, str(root)])
while not (root / "ready").exists():
    time.sleep(.01)
if sys.argv[2] == "success":
    raise SystemExit(0)
if sys.argv[2] == "crash":
    raise SystemExit(9)
time.sleep(30)
'''


def wait_until(predicate, timeout=5):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(.01)
    pytest.fail("worker did not reach expected state")


def running(pid):
    # A zombie has already stopped executing, but this container's PID 1 may
    # leave orphan zombies unreaped. They cannot write files or spawn children.
    stat = Path(f"/proc/{pid}/stat")
    if sys.platform.startswith("linux"):
        try:
            return stat.read_text().split(")", 1)[1].split()[0] != "Z"
        except FileNotFoundError:
            return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    return True


@pytest.fixture
def launch(tmp_path):
    module = importlib.import_module("process_tree")
    workers = []
    with (tmp_path / "stderr.log").open("wb") as stderr:
        def create(mode="wait"):
            worker = module.ManagedProcess(
                [sys.executable, "-c", LEADER, str(tmp_path), mode],
                cwd=tmp_path,
                stderr=stderr,
            )
            workers.append(worker)
            return worker
        yield create
        for worker in workers:
            try:
                worker.close()
            finally:
                # Prevent a broken implementation from leaking test workers.
                if os.name == "posix" and worker.process.pid != os.getpgrp():
                    try:
                        os.killpg(worker.process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                if worker.process.poll() is None:
                    worker.process.kill()
                worker.process.wait(timeout=5)


def assert_tree_stopped(tmp_path):
    pids = [int((tmp_path / name).read_text())
            for name in ("child.pid", "grandchild.pid")]
    wait_until(lambda: all(not running(pid) for pid in pids))
    time.sleep(1.1)
    assert not (tmp_path / "late-child").exists()
    assert not (tmp_path / "late-grandchild").exists()


def test_worker_is_gated_until_explicit_release(launch, tmp_path):
    worker = launch()
    time.sleep(.1)
    assert worker.process.poll() is None
    assert not (tmp_path / "released").exists()
    assert not (tmp_path / "child.pid").exists()
    if os.name == "posix":
        assert os.getpgid(worker.process.pid) == worker.process.pid
        assert os.getpgid(worker.process.pid) != os.getpgrp()
    worker.release()
    wait_until(lambda: (tmp_path / "ready").exists())
    assert worker.process.stdin.closed
    worker.close()
    assert worker.process.poll() is not None
    assert_tree_stopped(tmp_path)


def test_timeout_close_kills_term_resistant_children_and_is_idempotent(launch, tmp_path):
    worker = launch()
    worker.release()
    wait_until(lambda: (tmp_path / "ready").exists())
    with pytest.raises(subprocess.TimeoutExpired):
        worker.process.wait(timeout=.02)
    started = time.monotonic()
    worker.close()
    worker.close()
    assert time.monotonic() - started < 3
    assert worker.process.poll() is not None
    assert_tree_stopped(tmp_path)


@pytest.mark.parametrize("mode,exitcode", [("success", 0), ("crash", 9)])
def test_cleanup_reaches_descendants_after_leader_has_exited(launch, tmp_path, mode, exitcode):
    worker = launch(mode)
    worker.release()
    assert worker.process.wait(timeout=5) == exitcode
    worker.close()
    assert_tree_stopped(tmp_path)


def test_cancel_before_release_never_runs_worker(launch, tmp_path):
    worker = launch()
    worker.close()
    worker.close()
    assert worker.process.poll() is not None
    assert worker.process.stdin.closed
    assert not (tmp_path / "released").exists()
    with pytest.raises(RuntimeError):
        worker.release()


def test_release_error_terminates_and_reaps_worker(launch):
    worker = launch()
    worker.process.stdin.close()
    with pytest.raises((ValueError, OSError)):
        worker.release()
    assert worker.process.poll() is not None


@pytest.mark.skipif(os.name != "posix", reason="POSIX group signaling")
def test_incomplete_group_kill_remains_retryable(launch, tmp_path, monkeypatch):
    worker = launch()
    worker.release()
    wait_until(lambda: (tmp_path / 'ready').exists())
    original = os.killpg
    failure = OSError('synthetic group kill failure')
    calls = 0
    def fail_kill_twice(group, sig):
        nonlocal calls
        if sig == signal.SIGKILL:
            calls += 1
            if calls <= 2: raise failure
        return original(group, sig)
    with monkeypatch.context() as patch:
        patch.setattr(os, 'killpg', fail_kill_twice)
        with pytest.raises(OSError) as error: worker.close()
        assert error.value is failure
        assert calls == 2, 'cleanup retries are bounded'
        assert worker._closed is False
        assert worker.process.returncode is not None
    worker.close()
    assert worker._closed
    assert_tree_stopped(tmp_path)


@pytest.mark.skipif(os.name != "posix", reason="POSIX group signaling")
def test_wait_failure_retry_does_not_signal_completed_group_again(launch, monkeypatch):
    worker = launch()
    worker.release()
    original_wait = worker.process.wait
    failure = OSError('synthetic wait failure')
    with monkeypatch.context() as patch:
        def fail_wait(*args, **kwargs): raise failure
        patch.setattr(worker.process, 'wait', fail_wait)
        with pytest.raises(OSError) as error: worker.close()
        assert error.value is failure
        assert worker._closed is False
        assert worker._tree_stopped is True
    def no_group_signal(*args): pytest.fail('completed numeric group must not be signalled again')
    with monkeypatch.context() as patch:
        patch.setattr(os, 'killpg', no_group_signal)
        worker.close()
    assert worker._closed
    assert original_wait(timeout=2) is not None


@pytest.mark.parametrize('boundary', ['terminate', 'close'])
def test_windows_job_control_flow_defers_interruption_and_closes_handle(boundary):
    # API simulation only. This does not execute Win32 or prove native handles,
    # nested jobs or descendant completion behavior on Windows.
    from types import SimpleNamespace
    from process_tree import _WindowsJob
    job = _WindowsJob.__new__(_WindowsJob)
    job._handle = 123
    calls = []
    interruption = KeyboardInterrupt('synthetic Windows interruption')
    raised = False
    def native_call(name, handle):
        nonlocal raised
        assert handle == 123 and job._handle == 123
        calls.append(name)
        if name == boundary and not raised:
            raised = True
            raise interruption
        return 1
    job._api = SimpleNamespace(
        TerminateJobObject=lambda handle, status: native_call('terminate', handle),
        CloseHandle=lambda handle: native_call('close', handle),
    )
    with pytest.raises(KeyboardInterrupt) as error: job.close()
    assert error.value is interruption
    assert job._handle is None
    assert calls.count(boundary) == 2
    before = list(calls)
    job.close()
    assert calls == before


def test_windows_failed_close_keeps_handle_for_bounded_retry():
    from types import SimpleNamespace
    from process_tree import _WindowsJob
    job = _WindowsJob.__new__(_WindowsJob)
    job._handle = 123
    closes = 0
    def close_handle(handle):
        nonlocal closes
        closes += 1
        return int(closes > 2)
    job._api = SimpleNamespace(TerminateJobObject=lambda *args: 1, CloseHandle=close_handle)
    job._ctypes = SimpleNamespace(WinError=lambda code: OSError(code, 'synthetic close error'), get_last_error=lambda: 5)
    with pytest.raises(OSError): job.close()
    assert closes == 2 and job._handle == 123
    job.close()
    assert job._handle is None and closes == 3


def test_windows_termination_failure_still_attempts_kill_on_close_fallback():
    from types import SimpleNamespace
    from process_tree import _WindowsJob
    job = _WindowsJob.__new__(_WindowsJob)
    job._handle = 123
    calls = []
    def terminate(*args):
        calls.append('terminate')
        return 0
    def close(handle):
        calls.append('close')
        return 1
    job._api = SimpleNamespace(TerminateJobObject=terminate, CloseHandle=close)
    job._ctypes = SimpleNamespace(WinError=lambda code: OSError(code, 'synthetic terminate error'), get_last_error=lambda: 5)
    with pytest.raises(OSError): job.close()
    assert calls == ['terminate', 'terminate', 'close']
    assert job._handle is None


@pytest.mark.skipif(os.name != 'posix', reason='POSIX process groups')
def test_missing_group_at_term_is_not_signalled_again(tmp_path, monkeypatch):
    from process_tree import ManagedProcess
    worker = ManagedProcess([sys.executable, '-c', "import sys; sys.stdin.buffer.readline()"], tmp_path, subprocess.DEVNULL)
    worker.release()
    worker.process.wait(timeout=5)
    original = os.killpg
    signals = []
    def capture(group, sig):
        signals.append(sig)
        return original(group, sig)
    with monkeypatch.context() as patch:
        patch.setattr(os, 'killpg', capture)
        worker.close()
    assert signals == [signal.SIGTERM]
    assert worker._closed


def test_windows_successful_close_then_sigint_does_not_reuse_native_handle():
    from types import SimpleNamespace
    from process_tree import _WindowsJob
    job = _WindowsJob.__new__(_WindowsJob)
    job._handle = 123
    closed = False
    calls = []
    interruption = KeyboardInterrupt('SIGINT after successful native close')
    def sigint_handler(signum, frame): raise interruption
    def terminate(*args):
        assert not closed, 'never terminate using a released/reusable numeric handle'
        calls.append('terminate')
        return 1
    def close(handle):
        nonlocal closed
        assert not closed, 'never close a released/reusable numeric handle twice'
        closed = True
        calls.append('close')
        signal.raise_signal(signal.SIGINT)
        return 1
    job._api = SimpleNamespace(TerminateJobObject=terminate, CloseHandle=close)
    previous = signal.signal(signal.SIGINT, sigint_handler)
    try:
        with pytest.raises(KeyboardInterrupt) as error: job.close()
        assert error.value is interruption
        assert job._handle is None
        job.close()
        assert calls == ['terminate', 'close']
    finally:
        signal.signal(signal.SIGINT, previous)
