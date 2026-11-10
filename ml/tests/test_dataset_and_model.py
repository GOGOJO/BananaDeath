import numpy as np
import torch
from PIL import Image

from bananalife_ml.dataset import IMAGE_SIZE, PadToSquare, eval_transform, train_transform
from bananalife_ml.metrics import regression_metrics
from bananalife_ml.model import BananaRegressor


def test_pad_to_square_keeps_the_whole_image() -> None:
    image = Image.new("RGB", (300, 168), (255, 0, 0))
    padded = PadToSquare()(image)
    assert padded.size == (300, 300)
    assert padded.getpixel((150, 150)) == (255, 0, 0)


def test_transforms_produce_fixed_size_tensors() -> None:
    image = Image.new("RGB", (183, 275), (200, 180, 40))
    for transform in (eval_transform(), train_transform()):
        tensor = transform(image)
        assert tensor.shape == (3, IMAGE_SIZE, IMAGE_SIZE)


def test_model_output_shape_and_unscaling() -> None:
    model = BananaRegressor(pretrained=False, target_mean=4.5, target_std=2.0).eval()
    images = torch.zeros(3, 3, IMAGE_SIZE, IMAGE_SIZE)
    with torch.no_grad():
        scaled = model(images)
        days = model.predict_days(images)
    assert scaled.shape == (3,)
    assert torch.allclose(days, scaled * 2.0 + 4.5)


def test_freezing_leaves_only_the_head_trainable() -> None:
    model = BananaRegressor(pretrained=False)
    model.set_backbone_trainable(False)
    trainable = {id(p) for p in model.parameters() if p.requires_grad}
    assert trainable == {id(p) for p in model.head_parameters()}
    model.set_backbone_trainable(True)
    assert all(p.requires_grad for p in model.parameters())


def test_regression_metrics() -> None:
    perfect = regression_metrics(np.array([1, 2, 3]), np.array([1, 2, 3]))
    assert perfect == {"mae": 0.0, "rmse": 0.0, "r2": 1.0}
    off_by_one = regression_metrics(np.array([1, 2, 3]), np.array([2, 3, 4]))
    assert off_by_one["mae"] == 1.0
    assert off_by_one["rmse"] == 1.0
