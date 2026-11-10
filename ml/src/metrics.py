"""Regression metrics used for every model and baseline."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """MAE and RMSE in days, plus R².

    MAE is the headline number because it reads directly as "off by N days".
    RMSE punishes large misses more, so a gap between RMSE and MAE means a few
    images are badly wrong. R² compares against always predicting the test
    mean; zero means no better than that, negative means worse.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)),
    }
