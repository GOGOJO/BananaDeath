"""Runtime settings, read once from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    """Values the deployment can change without a code edit.

    ``cors_origins`` lists browser origins allowed to call the API. Native
    mobile apps are not subject to CORS, so they need no entry here.
    """

    model_path: Path = field(default_factory=lambda: Path(os.environ.get("MODEL_PATH", REPO_ROOT / "ml" / "checkpoints" / "best.pt")))
    max_upload_bytes: int = field(default_factory=lambda: int(float(os.environ.get("MAX_UPLOAD_MB", "10")) * 1024 * 1024))
    max_image_pixels: int = field(default_factory=lambda: int(os.environ.get("MAX_IMAGE_PIXELS", "60000000")))
    cors_origins: list[str] = field(default_factory=lambda: _split_csv(os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")))


@lru_cache
def get_settings() -> Settings:
    """Process-wide settings instance."""
    return Settings()
