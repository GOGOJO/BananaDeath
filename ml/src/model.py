"""ResNet18 transfer-learning regressor."""

from __future__ import annotations

import torch
from torch import nn
from torchvision import models


class BananaRegressor(nn.Module):
    """ResNet18 backbone with its 1000-class head replaced by a single regression output.

    The network predicts a standardized target, ``(days_left - mean) / std``.
    Keeping the output near zero with unit spread makes the initial MSE
    gradients well scaled; :meth:`predict_days` undoes the scaling.
    """

    def __init__(self, pretrained: bool = True, dropout: float = 0.2, target_mean: float = 0.0, target_std: float = 1.0) -> None:
        super().__init__()
        weights = models.ResNet18_Weights.IMAGENET1K_V1 if pretrained else None
        self.backbone = models.resnet18(weights=weights)
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, 1))
        self.register_buffer("target_mean", torch.tensor(float(target_mean)))
        self.register_buffer("target_std", torch.tensor(float(target_std)))

    def forward(self, images: torch.Tensor) -> torch.Tensor:
        """Return standardized predictions with shape ``(batch,)``."""
        return self.backbone(images).squeeze(-1)

    def predict_days(self, images: torch.Tensor) -> torch.Tensor:
        """Return predictions in the original ``days_left`` units."""
        return self(images) * self.target_std + self.target_mean

    def head_parameters(self) -> list[nn.Parameter]:
        """Parameters of the new regression head."""
        return list(self.backbone.fc.parameters())

    def set_backbone_trainable(self, trainable: bool) -> None:
        """Freeze or unfreeze everything except the regression head.

        Training only the head first lets the random new layer settle before
        gradients start changing the pretrained features. With a few hundred
        images, updating the whole network from step one tends to overfit fast.
        """
        head = set(id(p) for p in self.head_parameters())
        for parameter in self.backbone.parameters():
            if id(parameter) not in head:
                parameter.requires_grad = trainable
