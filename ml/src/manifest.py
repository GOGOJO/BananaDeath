"""Clean the Kaggle extract and assign leak-safe train/validation/test splits.

The raw CSV has three problems that a naive random split would turn into
inflated test scores (see ``docs/phase1_dataset_report.md``):

* byte-identical JPEGs stored under several names, sometimes with different labels
* re-saved near-copies that MD5 misses
* a "banana number" in the filename that does not identify one physical banana

This module links copies into connected components, drops components whose
copies disagree on the label, collapses exact copies, and splits by component
so that no photograph can appear on both sides of a split.
"""

from __future__ import annotations

import csv
import hashlib
import os
import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image
from sklearn.model_selection import StratifiedGroupKFold

CSV_NAME = "banana_days_471_synced.csv"
IMAGE_DIR_NAME = "banana_images_jpg"
FILENAME_RE = re.compile(r"^banana_(\d+)_day_(\d+)\.jpg$")
NEAR_DUPLICATE_BITS = 4
SPLITS = ("train", "val", "test")


@dataclass(frozen=True)
class ImageRecord:
    """One file on disk, with its label if the CSV has one."""

    filename: str
    path: Path
    days_left: int | None
    md5: str
    dhash: tuple[int, ...]


@dataclass
class ManifestRow:
    """One image kept for supervised learning."""

    filename: str
    days_left: int
    group_id: int
    split: str = ""


@dataclass
class Manifest:
    """Cleaned rows plus an explanation for every file that was left out."""

    rows: list[ManifestRow]
    excluded: dict[str, str] = field(default_factory=dict)


def resolve_data_dir(explicit: str | Path | None = None) -> Path:
    """Find the directory holding the CSV and the image folder.

    Order: explicit argument, ``BANANA_DATA_DIR``, ``ml/data/raw``, ``~/Desktop/archive``.
    """
    candidates: list[Path] = []
    if explicit is not None:
        candidates.append(Path(explicit).expanduser())
    if os.environ.get("BANANA_DATA_DIR"):
        candidates.append(Path(os.environ["BANANA_DATA_DIR"]).expanduser())
    candidates.append(Path(__file__).resolve().parents[1] / "data" / "raw")
    candidates.append(Path.home() / "Desktop" / "archive")

    for candidate in candidates:
        if (candidate / CSV_NAME).is_file() and (candidate / IMAGE_DIR_NAME).is_dir():
            return candidate
    tried = "\n".join(f"  - {c}" for c in candidates)
    raise FileNotFoundError(f"Kaggle extract not found. Looked in:\n{tried}")


def parse_filename(name: str) -> tuple[int, int] | None:
    """Return ``(banana_number, day_token)`` or ``None`` if the name breaks the pattern."""
    match = FILENAME_RE.match(name)
    if match is None:
        return None
    return int(match.group(1)), int(match.group(2))


def expected_days_left(day_token: int) -> int:
    """The CSV's recoding of a filename day token: 0 and 1 map to 8, otherwise ``9 - day``."""
    return 8 if day_token == 0 else 9 - day_token


def file_md5(path: Path) -> str:
    """Hash raw bytes; equal hashes mean the same JPEG file."""
    digest = hashlib.md5()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def difference_hash(image: Image.Image, hash_size: int = 8) -> tuple[int, ...]:
    """64-bit perceptual hash: is each pixel of a 9x8 grayscale thumbnail brighter than its right neighbour?"""
    small = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = np.asarray(small, dtype=np.int16)
    return tuple(int(bit) for bit in (pixels[:, :-1] > pixels[:, 1:]).flatten())


def hamming(left: tuple[int, ...], right: tuple[int, ...]) -> int:
    """Number of differing bits between two equal-length hashes."""
    return sum(a != b for a, b in zip(left, right, strict=True))


def read_labels(csv_path: Path) -> dict[str, int]:
    """Read the label CSV, keeping one value per filename and rejecting conflicting repeats."""
    labels: dict[str, int] = {}
    with csv_path.open(newline="") as handle:
        for row in csv.DictReader(handle):
            name = row["image_filename"].strip()
            value = int(row["days_left"])
            if name in labels and labels[name] != value:
                raise ValueError(f"{name} has conflicting labels {labels[name]} and {value}")
            labels[name] = value
    return labels


def load_records(data_dir: Path) -> list[ImageRecord]:
    """Hash every JPEG in the extract and attach its CSV label when present."""
    labels = read_labels(data_dir / CSV_NAME)
    records: list[ImageRecord] = []
    for path in sorted((data_dir / IMAGE_DIR_NAME).glob("*.jpg")):
        with Image.open(path) as image:
            dhash = difference_hash(image)
        records.append(
            ImageRecord(
                filename=path.name,
                path=path,
                days_left=labels.get(path.name),
                md5=file_md5(path),
                dhash=dhash,
            )
        )
    return records


