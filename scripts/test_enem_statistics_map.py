import csv
import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(f"{name.replace('_', '-')}.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


mapper = load("build_enem_statistics_map")
builder = load("build_enem_question_statistics")
FIELDS = ["SG_AREA", "CO_PROVA", "CO_POSICAO", "TP_LINGUA", "TX_COR", "TX_GABARITO", "IN_ITEM_ABAN"]


def item_rows(area, code, positions, answers, color="AZUL"):
    return [{"SG_AREA": area, "CO_PROVA": str(code), "CO_POSICAO": str(position), "TP_LINGUA": language,
             "TX_COR": color, "TX_GABARITO": answers[index % len(answers)], "IN_ITEM_ABAN": "0"}
            for index, (position, language) in enumerate(positions)]


def write_items(reference, year, rows):
    folder = reference / "dados/ITENS_PROVAS"
    folder.mkdir(parents=True, exist_ok=True)
    with (folder / f"ITENS_PROVA_{year}.csv").open("w", encoding="latin1", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)


class MapTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.catalog = {"papers": [{"year": 2017, "day": 1, "variants": [
            {"id": "a" * 14, "label": "1º Dia - Caderno 1 - Azul", "url": "https://x/p.pdf", "answerUrl": "https://x/g.pdf"}]}]}

    def tearDown(self):
        self.directory.cleanup()

    def official(self):
        letters = "ABCDE"
        keys = {}
        for number in range(1, 6):
            keys[f"english:{number}"] = letters[number % 5]
            keys[f"spanish:{number}"] = letters[(number + 2) % 5]
        for number in range(6, 91):
            keys[f"q:{number}"] = letters[number % 5]
        return keys

    def language_rows(self, code):
        # 2017: inglês 1 a 5, espanhol 6 a 10, comuns 11 a 50 (espanhol não repete as posições 1 a 5).
        keys = self.official()
        positions = [(p, "0") for p in range(1, 6)] + [(p, "1") for p in range(6, 11)] + [(p, "") for p in range(11, 51)]
        rows = item_rows("LC", code, positions, "A")
        for row, key in zip(rows, [f"english:{n}" for n in range(1, 6)] + [f"spanish:{n}" for n in range(1, 6)]
                            + [f"q:{n}" for n in range(6, 46)]):
            row["TX_GABARITO"] = keys[key]
        return rows

    def test_linguagens_de_2017_usam_a_ordem_dos_itens_e_ignoram_a_lista_da_tri(self):
        write_items(self.root, 2017, self.language_rows(399))
        result = mapper.build(self.root, self.catalog, {(2017, 1): self.official()}, self.root / "tri", self.root / "map")
        mapped = [item for item in result if item["status"] == "mapeado"]
        self.assertEqual([(item["area"], item["code"]) for item in mapped], [("LC", 399)])
        bundle = json.loads((self.root / "map" / f"{'a' * 14}-LC.json").read_text(encoding="utf8"))
        keys = [item["key"] for item in bundle["items"]]
        self.assertIn("spanish:1", keys)
        self.assertIn("q:45", keys)
        self.assertNotIn("q:50", keys)

    def test_recusa_caderno_com_uma_resposta_diferente_do_gabarito_oficial(self):
        rows = self.language_rows(399)
        rows[20]["TX_GABARITO"] = "E" if rows[20]["TX_GABARITO"] != "E" else "D"
        write_items(self.root, 2017, rows)
        result = mapper.build(self.root, self.catalog, {(2017, 1): self.official()}, self.root / "tri", self.root / "map")
        self.assertEqual([item["status"] for item in result if item["area"] == "LC"], ["sem-correspondencia"])

    def test_nao_sobrescreve_caderno_que_ja_tem_mapeamento_tri(self):
        write_items(self.root, 2017, self.language_rows(399))
        (self.root / "tri").mkdir()
        (self.root / "tri" / f"{'a' * 14}-LC.json").write_text("{}", encoding="utf8")
        result = mapper.build(self.root, self.catalog, {(2017, 1): self.official()}, self.root / "tri", self.root / "map")
        self.assertEqual([item["status"] for item in result if item["area"] == "LC"], ["tri"])

    def test_agregador_usa_o_mapeamento_de_estatistica_sem_parametros_da_tri(self):
        items = [{"key": f"q:{n}", "answer": "AB"[n % 2], "excluded": False} for n in range(136, 181)]
        (self.root / "map").mkdir()
        (self.root / "tri").mkdir()
        (self.root / "map" / f"{'b' * 14}-MT.json").write_text(json.dumps({
            "year": 2019, "day": 2, "area": "MT", "variantId": "b" * 14, "examCode": 516,
            "officialUrl": "https://x/p.pdf", "answerUrl": "https://x/g.pdf", "items": items}), encoding="utf8")
        header = ["CO_PROVA_MT", "NU_NOTA_MT", "TX_RESPOSTAS_MT", "TP_LINGUA"]
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(header)
        writer.writerow(["516", "600", "A" * 45, "0"])
        writer.writerow(["516", "500", "B" * 44 + "A", "1"])
        writer.writerow(["999", "500", "C" * 45, "0"])
        archive = self.root / "p.zip"
        with zipfile.ZipFile(archive, "w") as bundle:
            bundle.writestr("PARTICIPANTES_2019.csv", buffer.getvalue())
        report = builder.aggregate(archive, 2019, self.root / "out", self.root / "tri", self.root / "map")
        self.assertEqual(report["questions"], 45)
        document = json.loads((self.root / "out" / f"{'b' * 14}.json").read_text(encoding="utf8"))
        first = document["questions"]["q:136"]["statistics"]
        self.assertEqual(first["population"], 2)
        self.assertEqual(first["counts"]["A"], 1)
        self.assertEqual(first["counts"]["B"], 1)

    def test_linguagens_com_vetor_de_50_separam_ingles_espanhol_e_comuns(self):
        letters = "ABCDE"
        items = ([{"key": f"english:{n}", "answer": "A", "excluded": False} for n in range(1, 6)]
                 + [{"key": f"spanish:{n}", "answer": "B", "excluded": False} for n in range(1, 6)]
                 + [{"key": f"q:{n}", "answer": letters[n % 5], "excluded": False} for n in range(6, 46)])
        (self.root / "map").mkdir()
        (self.root / "tri").mkdir()
        (self.root / "map" / f"{'c' * 14}-LC.json").write_text(json.dumps({
            "year": 2017, "day": 1, "area": "LC", "variantId": "c" * 14, "examCode": 399,
            "officialUrl": "https://x/p.pdf", "answerUrl": "https://x/g.pdf", "items": items}), encoding="utf8")
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["CO_PROVA_LC", "NU_NOTA_LC", "TX_RESPOSTAS_LC", "TP_LINGUA"])
        common = "C" * 40
        writer.writerow(["399", "600", "AAAAA" + "99999" + common, "0"])   # inglês
        writer.writerow(["399", "500", "99999" + "BBBBB" + common, "1"])   # espanhol
        writer.writerow(["399", "500", "AAAAA" + "BBBBB" + common, "0"])   # bloco do outro idioma com letras: recusado
        archive = self.root / "l.zip"
        with zipfile.ZipFile(archive, "w") as bundle:
            bundle.writestr("PARTICIPANTES_2017.csv", buffer.getvalue())
        report = builder.aggregate(archive, 2017, self.root / "out", self.root / "tri", self.root / "map")
        self.assertEqual(report["questions"], 50)
        questions = json.loads((self.root / "out" / f"{'c' * 14}.json").read_text(encoding="utf8"))["questions"]
        self.assertEqual(questions["english:1"]["statistics"]["counts"]["A"], 1)
        self.assertEqual(questions["english:1"]["statistics"]["population"], 1)
        self.assertEqual(questions["spanish:1"]["statistics"]["counts"]["B"], 1)
        self.assertEqual(questions["q:6"]["statistics"]["population"], 2)
        self.assertEqual(report["rejectedAreaVectors"], {"sem_nota_ou_vetor_de_45": 1})


if __name__ == "__main__":
    unittest.main()
