"""Supervisor regressions use real gated subprocesses and synthetic files."""
import concurrent.futures
import io
import json
import os
from pathlib import Path
import sys
import threading
import time

import pypdf
import pytest


def pdf_bytes(width=612):
    writer = pypdf.PdfWriter(); writer.add_blank_page(width=width, height=792)
    output = io.BytesIO(); writer.write(output); return output.getvalue()


def wait_for(path):
    deadline = time.monotonic() + 5
    while not path.exists():
        if time.monotonic() >= deadline: pytest.fail("worker did not start")
        time.sleep(.01)


@pytest.fixture
def supervisor(tmp_path):
    from jobs import JobRunner
    root = tmp_path / "jobs"; root.mkdir()
    return JobRunner(max_jobs=1, timeout=5, temp_root=root)


def synthetic_command(runner, tmp_path, monkeypatch, mode):
    pidfile = tmp_path / "worker.pid"
    script = tmp_path / "synthetic.py"
    script.write_text(f'''
import json, os, pathlib, sys, time
job = pathlib.Path(sys.argv[1])
if sys.stdin.buffer.readline() != b"start\\n": raise SystemExit(8)
pathlib.Path({str(pidfile)!r}).write_text(str(os.getpid()))
mode = {mode!r}
if mode == "hang": time.sleep(30)
if mode == "crash": os._exit(7)
if mode == "error":
    (job / "result.json").write_text(json.dumps({{"status":400,"error":"Synthetic processing error"}}))
else:
    (job / "output.bin").write_bytes(b"synthetic-output")
    (job / "result.json").write_text(json.dumps({{"status":200,"mimetype":"application/pdf"}}))
''')
    monkeypatch.setattr(runner, "_command", lambda job: [sys.executable, str(script), str(job)])
    return pidfile


def test_timeout_reaps_worker_cleans_directory_and_releases_slot(supervisor, tmp_path, monkeypatch):
    from jobs import JobTimeout
    pidfile = synthetic_command(supervisor, tmp_path, monkeypatch, "hang")
    supervisor.timeout = .3
    with pytest.raises(JobTimeout): supervisor.run("merge", [(pdf_bytes(), "a.pdf")])
    pid = int(pidfile.read_text())
    with pytest.raises(ProcessLookupError): os.kill(pid, 0)
    assert list(supervisor.temp_root.iterdir()) == []
    synthetic_command(supervisor, tmp_path, monkeypatch, "success")
    assert supervisor.run("merge", [(b"x", "a.pdf")])[0].read() == b"synthetic-output"


@pytest.mark.parametrize("mode,status", [("error", 400), ("crash", 500)])
def test_failure_propagates_and_releases_resources(supervisor, tmp_path, monkeypatch, mode, status):
    from jobs import JobError
    pidfile = synthetic_command(supervisor, tmp_path, monkeypatch, mode)
    with pytest.raises(JobError) as error: supervisor.run("merge", [(b"x", "a.pdf")])
    assert error.value.status == status
    if mode == "error": assert str(error.value) == "Synthetic processing error"
    with pytest.raises(ProcessLookupError): os.kill(int(pidfile.read_text()), 0)
    assert list(supervisor.temp_root.iterdir()) == []
    synthetic_command(supervisor, tmp_path, monkeypatch, "success")
    assert supervisor.run("merge", [(b"x", "a.pdf")])[1] == "application/pdf"


def test_overload_is_immediate_and_cancellation_releases_capacity(supervisor, tmp_path, monkeypatch):
    from jobs import JobCancelled, JobOverloaded
    pidfile = synthetic_command(supervisor, tmp_path, monkeypatch, "hang")
    cancel = threading.Event()
    with concurrent.futures.ThreadPoolExecutor(1) as pool:
        first = pool.submit(supervisor.run, "merge", [(b"x", "a.pdf")], cancel_event=cancel)
        wait_for(pidfile)
        started = time.monotonic()
        with pytest.raises(JobOverloaded): supervisor.run("merge", [(b"x", "b.pdf")])
        assert time.monotonic() - started < .5
        cancel.set()
        with pytest.raises(JobCancelled): first.result(timeout=5)
    with pytest.raises(ProcessLookupError): os.kill(int(pidfile.read_text()), 0)
    assert list(supervisor.temp_root.iterdir()) == []
    synthetic_command(supervisor, tmp_path, monkeypatch, "success")
    supervisor.run("merge", [(b"x", "a.pdf")])


def test_python_interruption_still_closes_worker_and_files(supervisor, tmp_path, monkeypatch):
    pidfile = synthetic_command(supervisor, tmp_path, monkeypatch, "hang")
    class Interrupt:
        def is_set(self):
            if pidfile.exists(): raise KeyboardInterrupt()
            return False
    with pytest.raises(KeyboardInterrupt):
        supervisor.run("merge", [(b"x", "a.pdf")], cancel_event=Interrupt())
    with pytest.raises(ProcessLookupError): os.kill(int(pidfile.read_text()), 0)
    assert list(supervisor.temp_root.iterdir()) == []


def test_normal_worker_merge_preserves_file_order_and_cleans(supervisor):
    result, mime = supervisor.run("merge", [(pdf_bytes(100), "first.pdf"), (pdf_bytes(200), "second.pdf")])
    with result:
        assert mime == "application/pdf"
        assert [int(p.mediabox.width) for p in pypdf.PdfReader(result).pages] == [100, 200]
    assert list(supervisor.temp_root.iterdir()) == []


