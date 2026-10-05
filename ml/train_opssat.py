"""
Model B - Telemetry anomaly classifier on OPSSAT-AD (ESA OPS-SAT CubeSat).

Input : ml/data/opssat/dataset.csv   (from https://zenodo.org/records/12588359)
Output: models/opssat_anomaly.joblib
        models/opssat_anomaly.metrics.json

Uses the dataset's own predefined train/test split so numbers are comparable with the published baselines.
"""
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)

HERE = Path(__file__).resolve().parent
CSV = HERE / "data" / "opssat" / "dataset.csv"
OUT = HERE.parent / "models"
OUT.mkdir(exist_ok=True)

# --- VERIFY against the printed columns; edit if the file uses different names ---
LABEL = "anomaly"   # 1 = anomalous fragment
SPLIT = "train"     # 1 = training row, 0 = test row  (confirm in the dataset README)
META = {LABEL, SPLIT, "timestamp", "segment", "channel"}


def report(y, pred, score):
    return {
        "accuracy": float(accuracy_score(y, pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y, pred)),
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, score)) if score is not None else None,
        "confusion_matrix": confusion_matrix(y, pred, labels=[0, 1]).tolist(),  # [[TN, FP], [FN, TP]]
    }


def main():
    if not CSV.exists():
        sys.exit(f"{CSV} not found - download dataset.csv from the OPSSAT-AD Zenodo record first")
    df = pd.read_csv(CSV)
    print("columns:", df.columns.tolist())
    if LABEL not in df.columns or SPLIT not in df.columns:
        sys.exit(f"Expected columns '{LABEL}' and '{SPLIT}' - edit LABEL/SPLIT at the top of this file")

    features = [c for c in df.select_dtypes(include=[np.number]).columns if c not in META]
    print(f"{len(features)} features:", features)
    tr, te = df[df[SPLIT] == 1], df[df[SPLIT] == 0]
    if len(tr) == 0 or len(te) == 0:
        sys.exit("split column is not 0/1 as expected - check the dataset README")

    Xtr, ytr = tr[features].astype("float64"), tr[LABEL].astype(int)
    Xte, yte = te[features].astype("float64"), te[LABEL].astype(int)

    model = RandomForestClassifier(n_estimators=500, class_weight="balanced", random_state=42, n_jobs=-1)
    model.fit(Xtr, ytr)
    score = model.predict_proba(Xte)[:, 1]
    pred = (score >= 0.5).astype(int)
    dummy = DummyClassifier(strategy="most_frequent").fit(Xtr, ytr)

    top = sorted(zip(features, model.feature_importances_), key=lambda x: -x[1])[:10]
    metrics = {
        "dataset": "OPSSAT-AD (ESA OPS-SAT), predefined train/test split",
        "n_train": int(len(tr)), "n_test": int(len(te)),
        "anomaly_rate_test": float(yte.mean()),
        "features": features,
        "threshold": 0.5,
        "model": report(yte, pred, score),
        "dummy_most_frequent": report(yte, dummy.predict(Xte), None),
        "top_features": [{"feature": f, "importance": float(i)} for f, i in top],
    }
    (OUT / "opssat_anomaly.metrics.json").write_text(json.dumps(metrics, indent=2))
    joblib.dump(model, OUT / "opssat_anomaly.joblib")
    m = metrics["model"]
    print(f"test: precision {m['precision']:.3f} recall {m['recall']:.3f} f1 {m['f1']:.3f} "
          f"auc {m['roc_auc']:.3f} bal-acc {m['balanced_accuracy']:.3f}")
    print("saved models/opssat_anomaly.metrics.json, opssat_anomaly.joblib")


if __name__ == "__main__":
    main()
