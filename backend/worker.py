"""Private one-job entry point. No PDF/native imports before the release gate."""
import json
import math
import os
from pathlib import Path
import sys
import tempfile


def apply_limits(request):
    if os.name != "posix": return
    import resource
    for kind, amount in ((resource.RLIMIT_AS, request["memory_mb"] * 1024 * 1024),
                         (resource.RLIMIT_CPU, request["cpu_seconds"]),
                         (resource.RLIMIT_FSIZE, request["output_limit"])):
        if amount:
            _, hard = resource.getrlimit(kind)
            value = amount if hard == resource.RLIM_INFINITY else min(amount, hard)
            resource.setrlimit(kind, (value, value))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def render_budget(data, dpi):
    import io
    import pikepdf
    total = 0
    with pikepdf.open(io.BytesIO(data)) as document:
        for page in document.pages:
            unit = float(page.get("/UserUnit", 1))
            # Conservative: never let a huge declared MediaBox hide behind a
            # small CropBox. This is a render policy, not a parser memory bound.
            boxes = [page.MediaBox, page.get("/CropBox", page.MediaBox)]
            pixels = 0
            for box in boxes:
                width = abs(float(box[2]) - float(box[0])) * unit * dpi / 72
                height = abs(float(box[3]) - float(box[1])) * unit * dpi / 72
                if not math.isfinite(width * height) or width <= 0 or height <= 0:
                    raise ValueError("Invalid PDF page dimensions")
                pixels = max(pixels, math.ceil(width) * math.ceil(height))
            total += pixels
            if pixels > 20_000_000 or total > 40_000_000:
                raise ValueError("PDF exceeds the rendering pixel budget")


def process(request, directory):
    from flask import Flask
    from config import MAX_PAGE_COUNT
    from validator import validate_not_encrypted, validate_page_count, validate_uncompressed_size
    from processor import strip_and_merge_pdfs, convert_to_images
    inputs = [(directory / item["path"]).read_bytes() for item in request["inputs"]]
    with Flask("pdf-worker").app_context():
        for data, item in zip(inputs, request["inputs"]):
            if request["operation"] == "convert": validate_page_count(data, MAX_PAGE_COUNT)
            validate_not_encrypted(data, item["name"])
            # Do not exempt highly compressed inputs merely because they are small.
            validate_uncompressed_size(data, item["name"], request["expansion_limit"])
        if request["operation"] == "merge":
            return strip_and_merge_pdfs(inputs), "application/pdf"
        render_budget(inputs[0], request["dpi"])
        return convert_to_images(inputs[0], dpi=request["dpi"], fmt=request["format"])


def main():
    if sys.stdin.buffer.readline() != b"start\n": return 8
    directory = Path(sys.argv[1]).resolve()
    request = json.loads((directory / "request.json").read_text(encoding="utf-8"))
    apply_limits(request)
    for key in ("TMPDIR", "TEMP", "TMP"): os.environ[key] = str(directory)
    tempfile.tempdir = str(directory)
    from werkzeug.exceptions import HTTPException
    try:
        output, mime = process(request, directory)
        with output:
            if output.getbuffer().nbytes > request["output_limit"]:
                raise ValueError("PDF output exceeds the configured size limit")
            with (directory / "output.bin").open("wb") as destination:
                destination.write(output.getbuffer())
        result = {"status": 200, "mimetype": mime}
    except HTTPException as error:
        response = error.get_response()
        result = {"status": response.status_code, "error": response.get_json().get("error", "Invalid PDF")}
        response.close()
    except ValueError as error:
        # Parser messages may contain internal paths; use a bounded public message.
        message = str(error) if "budget" in str(error) or "configured size limit" in str(error) else "Could not process PDF. It may be corrupted or unsupported."
        result = {"status": 400, "error": message}
    except Exception:
        result = {"status": 500, "error": "PDF processing failed or exceeded a resource limit."}
    (directory / "result.json").write_text(json.dumps(result), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
