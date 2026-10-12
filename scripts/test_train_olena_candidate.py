"""Dataset, regression gates, and retention tests; no model downloads."""
import json
import os
import runpy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from olena_training_data import TOPICS, records, solution, validate_rows, write_corpus, digest

PROGRAM = runpy.run_path(str(Path(__file__).with_name("train-olena-candidate.py")))


def scores(correct=True):
    return [{"id": r["id"], "topic": r["topic"], "correct": correct, "expected": r["expected"], "answer": r["expected"] if correct else "999"} for r in records("evaluation")]


class TrainingTests(unittest.TestCase):
    def test_diverse_disjoint_corpus_and_known_answers(self):
        training, evaluation = records("train"), records("evaluation")
        self.assertEqual(len(training), 96)
        self.assertEqual(len(evaluation), 32)
        self.assertFalse({r["task_key"] for r in training} & {r["task_key"] for r in evaluation})
        self.assertEqual({topic: sum(r["topic"] == topic for r in training) for topic in TOPICS}, dict.fromkeys(TOPICS, 12))
        self.assertEqual(str(solution("fractions", [1, 3, 1, 6])[0]), "1/2")
        self.assertEqual(str(solution("percentages", [20, 150])[0]), "30")
        self.assertEqual(str(solution("linear-equations", [2, 3, 11])[0]), "4")
        self.assertEqual(str(solution("subtraction", [4, 5])[0]), "-1")
        self.assertEqual(str(solution("division", [3, 2])[0]), "3/2")

    def test_changed_expected_or_explanation_is_rejected(self):
        for field in ("expected", "source", "operands"):
            data = records("train")
            data[0][field] = "tampered"
            with self.assertRaises(ValueError):
                validate_rows(data, "train")
        data = records("train")
        data[1]["messages"][-1]["content"] = "Wrong explanation"
        with self.assertRaises(ValueError):
            validate_rows(data, "train")

    def test_numeric_answers_compare_exact_values_and_reject_ambiguous_text(self):
        parse = PROGRAM["numeric_answer"]
        self.assertEqual(parse("0,5"), parse("1/2"))
        self.assertEqual(parse("x = 4"), parse("4"))
        for value in ("4 ou 5", "0/0", "Tenho 4", "1.000 reais", "NaN", "1e9", "4;exec()"):
            self.assertIsNone(parse(value))

    def test_regression_cannot_hide_behind_a_higher_total(self):
        baseline, prior, candidate = scores(False), scores(False), scores(True)
        baseline[0]["correct"] = True
        candidate[0]["correct"] = False
        gate = PROGRAM["quality_gate"](baseline, prior, candidate)
        self.assertEqual(gate["correct"], 31)
        self.assertFalse(gate["passed"])
        self.assertEqual(gate["regressions"], [baseline[0]["id"]])

    def test_absolute_and_per_topic_floors_are_required(self):
        self.assertTrue(PROGRAM["quality_gate"](scores(False), scores(False), scores(True))["passed"])
        weak = scores(False)
        self.assertFalse(PROGRAM["quality_gate"](weak, weak, weak)["passed"])
        candidate = scores(True)
        for r in candidate:
            if r["topic"] == TOPICS[0]:
                r["correct"] = False
        self.assertFalse(PROGRAM["quality_gate"](scores(False), scores(False), candidate)["passed"])

    def test_evaluation_order_cannot_be_changed(self):
        with self.assertRaises(ValueError):
            PROGRAM["quality_gate"](scores(), scores(), list(reversed(scores())))

    def test_unchanged_verified_weights_retained_without_importing_torch(self):
        initial = Path.cwd()
        with tempfile.TemporaryDirectory() as directory:
            try:
                os.chdir(directory)
                write_corpus()
                previous = Path(".olena-learning/previous")
                previous.mkdir()
                weights = b"test fixture, not real weights"
                (previous / "adapter_model.safetensors").write_bytes(weights)
                (previous / "adapter_config.json").write_text(json.dumps({"base_model_name_or_path":PROGRAM["BASE"],"peft_type":"LORA","task_type":"CAUSAL_LM","r":4,"lora_alpha":8,"target_modules":["q_proj","v_proj"]}))
                report = {"status":"accepted","base_revision": PROGRAM["REVISION"], "trainer_version":PROGRAM["TRAINER_VERSION"],"schema":"olena-authored-math-v2","gate":PROGRAM["quality_gate"](scores(),scores(),scores()),"baseline":scores(),"prior_candidate":scores(),"candidate":scores(),"production_approved":False,"adapter_sha256":digest(weights),"dataset_sha256":digest(Path(".olena-learning/candidate-train.jsonl").read_bytes()),"evaluation_sha256":digest(Path(".olena-learning/candidate-eval.jsonl").read_bytes())}
                (previous / "report.json").write_text(json.dumps(report))
                output = str(Path(directory) / "outputs")
                with patch.dict(os.environ, {"GITHUB_OUTPUT":output,"OLENA_FORCE_TRAINING":"false"}), patch.dict("sys.modules", {"torch":None}):
                    PROGRAM["main"]()
                self.assertEqual(Path(".olena-learning/candidate/adapter_model.safetensors").read_bytes(),weights)
                self.assertIn("artifact=true",Path(output).read_text())
                self.assertFalse(json.loads(Path(".olena-learning/training-report.json").read_text())["trained_this_run"])
                (previous / "adapter_model.safetensors").write_bytes(b"tampered")
                self.assertIsNone(PROGRAM["verified_previous"](previous,report["evaluation_sha256"]))
            finally:
                os.chdir(initial)

    def test_preserving_accepted_weights_does_not_replace_their_report(self):
        initial = Path.cwd()
        with tempfile.TemporaryDirectory() as directory:
            try:
                os.chdir(directory)
                previous = Path(".olena-learning/previous")
                previous.mkdir(parents=True)
                (previous / "adapter_model.safetensors").write_bytes(b"accepted fixture")
                (previous / "report.json").write_text('{"status":"accepted"}')
                PROGRAM["retain_previous"](previous)
                self.assertEqual(Path(".olena-learning/candidate/adapter_model.safetensors").read_bytes(),b"accepted fixture")
                self.assertEqual(json.loads(Path(".olena-learning/candidate/report.json").read_text())["status"],"accepted")
                PROGRAM["write_report"]({"status":"rejected"})
                self.assertEqual(json.loads(Path(".olena-learning/candidate/report.json").read_text())["status"],"accepted")
                self.assertEqual(json.loads(Path(".olena-learning/training-report.json").read_text())["status"],"rejected")
            finally:
                os.chdir(initial)

    def test_identical_rejected_attempt_is_not_retrained(self):
        initial = Path.cwd()
        with tempfile.TemporaryDirectory() as directory:
            try:
                os.chdir(directory)
                write_corpus()
                path = Path(".olena-learning/last-attempt")
                path.mkdir()
                report = {"status":"rejected","base_revision":PROGRAM["REVISION"],"trainer_version":PROGRAM["TRAINER_VERSION"],"dataset_sha256":digest(Path(".olena-learning/candidate-train.jsonl").read_bytes()),"evaluation_sha256":digest(Path(".olena-learning/candidate-eval.jsonl").read_bytes())}
                (path / "training-report.json").write_text(json.dumps(report))
                with patch.dict(os.environ,{"OLENA_FORCE_TRAINING":"false"}),patch.dict("sys.modules",{"torch":None}):
                    PROGRAM["main"]()
                self.assertFalse(Path(".olena-learning/candidate").exists())
                self.assertEqual(json.loads(Path(".olena-learning/training-report.json").read_text())["status"],"unchanged-rejection")
            finally:
                os.chdir(initial)


if __name__ == "__main__":
    unittest.main()
