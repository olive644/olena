import unittest
from prepare_own_essay_data import prepare, prompt_context

def row(text, prompt="0", grades=None):
    grades = grades or [120] * 5
    return {"essay": repr([text]), "prompt": prompt, "competence": repr(grades), "score": str(sum(grades))}

class DataPreparationTests(unittest.TestCase):
    def test_mixed_prompt_context_formats(self):
        self.assertEqual(prompt_context("['Primeiro.', 'Segundo.']"), "Primeiro.\n\nSegundo.")
        self.assertEqual(prompt_context("Texto de apoio comum."), "Texto de apoio comum.")

    def test_duplicate_and_conflicting_labels(self):
        records, audit = prepare([row("A educação importa."), row("a educação importa!"), row("Outra redação."), row("Outra redação.", grades=[80] * 5)])
        self.assertEqual(len(records), 1)
        self.assertEqual(audit["duplicateRowsRemoved"], 1)
        self.assertEqual(audit["conflictingRowsExcluded"], 2)

    def test_same_text_across_prompts_is_excluded(self):
        records, _ = prepare([row("Mesmo texto.", "a"), row("Mesmo texto.", "b")])
        self.assertEqual(records, [])

    def test_prompt_groups_stay_disjoint_and_deterministic(self):
        rows = [row(f"Texto {i} exemplo {j}", str(i)) for i in range(20) for j in range(3)]
        a, _ = prepare(rows)
        b, _ = prepare(list(reversed(rows)))
        self.assertEqual({r["id"]: r["split"] for r in a}, {r["id"]: r["split"] for r in b})
        for prompt in {r["prompt"] for r in a}:
            self.assertEqual(len({r["split"] for r in a if r["prompt"] == prompt}), 1)

    def test_invalid_labels_and_executable_input_are_rejected(self):
        bad = row("Texto", grades=[20] * 5)
        attack = row("Texto")
        attack["essay"] = "__import__('os').getcwd()"
        records, audit = prepare([bad, attack])
        self.assertEqual(records, [])
        self.assertEqual(audit["invalidRows"], 2)

if __name__ == "__main__":
    unittest.main()
