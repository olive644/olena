"""Lista as provas cuja nota estimada pela TRI costuma ficar longe da nota real.

Lê o erro médio por prova da calibração de referência (tmp/tri-reference) e grava em
public/enem/tri/accuracy.json só os cadernos com erro médio acima do limite. A tela usa o arquivo
para avisar o estudante; o arquivo não traz fontes nem nomes.
Uso: py scripts/build-enem-tri-accuracy.py --reference tmp/tri-reference
"""
import argparse
import csv
import json
from pathlib import Path

LIMIT = 5.0


def build(reference, tri_dir):
    errors = {}
    with (reference / "dados/resultados_calibrados.csv").open(encoding="utf-8") as stream:
        for row in csv.DictReader(stream):
            if row["mae"] != "":
                errors[(int(row["ano"]), row["area"], int(row["codigo"]))] = float(row["mae"])
    files = {}
    for path in sorted(tri_dir.glob("*-*.json")):
        bundle = json.loads(path.read_text(encoding="utf-8"))
        mae = errors.get((bundle["year"], bundle["area"], int(bundle["examCode"])))
        if mae is not None and mae > LIMIT:
            files[path.name] = {"error": round(mae, 1)}
    return {"version": 1, "limit": LIMIT, "files": files}


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", type=Path, required=True)
    args = parser.parse_args()
    result = build(args.reference, root / "public/enem/tri")
    (root / "public/enem/tri/accuracy.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(len(result["files"]), "cadernos com aviso")
