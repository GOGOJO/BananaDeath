from pathlib import Path

import pytest

from bananadeath_ml.manifest import (
    ImageRecord,
    ManifestRow,
    assign_splits,
    build_manifest,
    expected_days_left,
    hamming,
    parse_filename,
)

ZERO = tuple([0] * 64)
FAR = tuple([1] * 64)


def record(name: str, label: int | None, md5: str, dhash: tuple[int, ...] = ZERO) -> ImageRecord:
    return ImageRecord(filename=name, path=Path(name), days_left=label, md5=md5, dhash=dhash)


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("banana_01_day_01.jpg", (1, 1)),
        ("banana_33_day_0.jpg", (33, 0)),
        ("banana_99_day_08.jpg", (99, 8)),
        ("banana_1_day_1.png", None),
        ("apple_01_day_01.jpg", None),
    ],
)
def test_parse_filename(name: str, expected: tuple[int, int] | None) -> None:
    assert parse_filename(name) == expected


@pytest.mark.parametrize(("day", "label"), [(0, 8), (1, 8), (2, 7), (5, 4), (8, 1)])
def test_expected_days_left_matches_csv_rule(day: int, label: int) -> None:
    assert expected_days_left(day) == label


def test_hamming() -> None:
    assert hamming(ZERO, ZERO) == 0
    assert hamming(ZERO, FAR) == 64


def test_unlabeled_files_are_excluded() -> None:
    manifest = build_manifest([record("a.jpg", None, "m1", FAR)])
    assert manifest.rows == []
    assert manifest.excluded == {"a.jpg": "no label in CSV"}


def test_exact_copies_with_same_label_collapse_to_one() -> None:
    manifest = build_manifest([record("a.jpg", 3, "same"), record("b.jpg", 3, "same")])
    assert [r.filename for r in manifest.rows] == ["a.jpg"]
    assert "b.jpg" in manifest.excluded


def test_exact_copies_with_conflicting_labels_are_dropped() -> None:
    manifest = build_manifest([record("a.jpg", 3, "same"), record("b.jpg", 1, "same")])
    assert manifest.rows == []
    assert set(manifest.excluded) == {"a.jpg", "b.jpg"}


def test_near_copies_share_a_group() -> None:
    nearly_zero = tuple([1, 1] + [0] * 62)
    manifest = build_manifest([record("a.jpg", 4, "m1", ZERO), record("b.jpg", 4, "m2", nearly_zero), record("c.jpg", 4, "m3", FAR)])
    groups = {r.filename: r.group_id for r in manifest.rows}
    assert groups["a.jpg"] == groups["b.jpg"]
    assert groups["c.jpg"] != groups["a.jpg"]


def test_conflict_propagates_through_a_chain_of_near_copies() -> None:
    one_bit = tuple([1] + [0] * 63)
    five_bits = tuple([1] * 5 + [0] * 59)
    records = [record("a.jpg", 2, "m1", ZERO), record("b.jpg", 2, "m2", one_bit), record("c.jpg", 5, "m3", five_bits)]
    manifest = build_manifest(records)
    assert manifest.rows == []


def test_splits_never_share_a_group() -> None:
    rows = [ManifestRow(f"img{i}.jpg", days_left=(i % 8) + 1, group_id=i // 2) for i in range(200)]
    assign_splits(rows, seed=0)
    split_by_group: dict[int, set[str]] = {}
    for row in rows:
        split_by_group.setdefault(row.group_id, set()).add(row.split)
    assert all(len(splits) == 1 for splits in split_by_group.values())
    assert {r.split for r in rows} == {"train", "val", "test"}
