"""Train five small regression heads over frozen local representations.

Exploratory research only. Test prompts are disjoint and never used to fit
vocabulary, scaling, regression weights or regularization selection.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import time

os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "4")

import numpy as np
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.metrics import cohen_kappa_score
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits

ROOT = Path(__file__).resolve().parent.parent
LAB = ROOT / "tmp/essay-own-grader"
LEVELS = np.arange(0, 201, 40)
STRUCTURAL_NAMES = ["log_words", "log_chars", "paragraphs", "sentences", "mean_word_length", "words_per_sentence", "unique_word_ratio", "unique_bigram_ratio", "commas_per_word", "periods_per_word", "semicolons_per_word", "questions_per_word", "long_word_ratio", "connectors_per_word"]

def structural_features(text):
    words = re.findall(r"[^\W\d_]+", text.casefold(), re.UNICODE)
    n = max(len(words), 1)
    sentences = max(len(re.findall(r"[.!?]+", text)), 1)
    bigrams = list(zip(words, words[1:]))
    connectors = sum(text.casefold().count(word) for word in ["portanto", "entretanto", "além disso", "porém", "assim", "desse modo"])
    return [np.log1p(len(words)), np.log1p(len(text)), len([p for p in text.split("\n") if p.strip()]), sentences,
            sum(map(len, words)) / n, len(words) / sentences, len(set(words)) / n,
            len(set(bigrams)) / max(len(bigrams), 1), text.count(",") / n, text.count(".") / n,
            text.count(";") / n, text.count("?") / n, sum(len(w) >= 9 for w in words) / n, connectors / n]

def round_grades(values):
    return (np.floor(np.clip(values, 0, 200) / 40 + .5) * 40).astype(int)

def total_metrics(actual, predicted):
    differences = predicted.sum(axis=1) - actual.sum(axis=1)
    return {"mae": float(np.abs(differences).mean()), "rmse": float(np.sqrt(np.mean(differences ** 2))),
            "bias": float(differences.mean()), "exactAccuracy": float((differences == 0).mean()),
            "within80": float((np.abs(differences) <= 80).mean()), "maxAbsoluteError": int(np.abs(differences).max())}

def metrics(actual, predicted, prompts):
    result = []
    for c in range(5):
        error = np.abs(actual[:, c] - predicted[:, c])
        groups = [float(error[prompts == p].mean()) for p in sorted(set(prompts))]
        result.append({"competency": f"C{c + 1}", "mae": float(error.mean()), "rmse": float(np.sqrt(np.mean(error ** 2))),
            "exactAccuracy": float((error == 0).mean()), "within40": float((error <= 40).mean()),
            "errorsOver80": int((error > 80).sum()), "promptMacroMAE": float(np.mean(groups)),
            "qwk": float(cohen_kappa_score(actual[:, c], predicted[:, c], labels=LEVELS, weights="quadratic")),
            "byHumanGrade": [{"grade": int(g), "count": int((actual[:, c] == g).sum()),
                "mae": float(error[actual[:, c] == g].mean()) if (actual[:, c] == g).any() else None} for g in LEVELS]})
    return result

def choose_heads(x, y, train, validation):
    fitted = []
    for alpha in [.1, 1., 10., 100., 1000.]:
        regressor = Ridge(alpha=alpha, solver="lsqr", tol=1e-5, max_iter=1000).fit(x[train], y[train])
        predicted = round_grades(regressor.predict(x[validation]))
        fitted.append((alpha, regressor, np.abs(y[validation] - predicted).mean(axis=0)))
    choices = [min(range(len(fitted)), key=lambda i: (fitted[i][2][c], -fitted[i][0])) for c in range(5)]
    weights = np.stack([fitted[choice][1].coef_[c] for c, choice in enumerate(choices)])
    intercept = np.array([fitted[choice][1].intercept_[c] for c, choice in enumerate(choices)])
    return weights, intercept, [fitted[choice][0] for choice in choices]

def main():
    started = time.perf_counter()
    records = [json.loads(line) for line in (LAB / "records.jsonl").read_text(encoding="utf-8").splitlines()]
    index = json.loads((LAB / "embedding-index.json").read_text(encoding="utf-8"))
    prompt_index = json.loads((LAB / "prompt-embedding-index.json").read_text(encoding="utf-8"))
    assert [r["id"] for r in records] == [r["id"] for r in index["rows"]]
    assert index["encodedTokens"] == index["totalTokens"] and index["truncated"] is False
    assert prompt_index["model"] == index["model"]
    for meta, prefix, input_file in [(index, "", "records.jsonl"), (prompt_index, "prompt-", "prompts.json")]:
        if hashlib.sha256((LAB / input_file).read_bytes()).hexdigest() != meta["inputSha256"]:
            raise ValueError("Embedding input checksum mismatch")
        if hashlib.sha256((LAB / f"{prefix}embeddings.f32").read_bytes()).hexdigest() != meta["featuresSha256"]:
            raise ValueError("Embedding checksum mismatch")
    embeddings = np.fromfile(LAB / "embeddings.f32", dtype="<f4").reshape(len(records), 768)
    contexts = np.fromfile(LAB / "prompt-embeddings.f32", dtype="<f4").reshape(len(prompt_index["rows"]), 768)
    context_lookup = {row["id"]: contexts[i, :384] for i, row in enumerate(prompt_index["rows"])}
    context_vectors = np.stack([context_lookup[row["prompt"]] for row in records])
    relatedness = (embeddings[:, :384] * context_vectors).sum(axis=1, keepdims=True)
    structures = np.array([structural_features(row["text"]) for row in records])
    semantic = np.hstack([embeddings, embeddings[:, :384] * context_vectors, relatedness, structures])
    y = np.array([row["grades"] for row in records])
    prompts = np.array([row["prompt"] for row in records])
    splits = {name: np.array([i for i, row in enumerate(records) if row["split"] == name]) for name in ["train", "validation", "test"]}
    train, validation, test = (splits[name] for name in ["train", "validation", "test"])
    for a, b in [(train, validation), (train, test), (validation, test)]:
        assert not set(prompts[a]) & set(prompts[b])
    median = round_grades(np.median(y[train], axis=0))
    baseline = np.tile(median, (len(test), 1))
    baseline_metrics = metrics(y[test], baseline, prompts[test])
    struct_scaler = StandardScaler().fit(structures[train])
    struct_matrix = struct_scaler.transform(structures)
    semantic_scaler = StandardScaler().fit(semantic[train])
    semantic_matrix = semantic_scaler.transform(semantic)
    candidates = [("structure-only", struct_matrix), ("frozen-semantic-plus-structure", semantic_matrix)]
    # Lexical control: fit vocabulary and IDF only on train, never the held-out topics.
    vectorizer = TfidfVectorizer(analyzer="char", ngram_range=(3, 5), min_df=5, max_features=8000, dtype=np.float64)
    vectorizer.fit([records[i]["text"] for i in train])
    lexical = vectorizer.transform([row["text"] for row in records])
    candidates.append(("lexical-plus-structure", hstack([lexical, csr_matrix(struct_matrix)]).tocsr()))
    results, semantic_export = [], None
    for name, matrix in candidates:
        weights, intercept, alphas = choose_heads(matrix, y, train, validation)
        # All choices are frozen before accessing test labels for this candidate.
        predicted = round_grades(np.asarray(matrix[test] @ weights.T) + intercept)
        measured = metrics(y[test], predicted, prompts[test])
        rng = np.random.default_rng(731)
        deltas = np.array([np.abs(y[test][prompts[test] == p] - baseline[prompts[test] == p]).mean(axis=0) - np.abs(y[test][prompts[test] == p] - predicted[prompts[test] == p]).mean(axis=0) for p in sorted(set(prompts[test]))])
        bootstrap = np.array([deltas[rng.integers(0, len(deltas), len(deltas))].mean(axis=0) for _ in range(1000)])
        low, high = np.quantile(bootstrap, [.025, .975], axis=0)
        for c, entry in enumerate(measured):
            entry["promptClusterMAEImprovementVsMedian95"] = [float(low[c]), float(high[c])]
        validation_prediction = round_grades(np.asarray(matrix[validation] @ weights.T) + intercept)
        result = {"name": name, "selectedAlphas": alphas,
            "selectedValidationMAE": np.abs(y[validation] - validation_prediction).mean(axis=0).tolist(),
            "testMetrics": measured, "testTotalMetrics": total_metrics(y[test], predicted),
            "predictions": [{"id": records[i]["id"], "prompt": records[i]["prompt"], "human": y[i].tolist(), "predicted": predicted[j].tolist()} for j, i in enumerate(test)]}
        results.append(result)
        print(json.dumps({"candidate": name, "testMAE": [r["mae"] for r in measured]}), flush=True)
        if name == "frozen-semantic-plus-structure":
            semantic_export = {"schemaVersion": 1, "deploymentEnabled": False, "encoder": index["model"],
                "input": {"chunkTokens": 126, "aggregation": "token-weighted normalized mean plus last chunk", "structuralFeatureNames": STRUCTURAL_NAMES,
                    "featureOrder": ["mean384", "last384", "meanTimesPrompt384", "promptCosine", "structure14"]},
                "featureMean": semantic_scaler.mean_.tolist(), "featureScale": semantic_scaler.scale_.tolist(),
                "weights": weights.tolist(), "intercepts": intercept.tolist(), "selectedAlphas": alphas,
                "labels": LEVELS.tolist(), "qualification": "Experimental estimates; no human review or deployment approval"}
    (LAB / "semantic-head.json").write_text(json.dumps(semantic_export, separators=(",", ":")) + "\n", encoding="utf-8")
    own = next(candidate for candidate in results if candidate["name"] == "frozen-semantic-plus-structure")
    (LAB / "js-head-fixtures.json").write_text(json.dumps([{"features": semantic[i].tolist(), "expected": own["predictions"][j]["predicted"]} for j, i in enumerate(test[:3])]), encoding="utf-8")
    report = {"schemaVersion": 1, "deploymentEnabled": False, "source": json.loads((LAB / "source.json").read_text(encoding="utf-8")),
        "protocol": {"split": "prompt-disjoint 60/13/13 themes", "fit": "train only", "alphaSelection": "validation MAE only; larger alpha breaks ties", "testUsedForSelection": False,
            "bootstrap": "1000 resamples of held-out prompt clusters, seed 731", "newHumanReview": False},
        "counts": {name: len(indices) for name, indices in splits.items()},
        "encoding": {k: index[k] for k in ["model", "totalTokens", "encodedTokens", "totalChunks", "truncated", "seconds"]},
        "baseline": {"name": "train-median", "grades": median.tolist(), "testMetrics": baseline_metrics,
            "testTotalMetrics": total_metrics(y[test], baseline)},
        "candidates": results, "exportBytes": (LAB / "semantic-head.json").stat().st_size,
        "artifactSha256": hashlib.sha256((LAB / "semantic-head.json").read_bytes()).hexdigest(),
        "trainingAndEvaluationSeconds": time.perf_counter() - started,
        "releaseBlockers": ["Independent human review missing", "Validation on real app prose and mobile missing", "Third-party corpus-text rights not independently cleared", "Robustness and zero-score situations not yet fully validated"]}
    (ROOT / "docs/research/essay-own-training.json").write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"complete": True, "exportBytes": report["exportBytes"], "seconds": report["trainingAndEvaluationSeconds"]}), flush=True)

if __name__ == "__main__":
    with threadpool_limits(limits=4):
        main()
