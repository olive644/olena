"""Baixa a redistribuição licenciada e processa todas as edições disponíveis, sem dados individuais públicos."""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import subprocess
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
metadata = json.loads((ROOT / "tmp/tri-zenodo.json").read_text(encoding="utf-8"))
spec = importlib.util.spec_from_file_location("enem_statistics", ROOT / "scripts/build-enem-question-statistics.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--years", help="Anos separados por vírgula; padrão: todos de 2010 a 2025")
parser.add_argument("--force", action="store_true", help="Reprocessa mesmo com auditoria existente (use ao ampliar mapeamentos)")
args = parser.parse_args()
selected = {int(year) for year in args.years.split(",")} if args.years else None
lock = threading.Lock()
progress = {}


def status(year, stage, **extra):
    with lock:
        progress[str(year)] = {"stage": stage, **extra}
        (ROOT / "tmp/enem-statistics-progress.json").write_text(json.dumps(progress, indent=2), encoding="utf-8")
        print(year, stage, flush=True)


def process(entry):
    year = int(entry["key"].split("_")[-1].split(".")[0])
    target = ROOT / "tmp" / entry["key"]
    audit = ROOT / f"public/enem/reviews/statistics-audit-{year}.json"
    if audit.exists() and not args.force:
        status(year, "complete", audit=json.loads(audit.read_text(encoding="utf-8")))
        return
    status(year, "downloading", bytes=entry["size"])
    if not target.exists() or target.stat().st_size != entry["size"]:
        subprocess.run(["curl.exe", "--location", "--fail", "--silent", "--show-error", "--retry", "3",
                        "--max-time", "1800", "--continue-at", "-", "--output", str(target), entry["links"]["self"]], check=True)
    expected = entry.get("checksum", "").removeprefix("md5:")
    if expected:
        with target.open("rb") as source:
            digest = hashlib.file_digest(source, "md5").hexdigest()
        if digest != expected:
            raise ValueError(f"Checksum divergente em {year}")
    status(year, "processing")
    result = builder.aggregate(target, year, ROOT / "public/enem/reviews", ROOT / "public/enem/tri",
                               ROOT / "public/enem/stat-map")
    status(year, "complete" if result["questions"] else "mapping-required", audit=result)


entries = [entry for entry in metadata["files"] if entry["key"].startswith("PARTICIPANTES_")
           and 2010 <= int(entry["key"].split("_")[-1].split(".")[0]) <= 2025
           and (selected is None or int(entry["key"].split("_")[-1].split(".")[0]) in selected)]
entries.sort(key=lambda entry: entry["key"], reverse=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    tasks = {pool.submit(process, entry): entry["key"] for entry in entries}
    for task in concurrent.futures.as_completed(tasks):
        try:
            task.result()
        except Exception as error:
            year = tasks[task].split("_")[-1].split(".")[0]
            status(year, "error", message=str(error))
