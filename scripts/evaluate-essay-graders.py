"""Isolated CPU smoke test. Not a validated grader and never used by the app.

Run with the lab Python environment; downloads are cached only under tmp/.
No remote code, inference API, credentials or real user essays are used.
"""
import gc
import json
import os
from pathlib import Path
import time
import math

os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
os.environ["HF_HUB_DISABLE_XET"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import torch
import pyarrow.parquet as parquet
from transformers import AutoModelForSequenceClassification, AutoTokenizer

ROOT = Path(__file__).resolve().parent.parent
audit = json.loads((ROOT / "docs/research/essay-grader-audit.json").read_text(encoding="utf-8"))
torch.set_num_threads(4)
tokenizer = AutoTokenizer.from_pretrained(
    str(ROOT / "tmp/essay-grading-lab/tokenizer"),
    trust_remote_code=False, local_files_only=True,
)
cases = [
    {"id": "empty", "text": ""},
    {"id": "one-word", "text": "teste"},
    {"id": "repeated-keywords", "text": "Internet cidadania exclusão digital. " * 35},
    {"id": "short-off-topic", "text": "O futebol é um esporte popular. Ontem o time marcou um gol e venceu o campeonato."},
    {"id": "argumentative", "text": "A digitalização dos serviços públicos amplia as possibilidades de atendimento, mas pode excluir cidadãos sem conexão ou formação digital. Por isso, a inclusão deve combinar infraestrutura e alternativas presenciais.\n\nA dependência de aplicativos transfere ao cidadão custos e dificuldades antes resolvidos no atendimento presencial. Pessoas que compartilham um aparelho podem ter dificuldade para agendar consultas ou solicitar benefícios. Oferecer apenas acesso à internet não garante autonomia no uso desses serviços.\n\nAlém disso, instruções pouco claras dificultam a navegação de idosos e de pessoas com baixa escolaridade. A formação digital precisa considerar essas diferenças, evitando que familiares se tornem intermediários obrigatórios no exercício de direitos.\n\nPortanto, as prefeituras devem manter postos presenciais e oferecer oficinas em bibliotecas públicas, com profissionais capacitados para orientar o uso seguro dos serviços. O acompanhamento das dificuldades dos participantes permitirá adaptar as atividades e ampliar o acesso autônomo aos direitos."},
    {"id": "long-tail", "text": "A digitalização dos serviços transforma o atendimento público. " * 130 + "\nA conclusão sobre a proteção de direitos aparece somente neste final."},
]
public_rows = parquet.read_table(ROOT / "tmp/essay-grading-lab/test.parquet").to_pylist()
sample_indices = sorted({round(i * (len(public_rows) - 1) / 23) for i in range(24)})
public_cases = [public_rows[index] for index in sample_indices]
dataset_source = json.loads((ROOT / "tmp/essay-grading-lab/test-source.json").read_text(encoding="utf-8"))
def metrics(rows):
    differences = [row["prediction"] - row["human"] for row in rows]
    n = len(rows)
    weights = [[((a - b) / 5) ** 2 for b in range(6)] for a in range(6)]
    observed = [[0 for _ in range(6)] for _ in range(6)]
    for row in rows:
        observed[row["human"] // 40][row["prediction"] // 40] += 1
    actual = [sum(row) for row in observed]
    predicted = [sum(observed[a][b] for a in range(6)) for b in range(6)]
    disagreement = sum(weights[a][b] * observed[a][b] / n for a in range(6) for b in range(6))
    expected = sum(weights[a][b] * actual[a] * predicted[b] / n ** 2 for a in range(6) for b in range(6))
    return {"n": n, "mae": sum(abs(d) for d in differences) / n,
            "rmse": math.sqrt(sum(d * d for d in differences) / n),
            "exactAccuracy": sum(d == 0 for d in differences) / n,
            "within40": sum(abs(d) <= 40 for d in differences) / n,
            "qwk": 1 - disagreement / expected if expected else None}
results = []
for index, checkpoint in enumerate(audit["models"]):
    started = time.perf_counter()
    model = AutoModelForSequenceClassification.from_pretrained(
        str(ROOT / f"tmp/essay-grading-lab/checkpoints/C{index + 1}"),
        trust_remote_code=False, use_safetensors=True, local_files_only=True,
    ).eval()
    rows = []
    for case in cases:
        token_count = len(tokenizer(case["text"], truncation=False)["input_ids"])
        inputs = tokenizer(case["text"], return_tensors="pt", truncation=True, max_length=512)
        start = time.perf_counter()
        with torch.inference_mode():
            probabilities = model(**inputs).logits.softmax(-1)[0]
        label = int(probabilities.argmax().item())
        rows.append({
            "case": case["id"], "predictedScore": int(model.config.id2label[label]),
            "maxProbabilityNotCalibratedConfidence": round(float(probabilities[label]), 6),
            "inputTokens": token_count, "truncated": token_count > 512,
            "inferenceSeconds": round(time.perf_counter() - start, 4),
        })
    labeled = []
    for row_index, example in zip(sample_indices, public_cases):
        inputs = tokenizer(example["essay_text"], return_tensors="pt", truncation=True, max_length=512)
        with torch.inference_mode():
            label = int(model(**inputs).logits.argmax(-1)[0])
        human = int(example["grades"][index])
        prediction = int(model.config.id2label[label])
        if human not in range(0, 201, 40):
            raise ValueError("Unexpected human score scale")
        labeled.append({"rowIndex": row_index, "human": human, "prediction": prediction,
                        "truncated": len(tokenizer(example["essay_text"], truncation=False)["input_ids"]) > 512})
    results.append({"model": checkpoint["id"], "revision": checkpoint["revision"], "loadAndTestSeconds": round(time.perf_counter() - started, 3), "cases": rows,
                    "labeledTest": {"source": dataset_source, "selection": "24 evenly spaced row indices, exploratory only", "uniqueEssayCount": len({row["essay_text"] for row in public_cases}), "rows": labeled, "metrics": metrics(labeled)}})
    print(json.dumps({"model": checkpoint["id"], "metrics": metrics(labeled),
                      "smoke": {row["case"]: row["predictedScore"] for row in rows}}), flush=True)
    (ROOT / "docs/research/essay-grader-smoke.json").write_text(json.dumps({
        "schemaVersion": 1, "runtime": {"torch": torch.__version__, "device": "cpu", "threads": 4},
        "inputProtocol": "essay-only exploratory; original checkpoint training protocol not verified",
        "humanGradedTestSet": True, "independentHoldoutCreatedByUs": False,
        "fullPublishedBenchmarkReproduced": False, "deploymentEnabled": False, "results": results,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    del model
    gc.collect()
