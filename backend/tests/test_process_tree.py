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
