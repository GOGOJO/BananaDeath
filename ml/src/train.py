"""Train the ResNet18 regressor with a frozen-backbone warm-up, then full fine-tuning."""

from __future__ import annotations

import argparse
import json
import random
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader

from .dataset import IMAGE_SIZE, IMAGENET_MEAN, IMAGENET_STD, make_loaders
from .manifest import read_manifest, resolve_data_dir
from .metrics import regression_metrics
from .model import BananaRegressor

ML_ROOT = Path(__file__).resolve().parents[1]


@dataclass
class TrainConfig:
    """Hyperparameters, saved inside the checkpoint so a run can be reproduced."""

    head_epochs: int = 5
    finetune_epochs: int = 25
    batch_size: int = 32
    head_lr: float = 1e-3
    finetune_lr: float = 1e-4
    weight_decay: float = 1e-4
    dropout: float = 0.2
    patience: int = 8
    seed: int = 42


def pick_device() -> torch.device:
    """Prefer CUDA, then Apple's MPS, then CPU."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def seed_everything(seed: int) -> None:
    """Seed Python, NumPy, and PyTorch so splits and initial weights repeat."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def run_epoch(
    model: BananaRegressor,
    loader: DataLoader,
    device: torch.device,
    optimizer: torch.optim.Optimizer | None = None,
) -> tuple[float, np.ndarray, np.ndarray]:
    """One pass over ``loader``; trains when an optimizer is given.

    Returns mean standardized MSE plus predictions and targets in days.
    """
    training = optimizer is not None
    model.train(training)
    loss_fn = nn.MSELoss()
    total_loss, count = 0.0, 0
    preds, targets = [], []
    with torch.set_grad_enabled(training):
        for images, days in loader:
            images, days = images.to(device), days.to(device)
            scaled_target = (days - model.target_mean) / model.target_std
            output = model(images)
            loss = loss_fn(output, scaled_target)
            if training:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
            total_loss += loss.item() * len(days)
            count += len(days)
            preds.append((output * model.target_std + model.target_mean).detach().cpu().numpy())
            targets.append(days.cpu().numpy())
    return total_loss / max(count, 1), np.concatenate(preds), np.concatenate(targets)


def train(config: TrainConfig, data_dir: Path, manifest_path: Path, checkpoint_path: Path) -> dict:
    """Train, keep the weights with the lowest validation MAE, and save a checkpoint."""
    seed_everything(config.seed)
    device = pick_device()
    rows = read_manifest(manifest_path)
    loaders = make_loaders(rows, data_dir, batch_size=config.batch_size)

    train_targets = np.array([r.days_left for r in rows if r.split == "train"], dtype=float)
    model = BananaRegressor(
        pretrained=True,
        dropout=config.dropout,
        target_mean=float(train_targets.mean()),
        target_std=float(train_targets.std()),
    ).to(device)

    history: list[dict] = []
    best_mae, best_state, best_epoch, stale = float("inf"), None, 0, 0

    def log_epoch(epoch: int, phase: str, train_loss: float, val_loss: float, val_metrics: dict[str, float]) -> None:
        history.append({"epoch": epoch, "phase": phase, "train_loss": train_loss, "val_loss": val_loss, **{f"val_{k}": v for k, v in val_metrics.items()}})
        print(f"epoch {epoch:2d} [{phase:8}] train_loss={train_loss:.3f} val_loss={val_loss:.3f} val_mae={val_metrics['mae']:.3f} val_r2={val_metrics['r2']:.3f}")

    phases = [
        ("head", config.head_epochs, False, config.head_lr),
        ("finetune", config.finetune_epochs, True, config.finetune_lr),
    ]
    epoch = 0
    start = time.time()
    for phase, n_epochs, backbone_trainable, lr in phases:
        model.set_backbone_trainable(backbone_trainable)
        params = [p for p in model.parameters() if p.requires_grad]
        optimizer = torch.optim.AdamW(params, lr=lr, weight_decay=config.weight_decay)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(n_epochs, 1))
        stale = 0
        for _ in range(n_epochs):
            epoch += 1
            train_loss, _, _ = run_epoch(model, loaders["train"], device, optimizer)
            val_loss, val_pred, val_true = run_epoch(model, loaders["val"], device)
            scheduler.step()
            val_metrics = regression_metrics(val_true, np.clip(val_pred, 1, 8))
            log_epoch(epoch, phase, train_loss, val_loss, val_metrics)
            if val_metrics["mae"] < best_mae:
                best_mae, best_epoch, stale = val_metrics["mae"], epoch, 0
                best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            else:
                stale += 1
                if phase == "finetune" and stale >= config.patience:
                    print(f"early stop: no validation improvement for {config.patience} epochs")
                    break

    assert best_state is not None
    checkpoint = {
        "state_dict": best_state,
        "config": asdict(config),
        "image_size": IMAGE_SIZE,
        "normalize_mean": IMAGENET_MEAN,
        "normalize_std": IMAGENET_STD,
        "target_range": [1, 8],
        "best_epoch": best_epoch,
        "best_val_mae": best_mae,
        "history": history,
        "train_seconds": round(time.time() - start, 1),
        "device": str(device),
        "model_version": f"resnet18-reg-{time.strftime('%Y%m%d-%H%M%S')}",
    }
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, checkpoint_path)
    print(f"best val MAE {best_mae:.3f} at epoch {best_epoch}; saved {checkpoint_path}")
    return checkpoint


def main() -> None:
    """Command-line entry point."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", default=None)
    parser.add_argument("--manifest", default=str(ML_ROOT / "data" / "processed" / "manifest.csv"))
    parser.add_argument("--checkpoint", default=str(ML_ROOT / "checkpoints" / "best.pt"))
    defaults = TrainConfig()
    for name, value in asdict(defaults).items():
        parser.add_argument(f"--{name.replace('_', '-')}", type=type(value), default=value)
    args = parser.parse_args()

    config = TrainConfig(**{k: getattr(args, k) for k in asdict(defaults)})
    checkpoint = train(config, resolve_data_dir(args.data_dir), Path(args.manifest), Path(args.checkpoint))
    history_path = ML_ROOT / "reports" / "train_history.json"
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(checkpoint["history"], indent=2) + "\n")


if __name__ == "__main__":
    main()
