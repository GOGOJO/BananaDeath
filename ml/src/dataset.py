"""PyTorch dataset, image transforms, and data loaders for Banana Death."""

from __future__ import annotations

from pathlib import Path

import torch
from PIL import Image, ImageOps
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

from .manifest import IMAGE_DIR_NAME, ManifestRow

IMAGE_SIZE = 224
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)
PAD_FILL = tuple(round(255 * m) for m in IMAGENET_MEAN)


class PadToSquare:
    """Pad the short side so the whole banana survives the later resize.

    A centre crop would cut the ends off wide shots like 300x168, and the
    brown tips are part of the ripeness signal. The fill is the ImageNet mean,
    which normalizes to roughly zero and so looks like "no information".
    """

    def __call__(self, image: Image.Image) -> Image.Image:
        width, height = image.size
        side = max(width, height)
        pad_w, pad_h = side - width, side - height
        border = (pad_w // 2, pad_h // 2, pad_w - pad_w // 2, pad_h - pad_h // 2)
        return ImageOps.expand(image, border=border, fill=PAD_FILL)


def eval_transform(image_size: int = IMAGE_SIZE) -> transforms.Compose:
    """Deterministic preprocessing shared by validation, test, and the live API."""
    return transforms.Compose(
        [
            PadToSquare(),
            transforms.Resize((image_size, image_size), antialias=True),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def train_transform(image_size: int = IMAGE_SIZE) -> transforms.Compose:
    """Augmentations that keep the label true.

    Flips, small rotations, and crops do not change how ripe a banana is.
    Hue and saturation jitter are left out on purpose: shifting green toward
    yellow is exactly the signal the model is supposed to read.
    """
    return transforms.Compose(
        [
            PadToSquare(),
            transforms.RandomResizedCrop(image_size, scale=(0.75, 1.0), ratio=(0.9, 1.1), antialias=True),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(),
            transforms.RandomRotation(15, fill=PAD_FILL),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def load_rgb(path: Path) -> Image.Image:
    """Open an image as RGB with EXIF orientation applied."""
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


class BananaDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    """Images and ``days_left`` targets for one split of the manifest."""

    def __init__(self, rows: list[ManifestRow], data_dir: Path, transform: transforms.Compose) -> None:
        self.rows = rows
        self.image_dir = data_dir / IMAGE_DIR_NAME
        self.transform = transform

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.rows[index]
        image = self.transform(load_rgb(self.image_dir / row.filename))
        return image, torch.tensor(float(row.days_left), dtype=torch.float32)


def make_loaders(
    rows: list[ManifestRow],
    data_dir: Path,
    batch_size: int = 32,
    num_workers: int = 0,
) -> dict[str, DataLoader]:
    """Build one loader per split; only the training loader shuffles and augments."""
    loaders: dict[str, DataLoader] = {}
    for split in ("train", "val", "test"):
        subset = [r for r in rows if r.split == split]
        transform = train_transform() if split == "train" else eval_transform()
        loaders[split] = DataLoader(
            BananaDataset(subset, data_dir, transform),
            batch_size=batch_size,
            shuffle=split == "train",
            num_workers=num_workers,
        )
    return loaders
