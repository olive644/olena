"""Teach existing examples first, then withdraw procedural hints. No new tasks."""
from copy import deepcopy
from olena_training_data import TOPICS, validate_rows

METHODS = {
    "addition": "Some as parcelas, conferindo unidades e dezenas.",
    "subtraction": "Subtraia a segunda parcela da primeira; preserve o sinal se o resultado for negativo.",
    "multiplication": "Multiplicar é somar parcelas iguais; confira o produto.",
    "division": "Divida o numerador pelo denominador. Se necessário, escreva uma fração e simplifique.",
    "fractions": "Para a/b + c/d, use (a*d + c*b)/(b*d). Não some os denominadores. Simplifique numerador e denominador pelo mesmo divisor.",
    "percentages": "Para a% de b, calcule a*b/100 e simplifique.",
    "linear-equations": "Para a*x + b = c, subtraia b dos dois lados e divida por a: x=(c-b)/a. Confira substituindo x na equação.",
    "powers": "Multiplique a base por ela mesma tantas vezes quanto indica o expoente.",
}
STAGES = ("teaching", "guided", "independent")


def curriculum(rows):
    validate_rows(rows, "train")
    plan = []
    for stage in STAGES:
        for topic in TOPICS:
            indices = [i for i, row in enumerate(rows) if row["topic"] == topic
                       and row["format"] == ("explanation" if stage == "teaching" else "number")]
            if stage != "teaching":
                half = len(indices) // 2
                indices = indices[:half] if stage == "guided" else indices[half:]
            plan.extend({"index": i, "stage": stage} for i in indices)
    if sorted(item["index"] for item in plan) != list(range(len(rows))):
        raise ValueError("Curriculum must visit every existing example exactly once")
    return plan


def teaching_messages(row, stage):
    if stage not in STAGES:
        raise ValueError("Unknown teaching stage")
    messages = deepcopy(row["messages"])
    if stage != "independent":
        messages[-2]["content"] = "Método para este tema: " + METHODS[row["topic"]] + "\n" + messages[-2]["content"]
    return messages
