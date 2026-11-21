"""Ajuste fino do BERTimbau completo (cinco notas por competência) no corpus de pesquisa.

Uso: python scripts/finetune_bertimbau_essay.py N_TREINO ÉPOCAS MAX_TOKENS LIMITE_SEGUNDOS
Usa tmp/essay-own-grader/records.jsonl (prepare_own_essay_data.py) e salva ckpt.pt ao lado do script:
se passar do limite de tempo, pausa e a próxima execução retoma. Só pesquisa: nada vai para public/.
Dependências: torch (CPU ou GPU), transformers, scikit-learn, numpy.
"""
import json, sys, time, random
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
import numpy as np
import torch
from sklearn.metrics import cohen_kappa_score
from transformers import AutoTokenizer, AutoModel

torch.set_num_threads(4)
random.seed(1); np.random.seed(1); torch.manual_seed(1)
MODEL = "neuralmind/bert-base-portuguese-cased"
N_TRAIN = int(sys.argv[1]); EPOCHS = int(sys.argv[2]); MAXLEN = int(sys.argv[3]); PROBE = False; LIMIT = float(sys.argv[4])
rows = [json.loads(l) for l in open(str(ROOT / "tmp/essay-own-grader/records.jsonl"))]
train = [r for r in rows if r["split"] == "train"]
val = [r for r in rows if r["split"] == "validation"]
test = [r for r in rows if r["split"] == "test"]
random.shuffle(train)
train = train[:N_TRAIN]
tok = AutoTokenizer.from_pretrained(MODEL)

class M(torch.nn.Module):
    def __init__(s):
        super().__init__()
        s.enc = AutoModel.from_pretrained(MODEL)
        s.head = torch.nn.Linear(768, 5)
    def forward(s, **b):
        h = s.enc(**b).last_hidden_state
        m = b["attention_mask"].unsqueeze(-1).float()
        return s.head((h * m).sum(1) / m.sum(1))

model = M()

def batches(data, bs, shuffle):
    idx = list(range(len(data)))
    if shuffle: random.shuffle(idx)
    for i in range(0, len(idx), bs):
        chunk = [data[j] for j in idx[i:i+bs]]
        enc = tok([c["text"] for c in chunk], truncation=True, max_length=MAXLEN, padding=True, return_tensors="pt")
        y = torch.tensor([[g / 200 for g in c["grades"]] for c in chunk], dtype=torch.float)
        yield enc, y, chunk

def predict(data):
    model.eval(); out = []
    with torch.no_grad():
        for enc, _, _ in batches(data, 16, False):
            out.append(model(**enc).numpy())
    return np.clip(np.concatenate(out) * 200, 0, 200)

def snap(p): return (np.clip(np.round(p / 40), 0, 5) * 40).astype(int)

def metrics(pred, data, label):
    y = np.array([r["grades"] for r in data]); p = snap(pred)
    qwk = [cohen_kappa_score(y[:, k] // 40, p[:, k] // 40, weights="quadratic") for k in range(5)]
    mae_c = np.abs(y - p).mean(0)
    mae_t = np.abs(y.sum(1) - p.sum(1)).mean()
    print(label, "QWK por competência", [round(float(q), 3) for q in qwk], "média", round(float(np.mean(qwk)), 3), "| MAE competência", [round(float(m), 1) for m in mae_c], "| MAE total", round(float(mae_t), 2), flush=True)
    return float(np.mean(qwk))

import os
CK = str(ROOT / "tmp/essay-own-grader/finetune-ckpt.pt")
opt = torch.optim.AdamW(model.parameters(), lr=3e-5, weight_decay=0.01)
steps = EPOCHS * ((len(train) + 7) // 8)
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, (s + 1) / (0.1 * steps)) * max(0.0, (steps - s) / steps))
t0 = time.time(); step = 0
if os.path.exists(CK):
    st = torch.load(CK)
    model.load_state_dict(st["model"]); opt.load_state_dict(st["opt"]); sched.load_state_dict(st["sched"]); step = st["step"]
    print("retomado no passo", step, flush=True)
per_epoch = (len(train) + 7) // 8
def ordered(ep):
    r = random.Random(100 + ep); idx = list(range(len(train))); r.shuffle(idx)
    return [train[i] for i in idx]
while step < steps:
    ep = step // per_epoch; skip = step % per_epoch
    model.train()
    data = ordered(ep)
    for bi, (enc, y, _) in enumerate(batches(data, 8, False)):
        if bi < skip: continue
        loss = torch.nn.functional.mse_loss(model(**enc), y)
        loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step(); sched.step(); opt.zero_grad(); step += 1
        if step % 5 == 0: print(f"ep {ep} step {step}/{steps} loss {loss.item():.4f} {time.time()-t0:.0f}s", flush=True)
        if step % 25 == 0 or step >= steps:
            torch.save({"model": model.state_dict(), "opt": opt.state_dict(), "sched": sched.state_dict(), "step": step}, CK + ".tmp"); os.replace(CK + ".tmp", CK)
        if time.time() - t0 > LIMIT:
            torch.save({"model": model.state_dict(), "opt": opt.state_dict(), "sched": sched.state_dict(), "step": step}, CK + ".tmp"); os.replace(CK + ".tmp", CK)
            print("pausa no passo", step, flush=True); sys.exit(0)
        if step >= steps: break
val_small = val[:240]
metrics(predict(val_small), val_small, "validação (240 de 792)")
base = np.tile(np.median([r["grades"] for r in train], axis=0), (len(test), 1))
metrics(base, test, "teste, mediana do treino")
metrics(predict(test), test, "teste, BERTimbau ajustado")
print("tempo total", round(time.time() - t0), "s")
