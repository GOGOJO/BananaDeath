import io
from pathlib import Path

import pytest
import torch
from PIL import Image

from bananalife_ml.dataset import IMAGE_SIZE
from bananalife_ml.model import BananaRegressor
from bananalife_ml.predict import Predictor


def write_checkpoint(path: Path, bias: float) -> None:
    """Save an untrained model whose head always outputs ``bias`` (standardized)."""
    model = BananaRegressor(pretrained=False, target_mean=4.5, target_std=2.0)
    linear = model.backbone.fc[1]
    torch.nn.init.zeros_(linear.weight)
    torch.nn.init.constant_(linear.bias, bias)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "config": {"dropout": 0.2},
            "image_size": IMAGE_SIZE,
            "target_range": [1, 8],
            "model_version": "test-model",
        },
        path,
    )


@pytest.mark.parametrize(("bias", "expected", "raw"), [(0.0, 4.5, 4.5), (10.0, 8.0, 24.5), (-10.0, 1.0, -15.5)])
def test_predictions_are_unscaled_and_clamped(tmp_path: Path, bias: float, expected: float, raw: float) -> None:
    checkpoint = tmp_path / "model.pt"
    write_checkpoint(checkpoint, bias)
    predictor = Predictor(checkpoint)
    result = predictor.predict(Image.new("RGB", (120, 80), (220, 200, 50)))
    assert result.days_left == pytest.approx(expected)
    assert result.raw_days_left == pytest.approx(raw)
    assert result.model_version == "test-model"


def test_predict_bytes_accepts_png_with_alpha(tmp_path: Path) -> None:
    checkpoint = tmp_path / "model.pt"
    write_checkpoint(checkpoint, 0.0)
    buffer = io.BytesIO()
    Image.new("RGBA", (64, 64), (0, 255, 0, 128)).save(buffer, format="PNG")
    result = Predictor(checkpoint).predict_bytes(buffer.getvalue())
    assert result.days_left == pytest.approx(4.5)
