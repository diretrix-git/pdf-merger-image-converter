"""Review reproductions: real signals/processes, synthetic PDFs and protocols."""
import ctypes
import io
import json
import os
from pathlib import Path
import signal
import sys
import time

import pytest

from jobs import JobError, JobRunner
import process_tree
from test_jobs import pdf_bytes


@pytest.fixture
def runner(tmp_path):
    root = tmp_path / 'jobs'
    root.mkdir()
    return JobRunner(max_jobs=1, timeout=5, temp_root=root)


@pytest.fixture
def subreaper():
    if not sys.platform.startswith('linux'):
        pytest.skip('Linux process/PID/reaping probe; other OSes unverified')
    # Restore process-global state and reap our adopted descendants ourselves.
    libc = ctypes.CDLL(None, use_errno=True)
    previous = ctypes.c_int()
    assert libc.prctl(37, ctypes.byref(previous), 0, 0, 0) == 0
    assert libc.prctl(36, 1, 0, 0, 0) == 0
    try:
        yield
    finally:
        assert libc.prctl(36, previous.value, 0, 0, 0) == 0


def wait_for(predicate, timeout=5):
    deadline = time.monotonic() + timeout
    while not predicate():
        assert time.monotonic() < deadline, 'synthetic worker did not reach expected state'
        time.sleep(.01)


def stopped(pid):
    try:
        return Path(f'/proc/{pid}/stat').read_text().split(')', 1)[1].split()[0] == 'Z'
    except FileNotFoundError:
        return True


