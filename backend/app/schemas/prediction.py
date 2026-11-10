"""Response bodies shared by the web and mobile clients."""

from __future__ import annotations

from pydantic import BaseModel, Field

LABEL_DEFINITION = (
    "Estimated position on the training dataset's 8-step ripeness scale, where 8 is the "
    "freshest photos and 1 is the most ripened. The dataset labels come from a day index "
    "in each filename, not from measured edible shelf life, so treat this as a rough guide."
)


class PredictionRange(BaseModel):
    """Lowest and highest value the model can return."""

    min: float
    max: float


class PredictionResponse(BaseModel):
    """Result of ``POST /api/v1/predictions``."""

    days_left: float = Field(description="Model estimate, clamped to the training label range.")
    days_left_rounded: int = Field(description="days_left rounded to a whole day for display.")
    range: PredictionRange
    model_version: str
    label_definition: str = LABEL_DEFINITION


class HealthResponse(BaseModel):
    """Result of ``GET /api/v1/health``."""

    status: str
    model_loaded: bool
    model_version: str | None


class ErrorResponse(BaseModel):
    """Body of every 4xx/5xx returned by this API."""

    detail: str
