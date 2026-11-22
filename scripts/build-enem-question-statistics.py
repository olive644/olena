"""Agrega respostas por caderno/idioma, sem publicar registros individuais.

Entrada: PARTICIPANTES_<ano>.zip, redistribuição CC BY 4.0 de Pedro Mantovani/INEP.
Usa apenas cadernos já conferidos integralmente pelo pipeline TRI.
"""
import argparse
import csv
import io
import json
import zipfile
from collections import Counter
from datetime import date
from pathlib import Path


def normalize_language(value):
    """Idioma como "0" ou "1". Alguns anos (2012) trazem "0.0" e "1.0"."""
    try:
        return str(int(float(value)))
    except ValueError:
        return ""


def language_vector(responses, language):
    """Vetor de 45 respostas de Linguagens do idioma escolhido, ou None se o formato não for o esperado.

    A partir de 2017 (até onde os arquivos foram conferidos) o vetor tem 50 caracteres: inglês nas
    posições 1 a 5, espanhol nas 6 a 10 e as comuns nas 11 a 50. O bloco do idioma não escolhido vem
    preenchido com '9'. Se esse bloco tiver letras, o layout não é o conhecido e o registro é recusado.
    """
    if len(responses) == 45:
        return responses
    if len(responses) != 50 or language not in ("0", "1"):
        return None
    chosen, other = (responses[0:5], responses[5:10]) if language == "0" else (responses[5:10], responses[0:5])
    if any(letter in "ABCDE" for letter in other) or any(letter not in "ABCDE9." for letter in chosen):
        return None
    return chosen + responses[10:50]


def aggregate(archive_path, year, output, tri_dir, map_dir=None):
    bundles = [json.loads(path.read_text(encoding="utf-8"))
               for path in tri_dir.glob("*.json") if path.stem not in ("index", "audit")]
    bundles = [bundle for bundle in bundles if bundle["year"] == year]
    # Cadernos conferidos só para estatística (sem parâmetros da TRI): completam o que a TRI não cobre.
    if map_dir is not None and map_dir.exists():
        covered = {(bundle["area"], int(bundle["examCode"])) for bundle in bundles}
        for path in map_dir.glob("*.json"):
            if path.stem == "audit":
                continue
            extra = json.loads(path.read_text(encoding="utf-8"))
            if extra["year"] == year and (extra["area"], int(extra["examCode"])) not in covered:
                bundles.append(extra)
    targets = {(bundle["area"], int(bundle["examCode"])): bundle for bundle in bundles}
    counts = {}
    prepared = {}
    pending = {}
    for (area, code), bundle in targets.items():
        for language in (("0", "1") if area == "LC" else ("any",)):
            prefix = "english" if language == "0" else "spanish"
            items = [item for item in bundle["items"] if area != "LC" or item["key"].startswith(("q:", prefix + ":"))]
            items.sort(key=lambda item: int(item["key"].split(":")[1]))
            if len(items) != 45:
                raise ValueError("Mapeamento não contém 45 questões")
            identity = (area, code, language)
            prepared[identity] = [(bundle["variantId"], item["key"]) for item in items]
            pending[identity] = []
    def flush():
        for identity, responses in pending.items():
            if not responses:
                continue
            for key, column in zip(prepared[identity], zip(*responses)):
                frequencies = Counter(column)
                totals = counts.setdefault(key, Counter())
                totals.update({letter: frequencies[letter] for letter in "ABCDE"})
                totals["blank"] += len(column) - sum(frequencies[letter] for letter in "ABCDE")
            responses.clear()

    records = 0
    rejected = Counter()
    with zipfile.ZipFile(archive_path) as archive:
        entries = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if len(entries) != 1:
            raise ValueError("Esperado um CSV de participantes no arquivo")
        with io.TextIOWrapper(archive.open(entries[0]), encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            for row in reader:
                records += 1
                for area in ("LC", "CH", "CN", "MT"):
                    raw_code = row.get(f"CO_PROVA_{area}", "")
                    try:
                        code = int(float(raw_code))
                    except ValueError:
                        continue
                    bundle = targets.get((area, code))
                    if not bundle:
                        continue
                    responses = row.get(f"TX_RESPOSTAS_{area}", "")
                    if area == "LC" and len(responses) == 50:
                        responses = language_vector(responses, normalize_language(row.get("TP_LINGUA", ""))) or ""
                    if not row.get(f"NU_NOTA_{area}") or len(responses) != 45:
                        rejected["sem_nota_ou_vetor_de_45"] += 1
                        continue
                    language = normalize_language(row.get("TP_LINGUA", ""))
                    if area == "LC" and language not in ("0", "1"):
                        rejected["idioma_invalido"] += 1
                        continue
                    identity = (area, code, language if area == "LC" else "any")
                    pending[identity].append(responses)
                if records % 25_000 == 0:
                    flush()
                if records % 500_000 == 0:
                    print(f"Processados {records:,} participantes", flush=True)
    flush()
    output.mkdir(parents=True, exist_ok=True)
    written = 0
    for bundle in bundles:
        path = output / f"{bundle['variantId']}.json"
        document = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {
            "version": 1, "variantId": bundle["variantId"], "year": year,
            "paperUrl": bundle["officialUrl"], "answerUrl": bundle["answerUrl"], "questions": {}}
        for item in bundle["items"]:
            totals = counts.get((bundle["variantId"], item["key"]))
            if not totals:
                continue
            answer = item["answer"] if item["answer"] in ("A", "B", "C", "D", "E") else "ANULADA"
            question = document["questions"].setdefault(item["key"], {"answer": answer})
            if question["answer"] != answer:
                raise ValueError("Conflito entre conteúdo editorial e gabarito")
            question["statistics"] = {
                "population": sum(totals.values()),
                "counts": {letter: totals[letter] for letter in ("A", "B", "C", "D", "E", "blank")},
                "source": {
                    "title": f"INEP / Pedro Mantovani, microdados {year} (CC BY 4.0)",
                    "url": "https://doi.org/10.5281/zenodo.20130840",
                    "processedAt": date.today().isoformat(),
                    "scope": f"Participantes de {year} com nota e vetor de 45 respostas deste caderno. "
                             "Língua estrangeira separada por opção; questões comuns incluem os dois idiomas. "
                             "Sem respostas de usuários do OlenaStudy. ",
                },
            }
            written += 1
        path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {"year": year, "recordsRead": records, "questions": written,
              "mappedAreas": len(bundles), "rejectedAreaVectors": dict(rejected),
              "source": "https://doi.org/10.5281/zenodo.20130840"}
    (output / f"statistics-audit-{year}.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report), flush=True)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--output", type=Path, default=Path("public/enem/reviews"))
    parser.add_argument("--tri-dir", type=Path, default=Path("public/enem/tri"))
    parser.add_argument("--map-dir", type=Path, default=Path("public/enem/stat-map"))
    args = parser.parse_args()
    aggregate(args.archive, args.year, args.output, args.tri_dir, args.map_dir)
