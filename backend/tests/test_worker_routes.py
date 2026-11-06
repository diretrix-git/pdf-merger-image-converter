"""HTTP contract through real isolated workers; all documents are synthetic."""
import concurrent.futures
import io
import os
import zipfile

import pypdf
import pytest

import app as api
from jobs import JobRunner
from test_jobs import pdf_bytes, synthetic_command, wait_for


@pytest.fixture
def runner(tmp_path, monkeypatch):
    root = tmp_path / 'jobs'; root.mkdir()
    runner = JobRunner(max_jobs=1, timeout=5, temp_root=root)
    monkeypatch.setattr(api, 'runner', runner, raising=False)
    monkeypatch.setattr(api.limiter, 'enabled', False)
    return runner


def post_merge():
    with api.app.test_client() as client:
        return client.post('/merge', data={'files': [
            (io.BytesIO(pdf_bytes(100)), 'a.pdf'),
            (io.BytesIO(pdf_bytes(200)), 'b.pdf')]})


def test_real_route_preserves_merge_order_and_cleanup(runner):
    response = post_merge()
    assert response.status_code == 200
    assert response.mimetype == 'application/pdf'
    assert 'merged.pdf' in response.headers['Content-Disposition']
    assert [int(p.mediabox.width) for p in pypdf.PdfReader(io.BytesIO(response.data)).pages] == [100, 200]
    response.close()
    assert list(runner.temp_root.iterdir()) == []


@pytest.mark.parametrize('fmt,pages,mime', [('png', 1, 'image/png'), ('jpg', 1, 'image/jpeg'), ('jpeg', 2, 'application/zip'), ('png', 2, 'application/zip')])
def test_conversion_response_contract(runner, fmt, pages, mime):
    document = pypdf.PdfWriter()
    for _ in range(pages): document.add_blank_page(width=120, height=120)
    output = io.BytesIO(); document.write(output)
    with api.app.test_client() as client:
        response = client.post('/to-images', data={'file': (io.BytesIO(output.getvalue()), 'image.pdf'), 'format': fmt})
    assert response.status_code == 200
    assert response.mimetype == mime
    if pages == 2:
        ext = 'jpg' if fmt == 'jpeg' else fmt
        with zipfile.ZipFile(io.BytesIO(response.data)) as archive:
            assert archive.namelist() == [f'page_1.{ext}', f'page_2.{ext}']
            assert archive.read(archive.namelist()[0]).startswith(b'\xff\xd8' if ext == 'jpg' else b'\x89PNG')
    response.close()
    assert list(runner.temp_root.iterdir()) == []


@pytest.mark.parametrize('mode,status', [('hang', 504), ('crash', 500), ('error', 400)])
def test_worker_errors_are_json_and_release_resources(runner, tmp_path, monkeypatch, mode, status):
    pidfile = synthetic_command(runner, tmp_path, monkeypatch, mode)
    runner.timeout = .4
    response = post_merge()
    assert response.status_code == status
    assert isinstance(response.get_json()['error'], str)
    with pytest.raises(ProcessLookupError): os.kill(int(pidfile.read_text()), 0)
    assert list(runner.temp_root.iterdir()) == []
    synthetic_command(runner, tmp_path, monkeypatch, 'success')
    assert post_merge().status_code == 200


def test_concurrent_requests_reject_before_multipart_parsing(runner, tmp_path, monkeypatch):
    pidfile = synthetic_command(runner, tmp_path, monkeypatch, 'hang')
    runner.timeout = 1
    with concurrent.futures.ThreadPoolExecutor(1) as pool:
        first = pool.submit(post_merge)
        wait_for(pidfile)
        # Invalid multipart would fail validation if parsed. Admission wins.
        with api.app.test_client() as client:
            excess = client.post('/to-images', data=b'invalid', content_type='multipart/form-data')
        assert excess.status_code == 503
        assert excess.headers['Retry-After'] == '1'
        assert 'busy' in excess.get_json()['error']
        assert first.result(timeout=5).status_code == 504
    assert list(runner.temp_root.iterdir()) == []
    synthetic_command(runner, tmp_path, monkeypatch, 'success')
    assert post_merge().status_code == 200


def test_parent_validation_failure_releases_admission(runner):
    with api.app.test_client() as client:
        invalid = client.post('/to-images', data={'file': (io.BytesIO(pdf_bytes()), 'a.pdf'), 'format': 'gif'})
    assert invalid.status_code == 400
    assert post_merge().status_code == 200
    assert list(runner.temp_root.iterdir()) == []
