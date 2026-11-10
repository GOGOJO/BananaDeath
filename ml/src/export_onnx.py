"""Export the trained checkpoint to ONNX for in-browser inference, and check it matches PyTorch."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
from torch import nn

from .dataset import IMAGENET_MEAN, IMAGENET_STD, PAD_FILL, BananaDataset, eval_transform
from .manifest import read_manifest, resolve_data_dir
from .metrics import regression_metrics
from .predict import Predictor

ML_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ML_ROOT.parent
INPUT_NAME = "image"
OUTPUT_NAME = "days_left"


class DaysLeftHead(nn.Module):
    """Bake the target unscaling into the graph so the browser receives days directly."""

    def __init__(self, predictor: Predictor) -> None:
        super().__init__()
        self.model = predictor.model

    def forward(self, image: torch.Tensor) -> torch.Tensor:
        return self.model.predict_days(image)


def export(checkpoint: Path, destination: Path) -> Predictor:
    """Write a single-file ONNX model with a dynamic batch dimension."""
    predictor = Predictor(checkpoint)
    wrapper = DaysLeftHead(predictor).eval()
    size = predictor.transform.transforms[1].size[0]
    dummy = torch.zeros(1, 3, size, size)
    destination.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        wrapper,
        (dummy,),
        str(destination),
        input_names=[INPUT_NAME],
        output_names=[OUTPUT_NAME],
        dynamic_axes={INPUT_NAME: {0: "batch"}, OUTPUT_NAME: {0: "batch"}},
        opset_version=17,
        dynamo=False,
    )
    model = onnx.load(str(destination))
    onnx.checker.check_model(model)
    onnx.save(model, str(destination), save_as_external_data=False)
    return predictor


def verify(predictor: Predictor, onnx_path: Path, data_dir: Path, manifest: Path) -> dict[str, float]:
    """Run the test split through both runtimes and report the largest disagreement."""
    rows = [r for r in read_manifest(manifest) if r.split == "test"]
    loader = torch.utils.data.DataLoader(BananaDataset(rows, data_dir, eval_transform()), batch_size=32)
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    torch_out, onnx_out, targets = [], [], []
    with torch.inference_mode():
        for images, days in loader:
            torch_out.append(predictor.model.predict_days(images).numpy())
            onnx_out.append(session.run([OUTPUT_NAME], {INPUT_NAME: images.numpy()})[0])
            targets.append(days.numpy())
    t, o, y = (np.concatenate(x) for x in (torch_out, onnx_out, targets))
    return {
        "max_abs_diff_days": float(np.abs(t - o).max()),
        "onnx_test_mae": regression_metrics(y, np.clip(o, predictor.low, predictor.high))["mae"],
    }


def main() -> None:
    """Export, verify, and write the metadata file the web app reads."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", default=str(ML_ROOT / "checkpoints" / "best.pt"))
    parser.add_argument("--out", default=str(REPO_ROOT / "frontend" / "public" / "model" / "bananalife.onnx"))
    parser.add_argument("--data-dir", default=None)
    parser.add_argument("--manifest", default=str(ML_ROOT / "data" / "processed" / "manifest.csv"))
    args = parser.parse_args()

    out = Path(args.out)
    predictor = export(Path(args.checkpoint), out)
    report = verify(predictor, out, resolve_data_dir(args.data_dir), Path(args.manifest))
    size = predictor.transform.transforms[1].size[0]
    metadata = {
        "model_version": predictor.model_version,
        "input_name": INPUT_NAME,
        "output_name": OUTPUT_NAME,
        "image_size": size,
        "normalize_mean": list(IMAGENET_MEAN),
        "normalize_std": list(IMAGENET_STD),
        "pad_fill_rgb": list(PAD_FILL),
        "range": {"min": predictor.low, "max": predictor.high},
    }
    (out.parent / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")
    print(json.dumps(report, indent=2))
    if report["max_abs_diff_days"] > 1e-3:
        raise SystemExit("ONNX output differs from PyTorch by more than 0.001 days")


if __name__ == "__main__":
    main()
