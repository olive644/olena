"""Bounded CPU LoRA training. Rejected weights are never retained as candidates."""
import json
import os
import random
import re
import shutil
from fractions import Fraction
from pathlib import Path

from olena_training_data import SCHEMA, TOPICS, digest, validate_rows

BASE = "Qwen/Qwen2.5-0.5B-Instruct"
REVISION = "7ae557604adf67be50417f59c2c2f167def9a775"
TRAINER_VERSION = "math-gate-v3.1"
ROOT = Path(".olena-learning")
OUTPUT = ROOT / "candidate"
REPORT = ROOT / "training-report.json"
MAX_STEPS = 192


def outputs(**values):
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as stream:
            for key, value in values.items():
                stream.write(f"{key}={str(value).lower() if isinstance(value, bool) else value}\n")


def numeric_answer(text):
    cleaned = re.sub(r"^x\s*=\s*", "", text.strip(), flags=re.I).replace(",", ".")
    if len(cleaned) > 80 or not re.fullmatch(r"[+-]?\d+(?:\.\d+)?(?:/[+-]?\d+)?", cleaned):
        return None
    try:
        if "/" in cleaned:
            a, b = cleaned.split("/")
            return Fraction(a) / Fraction(b)
        return Fraction(cleaned)
    except (ValueError, ZeroDivisionError):
        return None


def quality_gate(baseline, prior, candidate):
    expected = [r["id"] for r in baseline]
    if (len(expected) != 32 or len(set(expected)) != 32
            or [r["id"] for r in prior] != expected or [r["id"] for r in candidate] != expected):
        raise ValueError("Evaluation results do not align")
    if any(type(r.get("correct")) is not bool or r.get("topic") not in TOPICS for r in baseline + prior + candidate):
        raise ValueError("Invalid evaluation result")
    protected = {r["id"] for r in baseline + prior if r["correct"]}
    regressions = [r["id"] for r in candidate if r["id"] in protected and not r["correct"]]
    score = sum(r["correct"] for r in candidate)
    per_topic = {topic: sum(r["correct"] for r in candidate if r["topic"] == topic) for topic in TOPICS}
    if any(sum(r["topic"] == topic for r in candidate) != 4 for topic in TOPICS):
        raise ValueError("Evaluation must cover every topic equally")
    accepted = not regressions and score >= 24 and all(count >= 2 for count in per_topic.values())
    return {"passed": accepted, "correct": score, "total": 32, "accuracy": score / 32,
            "per_topic": per_topic, "regressions": regressions,
            "minimum_accuracy": 0.75, "minimum_correct_per_topic": 2}


def verified_previous(path, evaluation_digest, audit_digest):
    try:
        report_file = path / "report.json"
        if not report_file.is_file() or report_file.stat().st_size > 100000:
            return None
        report = json.loads(report_file.read_text(encoding="utf-8"))
        weights = path / "adapter_model.safetensors"
        config_file = path / "adapter_config.json"
        if (report.get("base_revision") != REVISION or report.get("trainer_version") != TRAINER_VERSION
                or report.get("schema") != SCHEMA or report.get("status") not in {"accepted", "retained"}
                or report.get("evaluation_sha256") != evaluation_digest or report.get("audit_sha256") != audit_digest
                or report.get("gate", {}).get("passed") is not True or report.get("production_approved") is not False
                or not weights.is_file() or weights.stat().st_size > 5000000 or not config_file.is_file()):
            return None
        if quality_gate(report["baseline"], report["prior_candidate"], report["candidate"]) != report["gate"]:
            return None
        audit = report["audit"]
        if audit["gate"].get("passed") is not True or quality_gate(audit["baseline"], audit["prior_candidate"], audit["candidate"]) != audit["gate"]:
            return None
        if config_file.stat().st_size > 20000:
            return None
        if report.get("adapter_sha256") != digest(weights.read_bytes()):
            return None
        config = json.loads(config_file.read_text(encoding="utf-8"))
        if (config.get("base_model_name_or_path") != BASE or config.get("peft_type") != "LORA"
                or config.get("task_type") != "CAUSAL_LM" or config.get("r") != 4
                or config.get("lora_alpha") != 8 or set(config.get("target_modules", [])) != {"q_proj", "v_proj"}):
            return None
        return report
    except (OSError, ValueError, TypeError, AttributeError, KeyError):
        return None


