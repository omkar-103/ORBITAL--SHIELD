"""
Model A - Battery health (State of Health) on the NASA PCoE Li-ion Battery Aging dataset.

Input : ml/data/nasa_battery/B0005.mat, B0006.mat, B0007.mat, B0018.mat
Output: models/battery_soh.joblib
        models/battery_soh.metrics.json   (leave-one-battery-out metrics vs dummy baseline)
        models/battery_replay.json        (held-out true vs predicted SOH per cycle, for the app's Model Lab)

Protocol: leave-one-battery-out (train on 3 cells, test on the 4th). Rows from the same cell are never
split between train and test (neighbouring cycles are near-identical and would leak).
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.io import loadmat
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

HERE = Path(__file__).resolve().parent
DATA = HERE / "data" / "nasa_battery"
OUT = HERE.parent / "models"
OUT.mkdir(exist_ok=True)

CELLS = ["B0005", "B0006", "B0007", "B0018"]
NOMINAL_AH = 2.0          # nominal capacity of these 18650 cells
EOL_AH = 1.4              # end of life = 70% of nominal
WINDOW_S = 600.0          # early-discharge window (cells use different cut-off voltages, so don't use the whole cycle)
FEATURES = ["v_mean_ratio", "v_end_ratio", "t_mean_delta"]


def load_cell(name: str) -> pd.DataFrame:
    path = DATA / f"{name}.mat"
    if not path.exists():
        raise FileNotFoundError(f"{path} not found - download the NASA PCoE battery files first (see the plan, section 1.1)")
    mat = loadmat(path, simplify_cells=True)
    cycles = mat[name]["cycle"]
    rows = []
    for c in cycles:
        if c["type"] != "discharge":
            continue
        d = c["data"]
        t = np.atleast_1d(d["Time"]).astype(float)
        v = np.atleast_1d(d["Voltage_measured"]).astype(float)
        temp = np.atleast_1d(d["Temperature_measured"]).astype(float)
        if len(t) < 10:
            continue
        m = t <= t[0] + WINDOW_S
        if m.sum() < 5:
            continue
        rows.append({
            "cell": name,
            "capacity": float(np.atleast_1d(d["Capacity"])[0]),
            "v_mean": float(v[m].mean()),
            "v_end": float(v[m][-1]),
            "t_mean": float(temp[m].mean()),
        })
    df = pd.DataFrame(rows).reset_index(drop=True)
    df["cycle_n"] = np.arange(len(df))
    base = df.iloc[0]  # per-cell baseline = its own first discharge cycle
    df["v_mean_ratio"] = df["v_mean"] / base["v_mean"]
    df["v_end_ratio"] = df["v_end"] / base["v_end"]
    df["t_mean_delta"] = df["t_mean"] - base["t_mean"]
    df["soh"] = (df["capacity"] / NOMINAL_AH).clip(0, 1.2)
    below = df.index[df["capacity"] <= EOL_AH]
    df["eol_cycle"] = int(df.loc[below[0], "cycle_n"]) if len(below) else -1
    return df


def make_model() -> GradientBoostingRegressor:
    return GradientBoostingRegressor(
        n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8, random_state=42
    )


def main():
    df = pd.concat([load_cell(c) for c in CELLS], ignore_index=True)
    summary = df.groupby("cell").agg(
        n_cycles=("capacity", "size"), cap_first=("capacity", "first"),
        cap_last=("capacity", "last"), eol_cycle=("eol_cycle", "first"),
    )
    print(summary)
    assert summary["n_cycles"].min() > 50, "too few discharge cycles - check the .mat parsing"

    per_cell, replay = {}, {}
    for held in CELLS:
        tr, te = df[df.cell != held], df[df.cell == held]
        model = make_model().fit(tr[FEATURES], tr["soh"])
        pred = model.predict(te[FEATURES])
        dummy = np.full(len(te), tr["soh"].mean())  # fold-correct baseline: predict the training mean
        per_cell[held] = {
            "mae": float(mean_absolute_error(te["soh"], pred)),
            "rmse": float(np.sqrt(mean_squared_error(te["soh"], pred))),
            "dummy_mae": float(mean_absolute_error(te["soh"], dummy)),
            "n_test": int(len(te)),
        }
        replay[held] = [
            {"cycle": int(c), "soh_true": round(float(a), 4), "soh_pred": round(float(b), 4)}
            for c, a, b in zip(te["cycle_n"], te["soh"], pred)
        ]
        print(f"{held}: MAE {per_cell[held]['mae']:.4f} (dummy {per_cell[held]['dummy_mae']:.4f})")

    mean_mae = float(np.mean([v["mae"] for v in per_cell.values()]))
    mean_dummy = float(np.mean([v["dummy_mae"] for v in per_cell.values()]))
    metrics = {
        "dataset": "NASA PCoE Li-ion Battery Aging (B0005, B0006, B0007, B0018)",
        "task": "State-of-health regression (capacity / 2.0 Ah)",
        "protocol": "leave-one-battery-out",
        "features": FEATURES,
        "feature_note": "ratios/deltas vs the cell's own first discharge cycle, over the first 600 s of each discharge",
        "per_cell": per_cell,
        "mean_mae": mean_mae,
        "mean_dummy_mae": mean_dummy,
        "beats_dummy": bool(mean_mae < mean_dummy),
        "eol_cycle_per_cell": {k: int(v) for k, v in summary["eol_cycle"].items()},
    }
    (OUT / "battery_soh.metrics.json").write_text(json.dumps(metrics, indent=2))
    (OUT / "battery_replay.json").write_text(json.dumps(replay))
    joblib.dump(make_model().fit(df[FEATURES], df["soh"]), OUT / "battery_soh.joblib")
    print(f"mean MAE {mean_mae:.4f} vs dummy {mean_dummy:.4f} -> beats dummy: {metrics['beats_dummy']}")
    print("saved models/battery_soh.metrics.json, battery_replay.json, battery_soh.joblib")


if __name__ == "__main__":
    main()
