"""Original public math exercises, independent of student data and teacher APIs."""
import hashlib
import json
from fractions import Fraction
from pathlib import Path

SCHEMA = "olena-authored-math-v3"
SYSTEM = "Você é Helena, tutora da OlenaStudy. Responda em português brasileiro. Explique com passos curtos quando solicitado e respeite o formato pedido."
TOPICS = ("addition", "subtraction", "multiplication", "division", "fractions", "percentages", "linear-equations", "powers")


def exact(value):
    result = Fraction(value)
    return str(result.numerator) if result.denominator == 1 else str(result)


def task_key(topic, operands):
    values = sorted(operands) if topic in {"addition", "multiplication"} else operands
    if topic == "fractions":
        a, b, c, d = operands
        values = sorted([exact(Fraction(a, b)), exact(Fraction(c, d))])
    return json.dumps([topic, values], separators=(",", ":"))


def solution(topic, operands):
    if not isinstance(operands, list) or not all(type(v) is int and 1 <= v <= 1000 for v in operands):
        raise ValueError("Invalid public operands")
    expected_count = 4 if topic == "fractions" else 3 if topic == "linear-equations" else 2
    if len(operands) != expected_count or topic not in TOPICS:
        raise ValueError("Invalid task")
    a, b = operands[:2]
    if topic == "addition":
        value = Fraction(a + b)
        question = f"Quanto é {a} + {b}?"
        explanation = f"Partimos de {a} e acrescentamos {b}. O resultado é {a} + {b} = {exact(value)}."
    elif topic == "subtraction":
        value = Fraction(a - b)
        question = f"Quanto é {a} - {b}?"
        explanation = f"Subtraímos {b} de {a}. Obtemos {a} - {b} = {exact(value)}. Confira somando {b} ao resultado: {exact(value)} + {b} = {a}."
    elif topic == "multiplication":
        value = Fraction(a * b)
        question = f"Quanto é {a} × {b}?"
        explanation = f"São {a} grupos com {b} unidades cada. Multiplicamos: {a} × {b} = {exact(value)}."
    elif topic == "division":
        value = Fraction(a, b)
        question = f"Quanto é {a} ÷ {b}?"
        explanation = f"Dividimos {a} em {b} partes iguais. Cada parte vale {exact(value)}. Confira: {exact(value)} × {b} = {a}."
    elif topic == "fractions":
        c, d = operands[2:]
        value = Fraction(a, b) + Fraction(c, d)
        question = f"Quanto é {a}/{b} + {c}/{d}?"
        explanation = f"Use o denominador comum {b*d}. As frações ficam {a*d}/{b*d} e {c*b}/{b*d}. Some os numeradores: ({a*d} + {c*b})/{b*d} = {a*d+c*b}/{b*d}. Simplifique: {exact(value)}."
    elif topic == "percentages":
        value = Fraction(a * b, 100)
        question = f"Quanto é {a}% de {b}?"
        explanation = f"{a}% significa {a}/100. Multiplique o valor por essa fração: {b} × {a}/100 = {a*b}/100 = {exact(value)}."
    elif topic == "linear-equations":
        c = operands[2]
        value = Fraction(c - b, a)
        question = f"Resolva {a}x + {b} = {c}."
        explanation = f"Subtraia {b} nos dois lados: {a}x = {c-b}. Divida ambos por {a}: x = {exact(value)}. Confira: {a} × ({exact(value)}) + {b} = {c}."
    else:
        if b > 6:
            raise ValueError("Power out of bounds")
        value = Fraction(a ** b)
        question = f"Quanto é {a}^{b}?"
        explanation = f"Multiplique {b} fatores iguais a {a}: {' × '.join([str(a)]*b)} = {exact(value)}. O expoente não é um multiplicador da base."
    return value, question, explanation


