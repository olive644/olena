"""Validate public corpus, deduplicate and split by prompt before training.

No eval/pickle/remote code. Source essays never enter public/ or reports.
"""
import ast
from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parent.parent
LAB = ROOT / "tmp/essay-own-grader"
SEED = "olena-essay-prompt-holdout-v1"

def fingerprint(text):
    words = re.findall(r"\w+", unicodedata.normalize("NFKC", text).casefold())
    return hashlib.sha256(" ".join(words).encode()).hexdigest()

def prompt_context(value):
    # The corpus mixes serialized paragraph lists and plain prose in this column.
    if not value.lstrip().startswith("["):
        return value.strip()
    paragraphs = ast.literal_eval(value)
    if not isinstance(paragraphs, list) or not all(isinstance(p, str) for p in paragraphs):
        raise ValueError("Invalid prompt context")
    return "\n\n".join(paragraphs)

def prepare(rows):
    buckets = defaultdict(list)
    invalid = 0
    for index, row in enumerate(rows):
        try:
            paragraphs = ast.literal_eval(row["essay"])
            grades = ast.literal_eval(row["competence"])
            assert isinstance(paragraphs, list) and all(isinstance(p, str) for p in paragraphs)
            assert len(grades) == 5 and all(type(g) is int and g in range(0, 201, 40) for g in grades)
            assert sum(grades) == int(row["score"])
            text = "\n\n".join(p.strip() for p in paragraphs if p.strip())
            prompt = unicodedata.normalize("NFKC", row["prompt"]).strip().casefold()
            assert text and prompt
        except (AssertionError, ValueError, SyntaxError, TypeError, KeyError):
            invalid += 1
            continue
        key = fingerprint(text)
        buckets[key].append({"id": key, "sourceRow": index, "text": text, "prompt": prompt, "grades": grades})
    kept, conflicts, duplicates = [], 0, 0
    for candidates in buckets.values():
        # Conflicting scores or prompt labels are excluded, not averaged into new labels.
        if len({(c["prompt"], tuple(c["grades"])) for c in candidates}) != 1:
            conflicts += len(candidates)
            continue
        kept.append(candidates[0])
        duplicates += len(candidates) - 1
    prompts = sorted({r["prompt"] for r in kept}, key=lambda p: hashlib.sha256(f"{SEED}:{p}".encode()).hexdigest())
    train_end, validation_end = round(len(prompts) * .7), round(len(prompts) * .85)
    assignments = {p: "train" if i < train_end else "validation" if i < validation_end else "test" for i, p in enumerate(prompts)}
    for row in kept:
        row["split"] = assignments[row["prompt"]]
    return kept, {"inputRows": len(rows), "invalidRows": invalid, "conflictingRowsExcluded": conflicts, "duplicateRowsRemoved": duplicates, "keptRows": len(kept), "seed": SEED}

def main():
    source = json.loads((LAB / "source.json").read_text(encoding="utf-8"))
    expected = next(f["sha256"] for f in source["files"] if f["path"].endswith("essay-br.csv"))
    if hashlib.sha256((LAB / "essay-br.csv").read_bytes()).hexdigest() != expected:
        raise ValueError("Corpus checksum mismatch")
    with (LAB / "essay-br.csv").open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    records, report = prepare(rows)
    with (LAB / "prompts.csv").open(encoding="utf-8", newline="") as stream:
        prompts = [{"id": row["id"], "text": prompt_context(row["description"])} for row in csv.DictReader(stream)]
    if {r["prompt"] for r in records} - {p["id"] for p in prompts}:
        raise ValueError("Missing prompt context")
    (LAB / "prompts.json").write_text(json.dumps(prompts, ensure_ascii=False), encoding="utf-8")
    with (LAB / "records.jsonl").open("w", encoding="utf-8") as stream:
        for row in records:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    groups = {split: [r for r in records if r["split"] == split] for split in ["train", "validation", "test"]}
    report["source"] = source
    report["splits"] = {split: {"rows": len(group), "prompts": len({r["prompt"] for r in group}),
        "gradeCounts": [dict(Counter(r["grades"][c] for r in group)) for c in range(5)]} for split, group in groups.items()}
    report["assignments"] = [{"id": r["id"], "prompt": r["prompt"], "split": r["split"]} for r in records]
    report["deploymentEnabled"] = False
    assert len(records) == len({r["id"] for r in records})
    for a, b in [("train", "validation"), ("train", "test"), ("validation", "test")]:
        assert not {r["prompt"] for r in groups[a]} & {r["prompt"] for r in groups[b]}
    (ROOT / "docs/research/essay-own-data-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in ["assignments", "source", "splits"]}))
    print(json.dumps({k: {"rows": v["rows"], "prompts": v["prompts"]} for k, v in report["splits"].items()}))

if __name__ == "__main__":
    main()
