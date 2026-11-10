"""Image upload and prediction."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from ..core.config import Settings, get_settings
from ..schemas.prediction import ErrorResponse, PredictionRange, PredictionResponse
from ..services.image_validation import UploadError, validate_image_bytes
from ..services.predictor import ImagePredictor, get_predictor

router = APIRouter(tags=["predictions"])


@router.post(
    "/predictions",
    response_model=PredictionResponse,
    responses={code: {"model": ErrorResponse} for code in (413, 415, 422, 503)},
)
async def create_prediction(
    file: UploadFile = File(..., description="A JPEG, PNG, or WebP photo of a banana."),
    predictor: ImagePredictor | None = Depends(get_predictor),
    settings: Settings = Depends(get_settings),
) -> PredictionResponse:
    """Estimate ``days_left`` for one uploaded photo."""
    if predictor is None:
        raise HTTPException(status_code=503, detail="The model is not loaded on this server.")

    data = await file.read(settings.max_upload_bytes + 1)
    try:
        image = validate_image_bytes(data, file.content_type, settings.max_upload_bytes, settings.max_image_pixels)
    except UploadError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error

    result = await run_in_threadpool(predictor.predict, image)
    return PredictionResponse(
        days_left=round(result.days_left, 2),
        days_left_rounded=round(result.days_left),
        range=PredictionRange(min=predictor.low, max=predictor.high),
        model_version=result.model_version,
    )
