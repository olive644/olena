"""Convert C1 inside the research cache, not public/. No app integration."""
import json
import os
from pathlib import Path
import time
import pyarrow.parquet as parquet

os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
import numpy as np
import onnxruntime as ort
from onnxruntime.quantization import QuantType, quantize_dynamic
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

root = Path(__file__).resolve().parent.parent
folder = root / "tmp/essay-grading-lab/onnx-C1"
(folder / "onnx").mkdir(parents=True, exist_ok=True)
torch.set_num_threads(4)
torch.set_printoptions(threshold=8)
tokenizer = AutoTokenizer.from_pretrained(
    str(root / "tmp/essay-grading-lab/tokenizer"), local_files_only=True,
)
model = AutoModelForSequenceClassification.from_pretrained(
    str(root / "tmp/essay-grading-lab/checkpoints/C1"), use_safetensors=True,
    local_files_only=True, attn_implementation="eager",
).eval()
model.config.save_pretrained(folder)
tokenizer.save_pretrained(folder)
class Logits(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.network = model

    def forward(self, input_ids, attention_mask, token_type_ids):
        return self.network(input_ids=input_ids, attention_mask=attention_mask,
                     token_type_ids=token_type_ids, return_dict=False)[0]

sample = tokenizer("A educação amplia o acesso à cidadania.", return_tensors="pt")
names = ["input_ids", "attention_mask", "token_type_ids"]
float_path = folder / "onnx/model.onnx"
q8_path = folder / "onnx/model_quantized.onnx"
started = time.perf_counter()
if not float_path.exists():
    torch.onnx.export(Logits(), tuple(sample[name] for name in names), str(float_path),
                      input_names=names, output_names=["logits"], opset_version=17,
                      dynamic_axes={**{name: {0: "batch", 1: "sequence"} for name in names}, "logits": {0: "batch"}},
                      dynamo=False)
quantize_dynamic(str(float_path), str(q8_path), weight_type=QuantType.QInt8,
                 op_types_to_quantize=["MatMul", "Gemm", "Gather"])
options = ort.SessionOptions()
options.intra_op_num_threads = 4
session = ort.InferenceSession(str(q8_path), sess_options=options, providers=["CPUExecutionProvider"])
checks = []
for text in ["teste", "A educação amplia o acesso à cidadania.", "A inclusão digital depende de infraestrutura e de formação. " * 35]:
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.inference_mode():
        original = model(**inputs).logits.numpy()
    quantized = session.run(None, {name: value.numpy() for name, value in inputs.items()})[0]
    checks.append({"tokens": int(inputs["input_ids"].shape[1]),
                   "originalClass": int(original.argmax()), "q8Class": int(quantized.argmax()),
                   "maxLogitDifference": float(np.abs(original - quantized).max())})
report = {"schemaVersion": 1, "competency": "C1", "deploymentEnabled": False,
          "floatBytes": float_path.stat().st_size, "q8Bytes": q8_path.stat().st_size,
          "seconds": time.perf_counter() - started, "checks": checks,
          "qualification": "Conversion smoke only, no grading accuracy or mobile validation"}
baseline = json.loads((root / "docs/research/essay-grader-smoke.json").read_text(encoding="utf-8"))["results"][0]["labeledTest"]["rows"]
public_rows = parquet.read_table(root / "tmp/essay-grading-lab/test.parquet").to_pylist()
agreement = []
for row in baseline:
    inputs = tokenizer(public_rows[row["rowIndex"]]["essay_text"], return_tensors="np", truncation=True, max_length=512)
    logits = session.run(None, dict(inputs))[0]
    score = int(model.config.id2label[int(logits.argmax())])
    agreement.append({"rowIndex": row["rowIndex"], "floatScore": row["prediction"], "q8Score": score, "human": row["human"]})
report["quantizationComparison"] = {"rows": agreement, "agreement": sum(row["floatScore"] == row["q8Score"] for row in agreement) / len(agreement)}
(root / "docs/research/essay-grader-onnx-probe.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report))
