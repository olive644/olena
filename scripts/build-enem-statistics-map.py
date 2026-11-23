"""Liga cada caderno oficial ao código de prova dos microdados, só para estatísticas de respostas.

Diferente de build-enem-tri.py, não usa parâmetros da TRI nem a lista de provas desconsideradas
na calibração: estatística de respostas não depende de calibração. Um caderno só é aceito quando
TODAS as respostas do arquivo de itens coincidem com o gabarito oficial conferido do PDF, na mesma
ordem e no mesmo idioma, e quando há um único candidato. Cadernos que já têm mapeamento TRI ficam
como estão (a TRI continua sendo a fonte nesses casos).

Uso: py scripts/build-enem-statistics-map.py --reference tmp/tri-reference
"""
import argparse
import collections
import csv
import json
import re
import unicodedata
from pathlib import Path

AREAS = {"languages": "LC", "humanities": "CH", "nature": "CN", "math": "MT"}
COLOR = re.compile(r"\b(Azul|Amarel[oa]|Branc[oa]|Rosa|Cinza|Verde)\b", re.I)


def normalize(text):
    return "".join(c for c in unicodedata.normalize("NFD", text.upper()) if not unicodedata.combining(c))


def sections_for(year, day):
    if year < 2017:
        return ["humanities", "nature"] if day == 1 else ["languages", "math"]
    return ["languages", "humanities"] if day == 1 else ["nature", "math"]


def first_question(section, year):
    return {"languages": 1 if year >= 2017 else 91, "humanities": 46 if year >= 2017 else 1,
            "nature": 91 if year >= 2017 else 46, "math": 136}[section]


def keyed_items(rows, section, year):
    """Chaves das questões de um caderno pela ORDEM dos itens, não pela posição crua.

    Nos microdados de 2017 o espanhol vem nas posições 6 a 10 e as comuns de 11 a 50; em outros anos
    os dois idiomas repetem as posições 1 a 5. Contar inglês, espanhol e comuns separadamente vale
    para os dois formatos.
    """
    ordered = sorted(rows, key=lambda row: int(row["CO_POSICAO"]))
    first = first_question(section, year)
    if section != "languages" or year < 2017:
        base = int(ordered[0]["CO_POSICAO"])
        items = []
        for row in ordered:
            number = int(row["CO_POSICAO"]) - base + first
            # Antes de 2017 as 5 questões de idioma repetem a posição (inglês e espanhol).
            language = {"0": "english", "1": "spanish"}.get(row.get("TP_LINGUA", "")) if section == "languages" else None
            items.append((f"{language}:{number}" if language else f"q:{number}", row))
        return items
    counters = collections.Counter()
    items = []
    for row in ordered:
        language = {"0": "english", "1": "spanish"}.get(row["TP_LINGUA"])
        group = language or "common"
        counters[group] += 1
        items.append((f"{language}:{counters[group]}" if language else f"q:{counters[group] + 5}", row))
    return items


def candidate_items(rows, section, year, answer):
    """Itens do caderno se coincidirem integralmente com o gabarito oficial; senão, None."""
    items = []
    for key, row in keyed_items(rows, section, year):
        inactive = row["IN_ITEM_ABAN"] == "1"
        if key not in answer or (not inactive and answer[key] != row["TX_GABARITO"]):
            return None
        items.append({"key": key, "answer": row["TX_GABARITO"], "excluded": inactive})
    expected = 50 if section == "languages" else 45
    keys = {item["key"] for item in items}
    if len(items) != expected or len(keys) != expected:
        return None
    return sorted(items, key=lambda item: item["key"])


def build(reference, catalog, official_keys, tri_dir, output):
    output.mkdir(parents=True, exist_ok=True)
    audit = []
    for paper in catalog["papers"]:
        year, day = paper["year"], paper["day"]
        source = reference / f"dados/ITENS_PROVAS/ITENS_PROVA_{year}.csv"
        answer = official_keys.get((year, day), {})
        variant = paper["variants"][0]
        if not source.exists() or not answer:
            audit.append({"year": year, "day": day, "status": "sem-itens" if not source.exists() else "sem-gabarito"})
            continue
        groups = collections.defaultdict(list)
        with source.open(encoding="latin1") as stream:
            for row in csv.DictReader(stream, delimiter=";"):
                groups[(row["SG_AREA"], row["CO_PROVA"])].append(row)
        color = COLOR.search(variant["label"])
        for section in sections_for(year, day):
            area = AREAS[section]
            if (tri_dir / f"{variant['id']}-{area}.json").exists():
                audit.append({"year": year, "day": day, "area": area, "status": "tri"})
                continue
            candidates = []
            for (group_area, code), rows in groups.items():
                if group_area != area:
                    continue
                paint = normalize(rows[0]["TX_COR"])
                if color and (paint[:5] != normalize(color.group(1))[:5] or len(paint) > 8):
                    continue
                items = candidate_items(rows, section, year, answer)
                if items:
                    candidates.append((code, items))
            signatures = {json.dumps(items, sort_keys=True) for _, items in candidates}
            if len(signatures) != 1:
                audit.append({"year": year, "day": day, "area": area,
                              "status": "ambiguo" if candidates else "sem-correspondencia"})
                continue
            code, items = candidates[0]
            bundle = {"version": 1, "purpose": "statistics-only", "year": year, "day": day, "area": area,
                      "variantId": variant["id"], "officialUrl": variant["url"],
                      "answerUrl": variant["answerUrl"], "examCode": int(code), "items": items}
            (output / f"{variant['id']}-{area}.json").write_text(
                json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
            audit.append({"year": year, "day": day, "area": area, "code": int(code), "status": "mapeado"})
    (output / "audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return audit


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=root / "public/enem/stat-map")
    args = parser.parse_args()
    catalog = json.loads((root / "public/enem/catalog.json").read_text(encoding="utf8"))
    keys = {(r["year"], r["day"]): r["key"] for r in json.loads(
        (root / "docs/research/enem-official-key-audit.json").read_text(encoding="utf8"))}
    result = build(args.reference, catalog, keys, root / "public/enem/tri", args.output)
    print(collections.Counter(item["status"] for item in result))
    for item in result:
        if item["status"] not in ("tri", "mapeado"):
            print(item)
