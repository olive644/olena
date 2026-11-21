import unittest
import numpy as np
from threadpoolctl import threadpool_limits
from train_own_essay_grader import choose_heads, metrics, round_grades, structural_features, total_metrics, STRUCTURAL_NAMES

class TrainingTests(unittest.TestCase):
    def test_unseen_test_labels_cannot_change_training_or_alpha_selection(self):
        x = np.arange(40, dtype=float).reshape(10, 4) / 10
        y = np.tile(np.arange(10, dtype=float)[:, None] * 20, (1, 5))
        train, validation = np.arange(6), np.array([6, 7])
        first = choose_heads(x, y, train, validation)
        y[8:] = 0
        second = choose_heads(x, y, train, validation)
        np.testing.assert_array_equal(first[0], second[0])
        np.testing.assert_array_equal(first[1], second[1])
        self.assertEqual(first[2], second[2])

    def test_feature_contract_handles_empty_and_unicode_text(self):
        for text in ["", "A educação é um direito.\nPortanto, precisamos agir."]:
            values = structural_features(text)
            self.assertEqual(len(values), len(STRUCTURAL_NAMES))
            self.assertTrue(np.isfinite(values).all())

    def test_grade_scale_and_metric_arithmetic(self):
        np.testing.assert_array_equal(round_grades(np.array([-40, 0, 19, 20, 199, 260])), [0, 0, 0, 40, 200, 200])
        result = metrics(np.array([[0] * 5, [200] * 5]), np.array([[40] * 5, [160] * 5]), np.array(["a", "b"]))
        for competency in result:
            self.assertEqual(competency["mae"], 40)
            self.assertEqual(competency["rmse"], 40)
            self.assertEqual(competency["within40"], 1)
            self.assertEqual(competency["promptMacroMAE"], 40)
        total = total_metrics(np.array([[0] * 5, [200] * 5]), np.array([[40] * 5, [160] * 5]))
        self.assertEqual(total["mae"], 200)
        self.assertEqual(total["bias"], 0)
        self.assertEqual(total["maxAbsoluteError"], 200)

if __name__ == "__main__":
    with threadpool_limits(limits=4):
        unittest.main()
