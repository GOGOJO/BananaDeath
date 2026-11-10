"""Liveness and model status."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..schemas.prediction import HealthResponse
from ..services.predictor import ImagePredictor, get_predictor

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(predictor: ImagePredictor | None = Depends(get_predictor)) -> HealthResponse:
    """Report whether the server is up and a model is loaded."""
    return HealthResponse(
        status="ok" if predictor is not None else "degraded",
        model_loaded=predictor is not None,
        model_version=predictor.model_version if predictor is not None else None,
    )
