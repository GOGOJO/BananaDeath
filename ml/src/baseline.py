"""Simple baselines the neural network has to beat.

1. ``mean``: always predict the training-set mean. Any useful model must beat it.
2. ``color_ridge``: ridge regression on HSV color histograms. Ripening is
   largely green -> yellow -> brown, so a color-only model shows how much of
   the task a hand-made feature already solves. If ResNet18 barely beats this,
   the deep model is not buying much.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .dataset import PadToSquare, load_rgb
from .manifest import IMAGE_DIR_NAME, ManifestRow, read_manifest, resolve_data_dir
from .metrics import regression_metrics

HUE_BINS, SAT_BINS, VAL_BINS = 18, 8, 8


def color_histogram(image: Image.Image) -> np.ndarray:
    """Concatenated, normalized hue, saturation, and value histograms of a 96x96 thumbnail."""
    hsv = np.asarray(PadToSquare()(image).resize((96, 96)).convert("HSV"), dtype=np.float32) / 255.0
    parts = [
        np.histogram(hsv[..., 0], bins=HUE_BINS, range=(0, 1))[0],
        np.histogram(hsv[..., 1], bins=SAT_BINS, range=(0, 1))[0],
        np.histogram(hsv[..., 2], bins=VAL_BINS, range=(0, 1))[0],
    ]
    features = np.concatenate(parts).astype(np.float32)
    return features / features.sum() * 3


def features_for(rows: list[ManifestRow], data_dir: Path) -> tuple[np.ndarray, np.ndarray]:
    """Feature matrix and target vector for a list of manifest rows."""
    x = np.stack([color_histogram(load_rgb(data_dir / IMAGE_DIR_NAME / r.filename)) for r in rows])
    y = np.array([r.days_left for r in rows], dtype=float)
    return x, y


def run_baselines(rows: list[ManifestRow], data_dir: Path) -> dict[str, object]:
    """Fit both baselines on train, pick ridge strength on validation, and score val and test."""
    split_rows = {s: [r for r in rows if r.split == s] for s in ("train", "val", "test")}
    data = {s: features_for(split_rows[s], data_dir) for s in split_rows}
    x_train, y_train = data["train"]

    results: dict[str, object] = {}
    mean = float(y_train.mean())
    results["mean"] = {s: regression_metrics(data[s][1], np.full_like(data[s][1], mean)) for s in ("val", "test")}

    best_alpha, best_mae, best_model = None, float("inf"), None
    for alpha in (0.1, 1.0, 3.0, 10.0, 30.0, 100.0):
        model = make_pipeline(StandardScaler(), Ridge(alpha=alpha)).fit(x_train, y_train)
        mae = regression_metrics(data["val"][1], model.predict(data["val"][0]))["mae"]
        if mae < best_mae:
            best_alpha, best_mae, best_model = alpha, mae, model
    assert best_model is not None
    results["color_ridge"] = {
        s: regression_metrics(data[s][1], np.clip(best_model.predict(data[s][0]), 1, 8)) for s in ("val", "test")
    }
    results["color_ridge_alpha"] = float(best_alpha)
    return results


def main() -> None:
    """Print baseline metrics and save them to ``ml/reports/baselines.json``."""
    import argparse

    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Score the mean and color-histogram baselines.")
    parser.add_argument("--data-dir", default=None)
    parser.add_argument("--manifest", default=str(root / "data" / "processed" / "manifest.csv"))
    parser.add_argument("--out", default=str(root / "reports" / "baselines.json"))
    args = parser.parse_args()

    results = run_baselines(read_manifest(Path(args.manifest)), resolve_data_dir(args.data_dir))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(results, indent=2) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