def tasks(split):
    if split == "train":
        pairs = [[3, 2], [4, 5], [7, 3], [9, 6], [11, 4], [13, 7], [8, 3], [14, 5]]
        special = {
            "fractions": [[1, 3, 1, 6], [2, 5, 1, 10], [1, 4, 1, 8], [2, 3, 1, 9], [3, 7, 2, 7], [2, 9, 1, 6],
                          [1, 2, 1, 4], [1, 3, 1, 3], [1, 4, 2, 4], [2, 5, 1, 5], [1, 6, 2, 6], [3, 8, 1, 8],
                          [1, 2, 1, 6], [1, 3, 1, 12], [1, 4, 1, 12], [2, 3, 1, 6], [2, 5, 1, 15], [3, 4, 1, 8],
                          [1, 3, 1, 4], [1, 5, 1, 6], [2, 7, 1, 3], [3, 5, 1, 4], [1, 8, 1, 5], [2, 9, 1, 4]],
            "percentages": [[10, 60], [20, 80], [25, 120], [30, 150], [40, 200], [50, 240], [5, 300], [35, 180]],
            "linear-equations": [[2, 3, 11], [3, 4, 19], [4, 5, 29], [5, 7, 22], [6, 2, 44], [7, 6, 34],
                                 [1, 5, 9], [1, 8, 11], [2, 5, 17], [2, 7, 21], [3, 2, 20], [3, 5, 26],
                                 [4, 3, 23], [4, 9, 41], [5, 2, 32], [5, 8, 43], [6, 7, 25], [6, 5, 59],
                                 [7, 2, 51], [7, 9, 65], [8, 5, 29], [8, 7, 71], [9, 4, 40], [10, 3, 53]],
            "powers": [[2, 3], [3, 2], [4, 2], [5, 2], [6, 2], [2, 4], [3, 4], [4, 4]],
        }
    elif split == "evaluation":
        pairs = [[6, 10], [12, 8], [17, 6], [19, 5]]
        special = {
            "fractions": [[1, 5, 1, 10], [3, 4, 1, 6], [2, 7, 1, 14], [3, 8, 1, 12]],
            "percentages": [[15, 160], [35, 80], [60, 50], [75, 120]],
            "linear-equations": [[4, 7, 35], [8, 3, 43], [9, 5, 32], [11, 4, 70]],
            "powers": [[3, 3], [4, 3], [5, 3], [7, 2]],
        }
    elif split == "audit":
        pairs = [[8, 7], [15, 9], [18, 7], [23, 6]]
        special = {
            "fractions": [[1, 6, 1, 4], [2, 5, 1, 4], [3, 10, 1, 5], [5, 12, 1, 8]],
            "percentages": [[12, 250], [45, 160], [80, 75], [65, 200]],
            "linear-equations": [[3, 8, 29], [5, 9, 49], [7, 3, 45], [10, 6, 46]],
            "powers": [[2, 5], [6, 3], [8, 2], [9, 2]],
        }
    else:
        raise ValueError("Unknown split")
    return [(topic, values) for topic in TOPICS for values in special.get(topic, pairs)]


def records(split):
    rows = []
    for index, (topic, operands) in enumerate(tasks(split)):
        value, question, explanation = solution(topic, operands)
        for style in (["number", "explanation"] if split == "train" else ["number"]):
            suffix = " Responda somente o número ou a fração simplificada, sem explicação." if style == "number" else " Explique por etapas curtas."
            rows.append({
                "id": f"{split}-{topic}-{index+1}-{style}", "source": SCHEMA,
                "publicSynthetic": True, "check": "verified-math-v3", "topic": topic,
                "operands": operands, "format": style, "expected": exact(value),
                "task_key": task_key(topic, operands),
                "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": question + suffix},
                             *([{"role": "assistant", "content": exact(value) if style == "number" else explanation}] if split == "train" else [])],
            })
    return rows


def validate_rows(rows, split):
    canonical = {r["id"]: r for r in records(split)}
    if len(rows) != len(canonical) or len({r.get("id") for r in rows}) != len(rows):
        raise ValueError("Unexpected corpus size or duplicate IDs")
    for row in rows:
        if canonical.get(row.get("id")) != row:
            raise ValueError("Corpus does not match verified authored data")
    return rows


def write_corpus(root=Path(".olena-learning")):
    training, evaluation, audit = records("train"), records("evaluation"), records("audit")
    sets = [{r["task_key"] for r in rows} for rows in (training, evaluation, audit)]
    if any(sets[a] & sets[b] for a, b in ((0, 1), (0, 2), (1, 2))):
        raise ValueError("Evaluation leakage")
    root.mkdir(parents=True, exist_ok=True)
    for name, rows in [("candidate-train.jsonl", training), ("candidate-eval.jsonl", evaluation), ("candidate-audit.jsonl", audit)]:
        (root / name).write_text("".join(json.dumps(r, ensure_ascii=False, sort_keys=True)+"\n" for r in rows), encoding="utf-8")
    manifest = {"schema": SCHEMA, "train_examples": len(training), "evaluation_examples": len(evaluation), "audit_examples": len(audit),
                "topics": list(TOPICS), "origin": "Original authored exercises, no student conversations or teacher API calls"}
    (root / "corpus-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Verified authored corpus: {len(training)} training examples, {len(evaluation)} validation questions, {len(audit)} new audit questions.")


def digest(data):
    return hashlib.sha256(data).hexdigest()


if __name__ == "__main__":
    write_corpus()
