import io
from dataclasses import dataclass, replace

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import Settings, get_settings
from app.main import create_app


@dataclass
class FakeResult:
    days_left: float
    raw_days_left: float
    model_version: str


class FakePredictor:
    model_version = "fake-1"
    low = 1.0
    high = 8.0

    def __init__(self) -> None:
        self.calls: list[tuple[int, int]] = []

    def predict(self, image: Image.Image) -> FakeResult:
        self.calls.append(image.size)
        return FakeResult(days_left=4.567, raw_days_left=4.567, model_version=self.model_version)


def image_bytes(fmt: str = "JPEG", size: tuple[int, int] = (64, 48)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, (230, 200, 40)).save(buffer, format=fmt)
    return buffer.getvalue()


@pytest.fixture
def settings() -> Settings:
    return replace(get_settings(), max_upload_bytes=200_000, max_image_pixels=1_000_000)


@pytest.fixture
def predictor() -> FakePredictor:
    return FakePredictor()


@pytest.fixture
def client(settings: Settings, predictor: FakePredictor) -> TestClient:
    app = create_app(settings, load_model=False)
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app) as test_client:
        app.state.predictor = predictor
        yield test_client


def post(client: TestClient, data: bytes, content_type: str = "image/jpeg"):
    return client.post("/api/v1/predictions", files={"file": ("banana.jpg", data, content_type)})


def test_health_reports_loaded_model(client: TestClient) -> None:
    body = client.get("/api/v1/health").json()
    assert body == {"status": "ok", "model_loaded": True, "model_version": "fake-1"}


def test_prediction_success(client: TestClient, predictor: FakePredictor) -> None:
    response = post(client, image_bytes())
    assert response.status_code == 200
    body = response.json()
    assert body["days_left"] == 4.57
    assert body["days_left_rounded"] == 5
    assert body["range"] == {"min": 1.0, "max": 8.0}
    assert body["model_version"] == "fake-1"
    assert "day index" in body["label_definition"]
    assert predictor.calls == [(64, 48)]


@pytest.mark.parametrize("fmt,content_type", [("PNG", "image/png"), ("WEBP", "image/webp")])
def test_other_formats_are_accepted(client: TestClient, fmt: str, content_type: str) -> None:
    assert post(client, image_bytes(fmt), content_type).status_code == 200


def test_rejects_unsupported_content_type(client: TestClient) -> None:
    response = post(client, b"hello", "text/plain")
    assert response.status_code == 415


def test_rejects_non_image_bytes_labelled_as_jpeg(client: TestClient) -> None:
    response = post(client, b"definitely not a jpeg")
    assert response.status_code == 422


def test_rejects_format_that_does_not_match_allowlist(client: TestClient) -> None:
    response = post(client, image_bytes("GIF"), "image/jpeg")
    assert response.status_code == 415


def test_rejects_empty_upload(client: TestClient) -> None:
    assert post(client, b"").status_code == 422


def test_rejects_oversized_file(client: TestClient) -> None:
    assert post(client, b"\xff" * 300_000).status_code == 413


def test_rejects_too_many_pixels(client: TestClient) -> None:
    response = post(client, image_bytes("PNG", (1200, 1000)), "image/png")
    assert response.status_code == 413


def test_truncated_jpeg_is_rejected(client: TestClient) -> None:
    data = image_bytes(size=(400, 300))
    assert post(client, data[: len(data) // 2]).status_code == 422


def test_missing_model_returns_503(client: TestClient) -> None:
    client.app.state.predictor = None
    assert post(client, image_bytes()).status_code == 503
    assert client.get("/api/v1/health").json()["model_loaded"] is False


def test_cors_allows_configured_origin(client: TestClient, settings: Settings) -> None:
    origin = settings.cors_origins[0]
    response = client.options(
        "/api/v1/predictions",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
    )
    assert response.headers.get("access-control-allow-origin") == origin