def retain_previous(previous):
    if OUTPUT.exists():
        raise ValueError("Output already exists")
    shutil.copytree(previous, OUTPUT)
    outputs(artifact=True)


def write_report(report):
    ROOT.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    outputs(report=True)


def main():
    outputs(trained=False, artifact=False, report=False)
    raw = (ROOT / "candidate-train.jsonl").read_bytes()
    raw_eval = (ROOT / "candidate-eval.jsonl").read_bytes()
    raw_audit = (ROOT / "candidate-audit.jsonl").read_bytes()
    if len(raw) > 600000 or len(raw_eval) > 100000 or len(raw_audit) > 100000:
        raise ValueError("Corpus too large")
    rows = validate_rows([json.loads(line) for line in raw.decode().splitlines() if line], "train")
    evaluation = validate_rows([json.loads(line) for line in raw_eval.decode().splitlines() if line], "evaluation")
    audit_rows = validate_rows([json.loads(line) for line in raw_audit.decode().splitlines() if line], "audit")
    sets = [{r["task_key"] for r in split} for split in (rows, evaluation, audit_rows)]
    if any(sets[a] & sets[b] for a, b in ((0, 1), (0, 2), (1, 2))):
        raise ValueError("Evaluation leakage")
    data_digest, evaluation_digest, audit_digest = digest(raw), digest(raw_eval), digest(raw_audit)
    previous = ROOT / "previous"
    previous_report = verified_previous(previous, evaluation_digest, audit_digest)
    common = {"name": "Olena-Math-Qwen-Candidate-v3", "base": BASE, "base_revision": REVISION,
              "schema": SCHEMA, "trainer_version": TRAINER_VERSION, "dataset_sha256": data_digest,
              "evaluation_sha256": evaluation_digest, "audit_sha256": audit_digest, "examples": len(rows),
              "evaluation_examples": len(evaluation), "audit_examples": len(audit_rows),
              "metric": "exact_value_and_short_requested_format",
              "production_approved": False, "review": "Exact-answer math benchmark only; tutoring quality requires human review"}
    force = os.environ.get("OLENA_FORCE_TRAINING") == "true"
    if previous_report and previous_report.get("dataset_sha256") == data_digest and not force:
        retain_previous(previous)
        write_report({**previous_report, "status": "retained", "trained_this_run": False})
        outputs(artifact=True)
        print("Verified accepted corpus unchanged. Retaining accepted weights, no retraining.")
        return
    attempt_file = ROOT / "last-attempt" / "training-report.json"
    if attempt_file.is_file() and attempt_file.stat().st_size < 100000 and not force:
        attempt = json.loads(attempt_file.read_text(encoding="utf-8"))
        if (attempt.get("status") in {"rejected", "unchanged-rejection"}
                and attempt.get("trainer_version") == TRAINER_VERSION
                and attempt.get("dataset_sha256") == data_digest and attempt.get("evaluation_sha256") == evaluation_digest
                and attempt.get("audit_sha256") == audit_digest
                and attempt.get("base_revision") == REVISION):
            if previous_report:
                retain_previous(previous)
            write_report({**attempt, "status": "unchanged-rejection", "trained_this_run": False})
            print("Same rejected experiment. No repeated training without new data, configuration or explicit retry.")
            return

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import LoraConfig, PeftModel, get_peft_model

    torch.set_num_threads(2)
    torch.manual_seed(42)
    tokenizer = AutoTokenizer.from_pretrained(BASE, revision=REVISION, trust_remote_code=False)
    model = AutoModelForCausalLM.from_pretrained(BASE, revision=REVISION, trust_remote_code=False, dtype=torch.float32, use_safetensors=True)
    model.config.use_cache = False

    def evaluate(items):
        model.eval()
        results = []
        with torch.no_grad():
            for item in items:
                prompt = tokenizer.apply_chat_template(item["messages"], tokenize=False, add_generation_prompt=True)
                tokens = tokenizer(prompt, return_tensors="pt")
                generated = model.generate(**tokens, max_new_tokens=16, do_sample=False,
                                           pad_token_id=tokenizer.eos_token_id, use_cache=True)
                answer = tokenizer.decode(generated[0, tokens.input_ids.shape[1]:], skip_special_tokens=True).strip()
                results.append({"id": item["id"], "topic": item["topic"], "expected": item["expected"],
                                "answer": answer, "correct": numeric_answer(answer) == Fraction(item["expected"])})
        return results

    baseline = evaluate(evaluation)
    baseline_audit = evaluate(audit_rows)
    if previous_report:
        model = PeftModel.from_pretrained(model, previous, is_trainable=True, use_safetensors=True)
        prior_candidate = evaluate(evaluation)
        prior_audit = evaluate(audit_rows)
    else:
        prior_candidate = baseline
        prior_audit = baseline_audit
        model = get_peft_model(model, LoraConfig(r=4, lora_alpha=8, target_modules=["q_proj", "v_proj"],
                                               lora_dropout=0.05, task_type="CAUSAL_LM"))
    model.gradient_checkpointing_enable()
    model.enable_input_require_grads()
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=0.00005)
    order = list(range(len(rows)))
    random.Random(42).shuffle(order)
    losses = []
    model.train()
    for index in order[:MAX_STEPS]:
        messages = rows[index]["messages"]
        prefix = tokenizer.apply_chat_template(messages[:-1], tokenize=False, add_generation_prompt=True)
        full = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        tokens = tokenizer(full, return_tensors="pt", truncation=True, max_length=384)
        prefix_tokens = tokenizer(prefix).input_ids
        prefix_length = len(prefix_tokens)
        if tokens.input_ids[0, :prefix_length].tolist() != prefix_tokens:
            raise ValueError("Training prefix mismatch")
        labels = tokens.input_ids.clone()
        labels[:, :prefix_length] = -100
        if not (labels != -100).any():
            raise ValueError("No assistant tokens after truncation")
        optimizer.zero_grad(set_to_none=True)
        loss = model(**tokens, labels=labels).loss
        if not torch.isfinite(loss):
            raise ValueError("Non-finite training loss")
        loss.backward()
        torch.nn.utils.clip_grad_norm_((p for p in model.parameters() if p.requires_grad), 1.0)
        optimizer.step()
        losses.append(float(loss.detach()))
        print(f"CPU step {len(losses)}/{min(len(rows), MAX_STEPS)} loss={losses[-1]:.4f}", flush=True)
    candidate = evaluate(evaluation)
    candidate_audit = evaluate(audit_rows)
    gate = quality_gate(baseline, prior_candidate, candidate)
    audit_gate = quality_gate(baseline_audit, prior_audit, candidate_audit)
    accepted = gate["passed"] and audit_gate["passed"]
    report = {**common, "status": "accepted" if accepted else "rejected", "trained_this_run": True,
              "steps": len(losses), "losses": losses, "resumed_adapter": previous_report is not None,
              "baseline": baseline, "prior_candidate": prior_candidate, "candidate": candidate, "gate": gate,
              "audit": {"baseline": baseline_audit, "prior_candidate": prior_audit, "candidate": candidate_audit, "gate": audit_gate},
              "training_topics": {topic: sum(rows[i]["topic"] == topic for i in order[:MAX_STEPS]) for topic in TOPICS}}
    if accepted:
        if OUTPUT.exists():
            raise ValueError("Output already exists")
        OUTPUT.mkdir(parents=True)
        model.save_pretrained(OUTPUT, safe_serialization=True)
        tokenizer.save_pretrained(OUTPUT)
        report["adapter_sha256"] = digest((OUTPUT / "adapter_model.safetensors").read_bytes())
        (OUTPUT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        (OUTPUT / "README.md").write_text("# Olena Math Qwen Candidate v3\n\nExperimental LoRA adapter for pinned Qwen2.5-0.5B-Instruct (Apache-2.0). Original authored public exercises. Exact-answer benchmark passed; no production or tutoring approval.\n", encoding="utf-8")
        outputs(artifact=True)
    elif previous_report:
        retain_previous(previous)
        report["retained_previous_accepted"] = True
    write_report(report)
    outputs(trained=True, accepted=accepted)
    print(f"Evaluation: baseline={sum(r['correct'] for r in baseline)}/32, candidate={gate['correct']}/32, regressions={len(gate['regressions'])}, new audit={audit_gate['correct']}/32, accepted={accepted}. Production approval remains false.")


if __name__ == "__main__":
    main()
