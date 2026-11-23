import csv
import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "statistics_builder", Path(__file__).with_name("build-enem-question-statistics.py"))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class StatisticsTest(unittest.TestCase):
    def test_separa_idioma_e_caderno_sem_perder_questoes_comuns(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            tri = root / "tri"
            tri.mkdir()
            items = [{"key": f"{language}:{n}", "answer": "B"}
                     for language in ("english", "spanish") for n in range(1, 6)]
            items += [{"key": f"q:{n}", "answer": "B"} for n in range(6, 46)]
            bundle = {"year": 2022, "area": "LC", "examCode": "1065", "variantId": "abcdef01234567",
                      "officialUrl": "https://download.inep.gov.br/paper.pdf",
                      "answerUrl": "https://download.inep.gov.br/key.pdf", "items": items}
            (tri / "bundle.json").write_text(json.dumps(bundle))
            stream = io.StringIO()
            writer = csv.DictWriter(stream, fieldnames=["CO_PROVA_LC", "NU_NOTA_LC", "TX_RESPOSTAS_LC", "TP_LINGUA"])
            writer.writeheader()
            for code, language, answers, score in [
                (1065, 0, "A" * 45, "500"), (1065, 1, "." + "B" * 44, "600"),
                (1066, 0, "C" * 45, "500"), (1065, 0, "D" * 45, ""),
            ]:
                writer.writerow({"CO_PROVA_LC": code, "NU_NOTA_LC": score,
                                 "TX_RESPOSTAS_LC": answers, "TP_LINGUA": language})
            archive = root / "participants.zip"
            with zipfile.ZipFile(archive, "w") as zip_file:
                zip_file.writestr("participants.csv", stream.getvalue())
            output = root / "output"
            report = builder.aggregate(archive, 2022, output, tri)
            document = json.loads((output / "abcdef01234567.json").read_text(encoding="utf-8"))
            questions = document["questions"]
            self.assertEqual(questions["english:1"]["statistics"]["counts"]["A"], 1)
            self.assertEqual(questions["spanish:1"]["statistics"]["counts"]["blank"], 1)
            self.assertEqual(questions["q:6"]["statistics"]["population"], 2)
            self.assertEqual(questions["q:6"]["statistics"]["counts"]["C"], 0)
            self.assertEqual(report["rejectedAreaVectors"], {"sem_nota_ou_vetor_de_45": 1})
            self.assertNotIn("TX_RESPOSTAS", json.dumps(document))


if __name__ == "__main__":
    unittest.main()
