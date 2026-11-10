"""FastAPI application factory and ASGI entry point (``uvicorn app.main:app``)."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import Settings, get_settings
from .routes import health, predict
from .services.predictor import load_predictor

logging.basicConfig(level=logging.INFO)

API_PREFIX = "/api/v1"


def create_app(settings: Settings | None = None, load_model: bool = True) -> FastAPI:
    """Build the app; ``load_model=False`` lets tests inject their own predictor."""
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if load_model:
            app.state.predictor = load_predictor(settings.model_path)
        yield

    app = FastAPI(title="BananaLife API", version="1.0.0", lifespan=lifespan)
    app.state.predictor = None
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix=API_PREFIX)
    app.include_router(predict.router, prefix=API_PREFIX)
    return app


app = create_app()
