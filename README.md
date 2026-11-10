# BananaLife

A computer vision regression project that estimates remaining banana shelf life from a photograph.

The workspace is in the dataset-exploration phase. No model, API, or interface has been built yet.

The Kaggle download used for this phase is [Days-death-to-a-banana](https://www.kaggle.com/datasets/anishkumar00/days-death-to-a-banana) by Anish Kumar. Findings from the local copy are in [docs/phase1_dataset_report.md](docs/phase1_dataset_report.md). Re-run the checks with [ml/notebooks/01_exploration.ipynb](ml/notebooks/01_exploration.ipynb).

The notebook reads the existing extract at `~/Desktop/archive`. To point it somewhere else, set `BANANA_DATA_DIR` to the folder that contains `banana_days_471_synced.csv` and `banana_images_jpg/`.
