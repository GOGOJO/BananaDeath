"""Score a checkpoint on held-out data, compare with baselines, and plot the errors."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch

from .dataset import BananaDataset, eval_transform, load_rgb
from .manifest import IMAGE_DIR_NAME, ManifestRow, read_manifest, resolve_data_dir
from .metrics import regression_metrics
from .predict import Predictor

ML_ROOT = Path(__file__).resolve().parents[1]


def predict_rows(predictor: Predictor, rows: list[ManifestRow], data_dir: Path) -> np.ndarray:
    """Clamped predictions for each row, in manifest order."""
    dataset = BananaDataset(rows, data_dir, eval_transform())
    loader = torch.utils.data.DataLoader(dataset, batch_size=64)
    outputs = []
    with torch.inference_mode():
        for images, _ in loader:
            outputs.append(predictor.model.predict_days(images.to(predictor.device)).cpu().numpy())
    return np.clip(np.concatenate(outputs), predictor.low, predictor.high)


def per_label_mae(y_true: np.ndarray, y_pred: np.ndarray) -> dict[int, float]:
    """MAE within each true label, to show which ripeness stages are hard."""
    return {int(v): float(np.abs(y_pred[y_true == v] - v).mean()) for v in np.unique(y_true)}


def plot_predictions(y_true: np.ndarray, y_pred: np.ndarray, title: str, destination: Path) -> None:
    """Scatter of predicted against actual, with jitter so integer labels don't overlap."""
    rng = np.random.default_rng(0)
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))
    jitter = rng.uniform(-0.15, 0.15, size=len(y_true))
    axes[0].scatter(y_true + jitter, y_pred, alpha=0.6, s=18, color="#b8860b")
    axes[0].plot([1, 8], [1, 8], "--", color="gray", label="perfect")
    axes[0].set_xlabel("actual days_left")
    axes[0].set_ylabel("predicted days_left")
    axes[0].set_title(title)
    axes[0].legend()
    residuals = y_pred - y_true
    axes[1].hist(residuals, bins=20, color="#6b8e23")
    axes[1].axvline(0, color="gray", linestyle="--")
    axes[1].set_xlabel("predicted - actual (days)")
    axes[1].set_title("Residuals")
    fig.tight_layout()
    destination.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(destination, dpi=120)
    plt.close(fig)


def plot_worst(rows: list[ManifestRow], y_pred: np.ndarray, data_dir: Path, destination: Path, k: int = 8) -> list[dict]:
    """Save a grid of the ``k`` largest misses and return them as dictionaries."""
    errors = np.abs(y_pred - np.array([r.days_left for r in rows]))
    order = np.argsort(-errors)[:k]
    fig, axes = plt.subplots(2, (k + 1) // 2, figsize=(14, 6))
    worst = []
    for ax, i in zip(axes.ravel(), order, strict=False):
        row = rows[i]
        ax.imshow(load_rgb(data_dir / IMAGE_DIR_NAME / row.filename))
        ax.set_title(f"{row.filename}\nactual {row.days_left}, predicted {y_pred[i]:.1f}", fontsize=8)
        ax.axis("off")
        worst.append({"image_filename": row.filename, "actual": row.days_left, "predicted": round(float(y_pred[i]), 2)})
    fig.tight_layout()
    fig.savefig(destination, dpi=110)
    plt.close(fig)
    return worst


def main() -> None:
    """Evaluate on validation and test and write ``ml/reports/evaluation.json``."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", default=None)
    parser.add_argument("--manifest", default=str(ML_ROOT / "data" / "processed" / "manifest.csv"))
    parser.add_argument("--checkpoint", default=str(ML_ROOT / "checkpoints" / "best.pt"))
    parser.add_argument("--reports", default=str(ML_ROOT / "reports"))
    args = parser.parse_args()

    data_dir = resolve_data_dir(args.data_dir)
    rows = read_manifest(Path(args.manifest))
    predictor = Predictor(args.checkpoint)
    reports = Path(args.reports)
    figures = reports / "figures"
    figures.mkdir(parents=True, exist_ok=True)

    results: dict[str, object] = {"model_version": predictor.model_version}
    for split in ("val", "test"):
        split_rows = [r for r in rows if r.split == split]
        y_true = np.array([r.days_left for r in split_rows], dtype=float)
        y_pred = predict_rows(predictor, split_rows, data_dir)
        results[split] = {
            "n": len(split_rows),
            **regression_metrics(y_true, y_pred),
            "mae_by_label": per_label_mae(y_true, y_pred),
        }
        plot_predictions(y_true, y_pred, f"ResNet18 on {split}", figures / f"pred_vs_actual_{split}.png")
        if split == "test":
            results["test_worst"] = plot_worst(split_rows, y_pred, data_dir, figures / "worst_test_errors.png")
            with (reports / "test_predictions.csv").open("w", newline="") as handle:
                writer = csv.writer(handle)
                writer.writerow(["image_filename", "actual", "predicted", "abs_error"])
                for row, pred in zip(split_rows, y_pred, strict=True):
                    writer.writerow([row.filename, row.days_left, round(float(pred), 3), round(abs(float(pred) - row.days_left), 3)])

    baseline_path = reports / "baselines.json"
    if baseline_path.exists():
        results["baselines"] = json.loads(baseline_path.read_text())

    (reports / "evaluation.json").write_text(json.dumps(results, indent=2) + "\n")
    print(json.dumps({k: v for k, v in results.items() if k != "test_worst"}, indent=2))


if __name__ == "__main__":
    main()
