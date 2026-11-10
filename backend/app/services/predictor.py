"""Load the trained model once and expose it to request handlers."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Protocol

from fastapi import Request
from PIL import Image

logger = logging.getLogger(__name__)


class PredictionResult(Protocol):
    days_left: float
    raw_days_left: float
    model_version: str


class ImagePredictor(Protocol):
    """Anything that turns a PIL image into a prediction; tests substitute a fake."""

    model_version: str
    low: float
    high: float

    def predict(self, image: Image.Image) -> PredictionResult: ...


def load_predictor(model_path: Path) -> ImagePredictor | None:
    """Load the checkpoint, or return ``None`` so the API can start and report itself unhealthy."""
    if not model_path.is_file():
        logger.warning("model checkpoint not found at %s; /predictions will return 503", model_path)
        return None
    from bananadeath_ml.predict import Predictor

    predictor = Predictor(model_path)
    logger.info("loaded model %s from %s", predictor.model_version, model_path)
    return predictor


def get_predictor(request: Request) -> ImagePredictor | None:
    """FastAPI dependency returning the predictor stored on the app at startup."""
    return getattr(request.app.state, "predictor", None)