@pytest.mark.parametrize('boundary', [signal.SIGTERM, getattr(signal, 'SIGKILL', 9)])
@pytest.mark.parametrize('leader_exits', [False, True], ids=['running-leader', 'exited-leader'])
def test_jobrunner_sigint_terminates_descendants_and_preserves_interruption(
    runner, tmp_path, monkeypatch, subreaper, boundary, leader_exits,
):
    marker = tmp_path / 'child.pid'
    script = tmp_path / 'signal_worker.py'
    child_code = "import os,pathlib,signal,sys,time; signal.signal(signal.SIGTERM,signal.SIG_IGN); pathlib.Path(sys.argv[1]).write_text(str(os.getpid())); time.sleep(30)"
    script.write_text(f'''
import json, pathlib, signal, subprocess, sys, time
assert sys.stdin.buffer.readline() == b'start\\n'
job = pathlib.Path(sys.argv[1])
signal.signal(signal.SIGTERM, signal.SIG_IGN)
subprocess.Popen([sys.executable, '-c', {child_code!r}, {str(marker)!r}])
while not pathlib.Path({str(marker)!r}).exists(): time.sleep(.01)
(job/'output.bin').write_bytes(b'%PDF-synthetic-result')
(job/'result.json').write_text(json.dumps({{'status':200,'mimetype':'application/pdf'}}))
if not {leader_exits!r}: time.sleep(30)
''')
    monkeypatch.setattr(runner, '_command', lambda job: [sys.executable, str(script), str(job)])
    workers = []
    original_constructor = process_tree.ManagedProcess
    def capture(*args, **kwargs):
        worker = original_constructor(*args, **kwargs)
        workers.append(worker)
        return worker
    import jobs
    monkeypatch.setattr(jobs, 'ManagedProcess', capture)
    original_killpg = os.killpg
    injected = False
    interruption = None
    def interrupt_once(group, sig):
        nonlocal injected, interruption
        if sig == boundary and not injected:
            injected = True
            try:
                signal.raise_signal(signal.SIGINT)
            except KeyboardInterrupt as error:
                interruption = error
                raise
        return original_killpg(group, sig)
    monkeypatch.setattr(os, 'killpg', interrupt_once)
    class CancelAfterChildStarts:
        def is_set(self):
            return marker.exists() if not leader_exits else False
    child = None
    try:
        with pytest.raises(KeyboardInterrupt) as raised:
            runner.run('merge', [(pdf_bytes(), 'synthetic.pdf')], cancel_event=CancelAfterChildStarts())
        assert injected
        assert raised.value is interruption, 'propagate the original interruption'
        child = int(marker.read_text())
        worker = workers[0]
        assert worker.process.returncode is not None
        assert not Path(f'/proc/{worker.process.pid}').exists(), 'direct worker must be reaped'
        # SIGKILL delivery is asynchronous; observe actual cessation with a
        # bounded PID check rather than assuming killpg's return proves exit.
        wait_for(lambda: stopped(child), timeout=2)
        assert list(runner.temp_root.iterdir()) == []
        with monkeypatch.context() as patch:
            patch.setattr(runner, '_command', lambda job: JobRunner._command(runner, job))
            output, mime = runner.run('merge', [(pdf_bytes(100), 'a.pdf'), (pdf_bytes(200), 'b.pdf')])
            output.close()
            assert mime == 'application/pdf', 'slot must be reusable for a real job'
    finally:
        # A failing regression must never leave synthetic processes behind.
        for worker in workers:
            try: original_killpg(worker.process.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            worker.process.wait(timeout=5)
        if marker.exists():
            child = int(marker.read_text())
            try: os.waitpid(child, 0)
            except ChildProcessError: pass


@pytest.mark.parametrize('operation,fmt,mime,payload', [
    ('merge', 'png', [], b'pdf'),
    ('merge', 'png', 'image/jpeg', b'jpeg'),
    ('merge', 'png', 'application/pdf', b''),
    ('convert', 'png', 'image/jpeg', b'jpeg'),
    ('convert', 'jpg', 'image/png', b'png'),
    ('convert', 'png', 'application/pdf', b'pdf'),
])
def test_invalid_worker_results_are_controlled_and_release_resources(
    runner, tmp_path, monkeypatch, operation, fmt, mime, payload,
):
    script = tmp_path / 'invalid_result.py'
    script.write_text(f'''
import json, pathlib, sys
assert sys.stdin.buffer.readline() == b'start\\n'
job=pathlib.Path(sys.argv[1])
(job/'output.bin').write_bytes({payload!r})
(job/'result.json').write_text(json.dumps({{'status':200,'mimetype':{mime!r}}}))
''')
    with monkeypatch.context() as patch:
        patch.setattr(runner, '_command', lambda job: [sys.executable, str(script), str(job)])
        with pytest.raises(JobError) as error:
            runner.run(operation, [(pdf_bytes(), 'synthetic.pdf')], fmt=fmt)
        assert error.value.status == 500
    assert list(runner.temp_root.iterdir()) == []
    output, mime = runner.run('merge', [(pdf_bytes(), 'a.pdf'), (pdf_bytes(), 'b.pdf')])
    output.close()
    assert mime == 'application/pdf'


@pytest.mark.parametrize('mode,status', [
    ('invalid-json', 500), ('invalid-utf8', 500), ('large-metadata', 500),
    ('list-metadata', 500), ('float-status', 500), ('missing-status', 500),
    ('nonstring-error', 500), ('missing-output', 500), ('symlink-output', 500),
    ('directory-output', 500), ('large-output', 400),
])
def test_malformed_protocol_is_json_error_with_reaped_worker_and_reusable_slot(
    runner, tmp_path, monkeypatch, mode, status,
):
    import app as api
    from test_worker_routes import post_merge
    marker = tmp_path / 'protocol.pid'
    script = tmp_path / 'malformed_worker.py'
    script.write_text(f'''
import json, os, pathlib, sys
assert sys.stdin.buffer.readline() == b'start\\n'
pathlib.Path({str(marker)!r}).write_text(str(os.getpid()))
job=pathlib.Path(sys.argv[1]); mode={mode!r}
output=job/'output.bin'
output.write_bytes(b'%PDF-synthetic-output')
result={{'status':200,'mimetype':'application/pdf'}}
if mode=='list-metadata': result=[]
if mode=='float-status': result['status']=200.0
if mode=='missing-status': del result['status']
if mode=='nonstring-error': result={{'status':400,'error':[]}}
if mode=='missing-output': output.unlink()
if mode=='symlink-output':
    output.unlink(); output.symlink_to(job/'input-0.pdf')
if mode=='directory-output':
    output.unlink(); output.mkdir()
if mode=='large-output': output.write_bytes(b'x'*129)
metadata=job/'result.json'
metadata.write_text(json.dumps(result))
if mode=='invalid-json': metadata.write_text('{{')
if mode=='invalid-utf8': metadata.write_bytes(b'\\xff')
if mode=='large-metadata': metadata.write_text('x'*8193)
''')
    monkeypatch.setattr(runner, '_command', lambda job: [sys.executable, str(script), str(job)])
    monkeypatch.setattr(api, 'runner', runner)
    monkeypatch.setattr(api.limiter, 'enabled', False)
    runner.output_limit = 128
    response = post_merge()
    try:
        assert response.status_code == status
        assert isinstance(response.get_json()['error'], str)
    finally:
        response.close()
    if os.name == 'posix':
        with pytest.raises(ProcessLookupError): os.kill(int(marker.read_text()), 0)
    assert list(runner.temp_root.iterdir()) == []
    with runner.admission(): pass


def test_final_cleanup_failure_does_not_replace_active_interruption(runner, monkeypatch):
    import jobs
    original = KeyboardInterrupt('original interruption')
    class PartialWorker:
        def __init__(self, *args, **kwargs): self.closes = 0
        def release(self): raise original
        def close(self):
            self.closes += 1
            raise OSError('persistent synthetic cleanup failure')
    worker = PartialWorker()
    monkeypatch.setattr(jobs, 'ManagedProcess', lambda *args, **kwargs: worker)
    with pytest.raises(KeyboardInterrupt) as error:
        runner.run('merge', [(pdf_bytes(), 'synthetic.pdf')])
    assert error.value is original
    assert worker.closes == 1
    assert any('cleanup' in note.lower() for note in original.__notes__)
    assert list(runner.temp_root.iterdir()) == []
    with runner.admission(): pass


def test_directory_cleanup_failure_preserves_interruption_and_releases_slot(runner, monkeypatch):
    import jobs
    original = KeyboardInterrupt('original staging interruption')
    real_directory = jobs.tempfile.TemporaryDirectory
    class FailingCleanup:
        def __init__(self, *args, **kwargs):
            self.resource = real_directory(*args, **kwargs)
            self.name = self.resource.name
        def cleanup(self):
            self.resource.cleanup()
            raise OSError('synthetic directory cleanup failure')
        def __enter__(self): return self.name
        def __exit__(self, *args): self.cleanup()
    class InterruptBeforeStart:
        def is_set(self): raise original
    monkeypatch.setattr(jobs.tempfile, 'TemporaryDirectory', FailingCleanup)
    with pytest.raises(KeyboardInterrupt) as error:
        runner.run('merge', [(pdf_bytes(), 'synthetic.pdf')], cancel_event=InterruptBeforeStart())
    assert error.value is original
    assert any('directory' in note.lower() for note in original.__notes__)
    assert list(runner.temp_root.iterdir()) == []
    with runner.admission(): pass


def test_enclosing_caught_interrupt_cannot_hide_this_jobs_cleanup_failure(runner, monkeypatch):
    import jobs
    real_directory = jobs.tempfile.TemporaryDirectory
    class FailingCleanup:
        def __init__(self, *args, **kwargs):
            self.resource = real_directory(*args, **kwargs)
            self.name = self.resource.name
        def cleanup(self):
            self.resource.cleanup()
            raise OSError('synthetic directory cleanup failure')
    monkeypatch.setattr(jobs.tempfile, 'TemporaryDirectory', FailingCleanup)
    with pytest.raises(OSError, match='synthetic directory cleanup failure'):
        try:
            raise KeyboardInterrupt('already handled by caller')
        except KeyboardInterrupt:
            runner.run('merge', [(pdf_bytes(), 'a.pdf'), (pdf_bytes(), 'b.pdf')])
    assert list(runner.temp_root.iterdir()) == []
    with runner.admission(): pass