@pytest.mark.parametrize("fmt,magic,mime", [("png", b"\x89PNG", "image/png"), ("jpg", b"\xff\xd8", "image/jpeg")])
def test_normal_worker_image_conversion(supervisor, fmt, magic, mime):
    result, actual = supervisor.run("convert", [(pdf_bytes(), "image.pdf")], fmt=fmt)
    with result: assert result.read().startswith(magic)
    assert actual == mime; assert list(supervisor.temp_root.iterdir()) == []


def test_malformed_pdf_rejected_inside_worker(supervisor):
    from jobs import JobError
    with pytest.raises(JobError) as error:
        supervisor.run("merge", [(b"%PDF-1.4\nbroken", "broken.pdf"), (pdf_bytes(), "ok.pdf")])
    assert error.value.status == 400
    assert list(supervisor.temp_root.iterdir()) == []


def test_small_compressed_pdf_is_scanned_in_worker(supervisor, monkeypatch):
    import pikepdf
    from jobs import JobError
    document = pikepdf.Pdf.new(); document.add_blank_page()
    document.Root.Payload = document.make_stream(b"A" * 200_000)
    output = io.BytesIO(); document.save(output, compress_streams=True); document.close()
    assert len(output.getvalue()) < 5 * 1024 * 1024
    supervisor.expansion_limit = 100_000
    with pytest.raises(JobError) as error:
        supervisor.run("merge", [(output.getvalue(), "small.pdf"), (pdf_bytes(), "ok.pdf")])
    assert error.value.status == 400
    assert list(supervisor.temp_root.iterdir()) == []


def test_huge_page_in_small_pdf_rejected_before_render(supervisor):
    from jobs import JobError
    with pytest.raises(JobError) as error:
        supervisor.run('convert', [(pdf_bytes(50_000), 'huge.pdf')])
    assert error.value.status == 400
    assert 'pixel budget' in str(error.value)
    assert list(supervisor.temp_root.iterdir()) == []


@pytest.mark.skipif(os.name != 'posix', reason='POSIX resource limit probe')
def test_cpu_limit_stops_spinning_worker_and_releases_slot(supervisor, tmp_path, monkeypatch):
    from jobs import JobError
    pidfile = tmp_path / 'cpu.pid'
    script = tmp_path / 'cpu.py'
    backend = str(Path(__file__).resolve().parents[1])
    script.write_text(f'''
import json, os, pathlib, sys
if sys.stdin.buffer.readline() != b"start\\n": raise SystemExit(8)
sys.path.insert(0, {backend!r})
from worker import apply_limits
request = json.loads((pathlib.Path(sys.argv[1]) / 'request.json').read_text())
apply_limits(request)
pathlib.Path({str(pidfile)!r}).write_text(str(os.getpid()))
while True: pass
''')
    monkeypatch.setattr(supervisor, '_command', lambda job: [sys.executable, str(script), str(job)])
    supervisor.cpu_seconds = 1
    with pytest.raises(JobError) as error:
        supervisor.run('merge', [(b'x', 'a.pdf')])
    assert error.value.status == 500  # resource death is not a wall timeout
    with pytest.raises(ProcessLookupError): os.kill(int(pidfile.read_text()), 0)
    assert list(supervisor.temp_root.iterdir()) == []
    synthetic_command(supervisor, tmp_path, monkeypatch, 'success')
    assert supervisor.run('merge', [(b'x', 'a.pdf')])[1] == 'application/pdf'


def test_poppler_fallback_preserves_jpeg_zip(monkeypatch):
    import shutil
    import fitz
    import zipfile
    from processor import convert_to_images
    if shutil.which('pdftoppm') is None:
        pytest.skip('Poppler unavailable')
    def unavailable(*args, **kwargs): raise RuntimeError('synthetic primary failure')
    monkeypatch.setattr(fitz, 'open', unavailable)
    writer = pypdf.PdfWriter()
    for _ in range(2): writer.add_blank_page(width=120, height=120)
    data = io.BytesIO(); writer.write(data)
    output, mime = convert_to_images(data.getvalue(), fmt='jpg')
    with output, zipfile.ZipFile(output) as archive:
        assert mime == 'application/zip'
        assert archive.namelist() == ['page_1.jpg', 'page_2.jpg']
        assert all(archive.read(name).startswith(b'\xff\xd8') for name in archive.namelist())


def test_start_failure_cleans_files_and_releases_slot(supervisor, tmp_path, monkeypatch):
    with monkeypatch.context() as patch:
        patch.setattr(supervisor, '_command', lambda job: [str(tmp_path / 'missing-worker')])
        with pytest.raises(OSError): supervisor.run('merge', [(pdf_bytes(), 'a.pdf')])
    assert list(supervisor.temp_root.iterdir()) == []
    result, mime = supervisor.run('merge', [(pdf_bytes(), 'a.pdf'), (pdf_bytes(), 'b.pdf')])
    result.close()
    assert mime == 'application/pdf'


def test_staging_failure_cleans_files_and_releases_slot(supervisor, monkeypatch):
    original = Path.write_bytes
    def write(path, content):
        if path.name == 'input-1.pdf': raise OSError('synthetic disk full')
        return original(path, content)
    with monkeypatch.context() as patch:
        patch.setattr(Path, 'write_bytes', write)
        with pytest.raises(OSError, match='synthetic disk full'):
            supervisor.run('merge', [(pdf_bytes(), 'a.pdf'), (pdf_bytes(), 'b.pdf')])
    assert list(supervisor.temp_root.iterdir()) == []
    result, _ = supervisor.run('merge', [(pdf_bytes(), 'a.pdf'), (pdf_bytes(), 'b.pdf')])
    result.close()
