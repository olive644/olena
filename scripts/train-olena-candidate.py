"""CPU LoRA bounded experiment. Never deploys or promotes a model."""
import hashlib
import json
import os
import shutil
from pathlib import Path

BASE = "Qwen/Qwen2.5-0.5B-Instruct"
REVISION = "7ae557604adf67be50417f59c2c2f167def9a775"
ROOT = Path(".olena-learning")
OUTPUT = ROOT / "candidate"


def main():
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import LoraConfig, PeftModel, get_peft_model

    torch.set_num_threads(2)
    torch.manual_seed(42)
    dataset = (ROOT / "candidate-train.jsonl").read_bytes()
    digest = hashlib.sha256(dataset).hexdigest()
    rows = [json.loads(line) for line in dataset.decode().splitlines() if line]
    if not 1 <= len(rows) <= 40 or any(
        row.get("publicSynthetic") is not True or row.get("check") != "arithmetic-only"
        for row in rows
    ):
        raise ValueError("Only bounded public synthetic corpus is allowed")
    previous = ROOT / "previous"
    report_path = previous / "report.json"
    previous_report = json.loads(report_path.read_text()) if report_path.exists() else {}
    resumable = (
        previous_report.get("base_revision") == REVISION
        and previous_report.get("nonregression_smoke") is True
        and (previous / "adapter_model.safetensors").exists()
    )
    if resumable and previous_report.get("dataset_sha256") == digest:
        shutil.copytree(previous, OUTPUT)
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as stream:
                stream.write("trained=false\nartifact=true\n")
        print("Corpus unchanged. No training. Renew small adapter retention only.")
        return
    tokenizer = AutoTokenizer.from_pretrained(BASE, revision=REVISION, trust_remote_code=False)
    model = AutoModelForCausalLM.from_pretrained(
        BASE, revision=REVISION, trust_remote_code=False, dtype=torch.float32
    )
    model.config.use_cache = False
    holdouts = [(2, 3), (6, 7), (12, 4), (8, 9)]

    def evaluate():
        model.eval()
        results = []
        with torch.no_grad():
            for a, b in holdouts:
                prompt = tokenizer.apply_chat_template(
                    [{"role": "user", "content": f"Quanto é {a} + {b}? Responda somente o número."}],
                    tokenize=False, add_generation_prompt=True,
                )
                tokens = tokenizer(prompt, return_tensors="pt")
                generated = model.generate(**tokens, max_new_tokens=12, do_sample=False,
                                           pad_token_id=tokenizer.eos_token_id, use_cache=True)
                answer = tokenizer.decode(generated[0, tokens.input_ids.shape[1]:], skip_special_tokens=True).strip()
                results.append({"prompt": f"{a}+{b}", "expected": str(a + b),
                                "answer": answer, "correct": answer == str(a + b)})
        return results

    baseline = evaluate()
    if resumable:
        model = PeftModel.from_pretrained(model, previous, is_trainable=True)
        prior_candidate = evaluate()
    else:
        prior_candidate = baseline
        model = get_peft_model(model, LoraConfig(
            r=4, lora_alpha=8, target_modules=["q_proj", "v_proj"],
            lora_dropout=0.05, task_type="CAUSAL_LM",
        ))
    model.gradient_checkpointing_enable()
    model.enable_input_require_grads()
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=0.0001)
    losses = []
    model.train()
    for step in range(16):
        messages = rows[step % len(rows)]["messages"]
        prefix = tokenizer.apply_chat_template(messages[:-1], tokenize=False, add_generation_prompt=True)
        full = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        tokens = tokenizer(full, return_tensors="pt", truncation=True, max_length=384)
        prefix_length = len(tokenizer(prefix).input_ids)
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
        print(f"CPU step {step + 1}/16 loss={losses[-1]:.4f}", flush=True)
    candidate = evaluate()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(OUTPUT, safe_serialization=True)
    tokenizer.save_pretrained(OUTPUT)
    report = {
        "name": "Llama-Olena-Qwen-Candidate", "base": BASE, "base_revision": REVISION,
        "dataset_sha256": digest, "examples": len(rows), "steps": len(losses),
        "losses": losses, "resumed_adapter": resumable,
        "baseline": baseline, "prior_candidate": prior_candidate, "candidate": candidate,
        "nonregression_smoke": sum(r["correct"] for r in candidate) >= max(
            sum(r["correct"] for r in baseline), sum(r["correct"] for r in prior_candidate)),
        "production_approved": False, "review": "Arithmetic-only, not pedagogically reviewed",
    }
    (OUTPUT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
    (OUTPUT / "README.md").write_text(
        "# Llama-Olena-Qwen-Candidate\nBuilt with Llama.\n\n"
        "Experimental CPU LoRA adapter, not a standalone model and not approved for production.\n"
        "Requires Qwen2.5-0.5B-Instruct (Apache-2.0). Synthetic teacher: Llama 3.3.\n"
        "Arithmetic smoke checks do not establish tutoring quality. No student conversations.\n"
    )
    (OUTPUT / "NOTICE").write_text(
        "Llama 3.3 is licensed under the Llama 3.3 Community License, Copyright © Meta Platforms, Inc. All Rights Reserved.\n"
    )
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as stream:
            stream.write("trained=true\nartifact=true\n")
    print("Actual weights saved. Production approval remains false.")


if __name__ == "__main__":
    main()
