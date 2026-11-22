"""Publica um lote autoral somente após conferir chave, caderno e cinco justificativas."""
import argparse
import json
from datetime import date
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("batch", type=Path)
parser.add_argument("--year", type=int, required=True)
parser.add_argument("--day", type=int, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
catalog = json.loads((root / "public/enem/catalog.json").read_text(encoding="utf-8"))
paper = next(p for p in catalog["papers"] if p["year"] == args.year and p["day"] == args.day)
variant = paper["variants"][0]
audit = json.loads((root / "docs/research/enem-official-key-audit.json").read_text(encoding="utf-8"))
key = next(p["key"] for p in audit if p["year"] == args.year and p["day"] == args.day)
index = json.loads((root / f"public/enem/page-index/{variant['id']}.json").read_text(encoding="utf-8"))
path = root / f"public/enem/reviews/{variant['id']}.json"
document = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {
    "version": 1, "variantId": variant["id"], "year": args.year,
    "paperUrl": variant["url"], "answerUrl": variant["answerUrl"], "questions": {}}
batch = json.loads(args.batch.read_text(encoding="utf-8-sig"))
for item in batch:
    identity = item["key"]
    if identity not in index["pages"] or item["answer"] != key.get(identity):
        raise ValueError(f"Questão ou gabarito divergente: {identity}")
    paragraphs = item["paragraphs"]
    alternatives = item["alternatives"]
    if isinstance(alternatives, list):
        alternatives = dict(zip("ABCDE", alternatives))
    if len(" ".join(paragraphs)) < 120 or set(alternatives) != set("ABCDE") or any(
        len(value.strip()) < 20 for value in alternatives.values()) or len(set(alternatives.values())) != 5:
        raise ValueError(f"Resolução insuficiente: {identity}")
    question = document["questions"].setdefault(identity, {"answer": item["answer"]})
    if question["answer"] != item["answer"]:
        raise ValueError(f"Conflito com dado já salvo: {identity}")
    question["solution"] = {
        "paragraphs": paragraphs, "alternatives": alternatives,
        "verification": "ai-authored-official-key-checked",
        "checkedAt": date.today().isoformat(),
        "sources": [{"title": f"Inep, prova oficial, página {index['pages'][identity]}", "url": variant["url"]},
                    {"title": "Inep, gabarito oficial", "url": variant["answerUrl"]}],
    }
temporary = path.with_suffix(".json.tmp")
temporary.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
temporary.replace(path)
print(json.dumps({"year": args.year, "day": args.day, "published": len(batch),
                  "solutions": sum("solution" in item for item in document["questions"].values())}))
