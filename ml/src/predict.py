"""Reusable inference: load a checkpoint once, then score images."""

from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path

import torch
from PIL import Image, ImageOps

from .dataset import eval_transform
from .model import BananaRegressor


@dataclass(frozen=True)
class Prediction:
    """A single model output.

    ``days_left`` is clamped to the label range seen in training, because the
    model has no evidence about values outside 1-8. ``raw_days_left`` keeps the
    unclamped number for debugging.
    """

    days_left: float
    raw_days_left: float
    model_version: str


class Predictor:
    """Wrap a trained checkpoint behind a ``predict(image)`` call."""

    def __init__(self, checkpoint_path: str | Path, device: str | torch.device = "cpu") -> None:
        checkpoint = torch.load(Path(checkpoint_path), map_location="cpu", weights_only=False)
        self.device = torch.device(device)
        self.model = BananaRegressor(pretrained=False, dropout=checkpoint["config"]["dropout"])
        self.model.load_state_dict(checkpoint["state_dict"])
        self.model.to(self.device).eval()
        self.transform = eval_transform(checkpoint["image_size"])
        self.low, self.high = checkpoint["target_range"]
        self.model_version: str = checkpoint.get("model_version", "unknown")

    @torch.inference_mode()
    def predict(self, image: Image.Image) -> Prediction:
        """Score one PIL image."""
        rgb = ImageOps.exif_transpose(image).convert("RGB")
        batch = self.transform(rgb).unsqueeze(0).to(self.device)
        raw = float(self.model.predict_days(batch).item())
        return Prediction(
            days_left=min(max(raw, self.low), self.high),
            raw_days_left=raw,
            model_version=self.model_version,
        )

    def predict_bytes(self, data: bytes) -> Prediction:
        """Score encoded image bytes, such as an HTTP upload."""
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            return self.predict(image)


def main() -> None:
    """Print a prediction for each image path given on the command line."""
    import argparse

    default_checkpoint = Path(__file__).resolve().parents[1] / "checkpoints" / "best.pt"
    parser = argparse.ArgumentParser(description="Predict days_left for image files.")
    parser.add_argument("images", nargs="+")
    parser.add_argument("--checkpoint", default=str(default_checkpoint))
    args = parser.parse_args()

    predictor = Predictor(args.checkpoint)
    for path in args.images:
        with Image.open(path) as image:
            result = predictor.predict(image)
        print(f"{path}: {result.days_left:.2f} days (raw {result.raw_days_left:.2f})")


if __name__ == "__main__":
    main()