class _UnionFind:
    """Minimal disjoint-set structure for linking duplicate images."""

    def __init__(self, size: int) -> None:
        self.parent = list(range(size))

    def find(self, item: int) -> int:
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, left: int, right: int) -> None:
        self.parent[self.find(left)] = self.find(right)


def build_manifest(records: list[ImageRecord], near_bits: int = NEAR_DUPLICATE_BITS) -> Manifest:
    """Link copies into components, drop ambiguous ones, and collapse exact duplicates.

    Two files are linked when their bytes match or their difference hashes are
    within ``near_bits``. A component whose labeled members disagree is dropped:
    the same picture cannot have two correct targets. Within a kept component,
    only the first file of each MD5 is retained, because a second identical
    file adds weight without adding information.
    """
    excluded: dict[str, str] = {}
    labeled = [r for r in records if r.days_left is not None]
    for record in records:
        if record.days_left is None:
            excluded[record.filename] = "no label in CSV"

    finder = _UnionFind(len(labeled))
    for i, left in enumerate(labeled):
        for j in range(i + 1, len(labeled)):
            right = labeled[j]
            if left.md5 == right.md5 or hamming(left.dhash, right.dhash) <= near_bits:
                finder.union(i, j)

    components: dict[int, list[int]] = defaultdict(list)
    for index in range(len(labeled)):
        components[finder.find(index)].append(index)

    rows: list[ManifestRow] = []
    for group_id, members in enumerate(sorted(components.values(), key=lambda m: labeled[m[0]].filename)):
        values = {labeled[m].days_left for m in members}
        if len(values) > 1:
            for m in members:
                excluded[labeled[m].filename] = f"copy of another image with a different label {sorted(values)}"
            continue
        seen_md5: set[str] = set()
        for m in members:
            record = labeled[m]
            if record.md5 in seen_md5:
                excluded[record.filename] = "byte-identical to a kept image"
                continue
            seen_md5.add(record.md5)
            assert record.days_left is not None
            rows.append(ManifestRow(record.filename, record.days_left, group_id))
    return Manifest(rows=rows, excluded=excluded)


def assign_splits(rows: list[ManifestRow], seed: int = 42, n_folds: int = 5) -> None:
    """Assign ``train``/``val``/``test`` in place, keeping every group on one side.

    ``StratifiedGroupKFold`` keeps groups intact while trying to match the label
    mix in every fold. One fold of all rows becomes test (about 20%), then one
    fold of the remainder becomes validation (about 16%).
    """
    labels = np.array([r.days_left for r in rows])
    groups = np.array([r.group_id for r in rows])
    indices = np.arange(len(rows))

    outer = StratifiedGroupKFold(n_splits=n_folds, shuffle=True, random_state=seed)
    rest_idx, test_idx = next(outer.split(indices, labels, groups))
    inner = StratifiedGroupKFold(n_splits=n_folds, shuffle=True, random_state=seed)
    train_rel, val_rel = next(inner.split(rest_idx, labels[rest_idx], groups[rest_idx]))

    for i in test_idx:
        rows[i].split = "test"
    for i in rest_idx[val_rel]:
        rows[i].split = "val"
    for i in rest_idx[train_rel]:
        rows[i].split = "train"


def write_manifest(manifest: Manifest, destination: Path) -> None:
    """Write kept rows to ``destination`` and exclusions next to it as ``excluded.csv``."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["image_filename", "days_left", "group_id", "split"])
        for row in sorted(manifest.rows, key=lambda r: r.filename):
            writer.writerow([row.filename, row.days_left, row.group_id, row.split])
    with (destination.parent / "excluded.csv").open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["image_filename", "reason"])
        for name, reason in sorted(manifest.excluded.items()):
            writer.writerow([name, reason])


def read_manifest(path: Path) -> list[ManifestRow]:
    """Load a manifest CSV written by :func:`write_manifest`."""
    with path.open(newline="") as handle:
        return [
            ManifestRow(r["image_filename"], int(r["days_left"]), int(r["group_id"]), r["split"])
            for r in csv.DictReader(handle)
        ]


def main() -> None:
    """Build ``ml/data/processed/manifest.csv`` from the raw extract."""
    import argparse

    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data-dir", default=None)
    parser.add_argument("--out", default=str(Path(__file__).resolve().parents[1] / "data" / "processed" / "manifest.csv"))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    data_dir = resolve_data_dir(args.data_dir)
    manifest = build_manifest(load_records(data_dir))
    assign_splits(manifest.rows, seed=args.seed)
    write_manifest(manifest, Path(args.out))

    counts = {s: sum(r.split == s for r in manifest.rows) for s in SPLITS}
    print(f"data: {data_dir}")
    print(f"kept {len(manifest.rows)} images in {len({r.group_id for r in manifest.rows})} groups; excluded {len(manifest.excluded)}")
    print("split sizes:", counts)
    for split in SPLITS:
        hist = np.bincount([r.days_left for r in manifest.rows if r.split == split], minlength=9)[1:]
        print(f"  {split:<5} days_left 1..8: {hist.tolist()}")
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
