"""Checks retention without downloading or executing a model."""
import hashlib
import json
import os
import runpy
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch


class RetentionTest(unittest.TestCase):
    def test_unchanged_corpus_preserves_weights_without_training(self):
        program = runpy.run_path(str(Path(__file__).with_name("train-olena-candidate.py")))
        fake_modules = {
            "torch": types.SimpleNamespace(set_num_threads=lambda _: None, manual_seed=lambda _: None),
            "transformers": types.SimpleNamespace(AutoModelForCausalLM=None, AutoTokenizer=None),
            "peft": types.SimpleNamespace(LoraConfig=None, PeftModel=None, get_peft_model=None),
        }
        initial_directory = Path.cwd()
        with tempfile.TemporaryDirectory() as directory:
            try:
                os.chdir(directory)
                root = Path(".olena-learning")
                previous = root / "previous"
                previous.mkdir(parents=True)
                corpus = json.dumps({"publicSynthetic": True, "check": "arithmetic-only"}).encode()
                (root / "candidate-train.jsonl").write_bytes(corpus)
                (previous / "adapter_model.safetensors").write_bytes(b"test weights only")
                (previous / "report.json").write_text(json.dumps({
                    "base_revision": program["REVISION"], "nonregression_smoke": True,
                    "dataset_sha256": hashlib.sha256(corpus).hexdigest(),
                }))
                output = str(Path(directory) / "outputs")
                with patch.dict("sys.modules", fake_modules), patch.dict(os.environ, {"GITHUB_OUTPUT": output}):
                    program["main"]()
                self.assertEqual((root / "candidate" / "adapter_model.safetensors").read_bytes(), b"test weights only")
                self.assertEqual(Path(output).read_text(), "trained=false\nartifact=true\n")
            finally:
                os.chdir(initial_directory)


if __name__ == "__main__":
    unittest.main()
