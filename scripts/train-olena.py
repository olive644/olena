"""Treinamento explícito, separado do servidor e sem promoção automática."""
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True, help="Modelo base com licença verificada")
    parser.add_argument("--dataset", default=".olena-learning/train.jsonl")
    parser.add_argument("--output", default=".olena-learning/candidate")
    args = parser.parse_args()
    rows = [json.loads(line) for line in Path(args.dataset).read_text(encoding="utf-8").splitlines() if line]
    if not rows or any(not isinstance(row.get("messages"), list) for row in rows):
        raise ValueError("Dataset aprovado ausente ou inválido")
    from datasets import Dataset
    from peft import LoraConfig
    from trl import SFTConfig, SFTTrainer

    trainer = SFTTrainer(
        model=args.base,
        train_dataset=Dataset.from_list(rows),
        args=SFTConfig(
            output_dir=args.output,
            max_length=1024,
            per_device_train_batch_size=1,
            gradient_accumulation_steps=8,
            num_train_epochs=1,
            learning_rate=1e-4,
            report_to="none",
        ),
        peft_config=LoraConfig(r=8, lora_alpha=16, target_modules="all-linear", task_type="CAUSAL_LM"),
    )
    trainer.train()
    trainer.save_model(args.output)
    print("Adaptador candidato salvo. Requer modelo base e avaliação antes de uso no app.")


if __name__ == "__main__":
    main()
