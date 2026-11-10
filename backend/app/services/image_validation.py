"""Check an upload is a real, reasonably sized image before it reaches the model."""

from __future__ import annotations

import io

from PIL import Image, UnidentifiedImageError

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class UploadError(Exception):
    """An upload the API refuses, with the HTTP status that explains why."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def validate_image_bytes(data: bytes, content_type: str | None, max_bytes: int, max_pixels: int) -> Image.Image:
    """Return a decoded RGB image or raise :class:`UploadError`.

    The declared content type is checked first because it is cheap, but the
    decoded format is checked too: a client can label anything ``image/jpeg``.
    The pixel limit is checked from the header before full decoding, so a tiny
    file that claims to be 50000x50000 never gets expanded into memory.
    """
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise UploadError(415, f"Unsupported file type {content_type!r}. Upload a JPEG, PNG, or WebP image.")
    if not data:
        raise UploadError(422, "The uploaded file is empty.")
    if len(data) > max_bytes:
        raise UploadError(413, f"File is larger than the {max_bytes // (1024 * 1024)} MB limit.")

    try:
        with Image.open(io.BytesIO(data)) as probe:
            image_format = probe.format
            width, height = probe.size
            probe.verify()
    except Image.DecompressionBombError as error:
        raise UploadError(413, "Image has too many pixels to process.") from error
    except (UnidentifiedImageError, OSError, SyntaxError) as error:
        raise UploadError(422, "The file could not be read as an image.") from error

    if image_format not in ALLOWED_FORMATS:
        raise UploadError(415, f"Decoded format {image_format} is not supported.")
    if width * height > max_pixels:
        raise UploadError(413, f"Image is {width}x{height}; the limit is {max_pixels:,} pixels.")

    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (OSError, Image.DecompressionBombError) as error:
        raise UploadError(422, "The image data is corrupt or truncated.") from error
    return image
