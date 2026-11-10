# Phase 1 — Dataset exploration

Date of inspection: 9 November 2026.

Source page: [Days-death-to-a-banana](https://www.kaggle.com/datasets/anishkumar00/days-death-to-a-banana) by Anish Kumar. The only published version is the initial release of 23 September 2025. The license field on Kaggle is CC0. The local extract is `~/Desktop/archive` (about 15 MB). It was already on disk, so nothing was re-downloaded. The repository does not contain the images.

The notebook `ml/notebooks/01_exploration.ipynb` recomputes every count below from that extract.

## Publisher documentation

The Kaggle description field does not describe this upload. It is a draft of advice about how to write a dataset title, subtitle, and description. That draft mentions a time series, “remaining edible days,” and files named `images/` and `labels.csv`. Those filenames are not in the extract. The API file list for the dataset was empty. There is no measurement protocol for the target.

Two bytes totals appear in Kaggle’s own metadata (`13,485,953` and `14,422,830`). The local folder is the extract that was inspected. Its CSV timestamp is 23 September 2025, the same day as the release.

## Files

| Path | Role |
| --- | --- |
| `banana_days_471_synced.csv` | Labels. 11,329 bytes. |
| `banana_images_jpg/` | 471 JPEG files. |

CSV columns, in order:

- `image_filename` (string)
- `days_left` (integer)

First rows:

```text
image_filename,days_left
banana_01_day_01.jpg,8
banana_02_day_01.jpg,8
banana_03_day_01.jpg,8
```

The filename pattern is `banana_{id}_day_{day}.jpg`. One file breaks the zero-padding: `banana_33_day_0.jpg`.

## How images map to the target

Join key: `image_filename` must equal the JPEG’s basename.

| Check | Result |
| --- | --- |
| CSV rows | 471 |
| Distinct names in the CSV | 468 |
| JPEG files | 471 |
| CSV names missing on disk | 0 |
| JPEGs missing from the CSV | 3: `banana_18_day_03.jpg`, `banana_19_day_02.jpg`, `banana_19_day_04.jpg` |
| Same filename with two different `days_left` values | 0 |

Three names are repeated in the CSV, each time with the same label: `banana_54_day_03.jpg` (6), `banana_62_day_06.jpg` (3), and `banana_67_day_07.jpg` (2). Each repeated name sits once out of numeric order, in a slot whose id has no file (44, 28, and 26), and once in its natural place. That is a spreadsheet slip. Each of those three images exists once on disk.

`days_left` takes only the integers 1 through 8. For all 468 labeled names it is a recoding of the day token in the filename:

- day token `0` and day token `1` → `days_left` 8
- otherwise `days_left = 9 - day token`

There are zero exceptions. `days_left` was not entered as a separate measurement. It is the day index, rewritten. The column name says “days left.” Nothing in the file records who judged a banana inedible, or whether the number is edible life, days since purchase, or a folder index.

## Target distribution

Counts below are distinct filenames. The three repeated CSV rows are not counted twice.

| `days_left` | Day token in the filename | Labeled images |
| --- | --- | --- |
| 8 | 0 or 1 | 42 |
| 7 | 2 | 21 |
| 6 | 3 | 54 |
| 5 | 4 | 54 |
| 4 | 5 | 71 |
| 3 | 6 | 61 |
| 2 | 7 | 66 |
| 1 | 8 | 99 |

The smallest bin is `days_left` 7 (21 images). The largest is `days_left` 1 (99 images). A model that always predicts the training-set mean will look better than it should if a later test set is not stratified, because the labels are uneven. Mean-color of a 64×64 downsample does not fall smoothly as `days_left` falls. Backgrounds dominate that average, so color alone is a weak check, and it does not show a clean ripeness scale.

## What the images look like

All 471 files are RGB JPEGs. None has EXIF. There are 149 distinct resolutions. The common ones are 275×183 (91 files), 225×225 (46), 300×168 (36), and 960×1280 (36). File size runs from 2,710 bytes to 1,173,515 bytes. The median is 9,418 bytes. Forty-four files are under 5 KB. One file, `banana_52_day_03.jpg`, is 7842×5313.

Share of labeled images whose long side is under 500 pixels:

| `days_left` | Share under 500 px |
| --- | --- |
| 8 | 23 / 42 (55%) |
| 7 | 10 / 21 (48%) |
| 6 | 41 / 54 (76%) |
| 5 | 35 / 54 (65%) |
| 4 | 51 / 71 (72%) |
| 3 | 50 / 61 (82%) |
| 2 | 57 / 66 (86%) |
| 1 | 90 / 99 (91%) |

The 36 files at 960×1280 sit on `days_left` 5 (11), 4 (9), 3 (8), 1 (7), and 2 (1). Resolution and label move together enough that a model can use photo size as a shortcut. They do not move together cleanly enough to treat resolution as the label.

Samples opened during inspection:

- `banana_01_day_01.jpg`: a green hand on a black background, label 8.
- `banana_01_day_04.jpg`: a different yellow hand on a white wall, with the text “COOLER TEMP (65°F)” burned in, label 5.
- `banana_01_day_08.jpg`: two black bananas on white, label 1.
- `banana_10_day_01.jpg`: green fruit on white, label 8. `banana_10_day_08.jpg`: a different, heavily spotted hand, label 1.
- `banana_14_day_08.jpg`: a phone photo of one brown banana on patterned cloth, 960×1280, label 1.
- `banana_33_day_0.jpg`: green bananas still on the plant, label 8.
- `banana_18_day_03.jpg` and `banana_19_day_02.jpg`: stock photos carrying Freepik and Shutterstock watermarks. Both are in the unlabeled trio.

The scenes that share a banana number are different photographs. Some frames contain overlaid text or a stock-photo watermark. A network can latch onto that text, the background, or the watermark instead of the fruit.

The Kaggle license field is CC0. Watermarked Shutterstock and Freepik frames are still in the folder. For a public portfolio, link to the Kaggle dataset rather than republishing those files.

## Duplicates

MD5 of the file bytes: 471 files collapse to 432 distinct hashes. Thirty-two hashes are shared by more than one filename (71 files).

- 13 groups share a hash and share one `days_left` value.
- 19 groups share a hash and carry two `days_left` values.

Example of a conflicting copy: `banana_36_day_06.jpg` and `banana_54_day_08.jpg` are byte-identical. The CSV labels them 3 and 1. The same pixels would teach the model two answers.

An 8×8 difference hash (64 bits, Hamming distance) finds copies that were re-saved and so differ in MD5. Among pairs with different bytes, 13 pairs have distance 4 or less, and 5 of those have distance 0. Several cross labels. `banana_11_day_07.jpg` (label 2) and `banana_39_day_08.jpg` (label 1) are one of the distance-0 pairs. Exact-hash cleanup still leaves near-copies.

If conflicting hashes are dropped, same-label copies are collapsed to one file, and the three unlabeled files are held out, 410 images remain with a single label. That count is a proposed cleaning result. The files were not changed.

## The banana number is a filename index

There are 99 distinct ids. Twenty of them have a file on every day token from 1 through 8. Twenty-eight appear only on day 8. Day 2 has 21 labeled images. The panel is full of holes, and several holes are the clerical slips above.

Difference-hash distance between two labeled images that share a number: 1,259 pairs, minimum 10, median 31, none at distance 4 or below. Adjacent day tokens for the same number: 334 pairs, minimum 13, median 32, and again none that close. A random sample of 1,259 labeled pairs (NumPy Generator, seed 0) has median 31, minimum 0, and one pair at distance 4 or below. Sharing a number does not make two frames copies of each other. The rare close pairs in this folder sit under different numbers.

Images that share a number are as unlike each other as two images drawn at random. Splitting the data by that number would not keep one physical banana on one side of the split, because the number does not identify one banana.

## Leakage and shortcut risks

1. The label is a function of the filename. A pipeline that parses `day_08` and predicts 1 would score perfectly and would have learned nothing about pixels. The filename must not be a model input.
2. Byte-identical photos carry different labels. A random image split puts one copy in training and the other in test, and the test label may be the other number.
3. Re-saved near-copies have the same problem. The split has to group those copies together.
4. Text, watermarks, backgrounds, and resolution vary with the label strongly enough to be shortcuts, and weakly enough that they are not the label.
5. The three unlabeled files are real bananas. Inventing their `days_left` from the filename would stamp the same convention onto more rows. Leave them unlabeled.
6. `days_left` 7 has 21 images. A small test slice of that bin will swing MAE a lot.

## What this means for the product

A model trained here can learn a rough visual score that correlates with this folder’s day index. The samples do move from greener fruit at low day tokens toward browner fruit at high day tokens, while individual ids jump between unrelated scenes. The number is not a recorded count of edible days for one tracked banana. Calling the prediction “days of edible life remaining” would overstate what the label measures.

No training, API, or interface code was written. The extract was not modified, moved, or copied into the repo.

## Decision needed before Phase 2

Phase 2 should start only after these choices are settled:

1. Keep this dataset, with the 410-image cleaning rule above and hash-grouped splits, and describe the target as this dataset’s day index.
2. Or replace it with a dataset that follows the same fruits and records shelf life separately from the filename.

Recommended default if the goal is an honest portfolio piece on this download: choice 1, and say so in the project write-up. A later dataset can still replace it. The first code to write, after that choice, is a tested parser and an audit script for the hash groups. Model training stays later.
