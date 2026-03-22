"""
Abstract base class for causal inference models used in geo-testing.

All causal models (SCM, Augmented SCM, DID) inherit from CausalModel
and produce a standardized ModelResult for ensemble weighting.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np


@dataclass
class ModelResult:
    """Standardized output from any causal model."""

    model_name: str
    weights: np.ndarray  # control unit weights
    synthetic_control: np.ndarray  # full time range counterfactual
    treatment_series: np.ndarray  # actual treatment series
    pre_rmse: float  # pre-period RMSE for ensemble weighting
    post_lift: float  # total lift estimate (sum of pointwise differences)


class CausalModel(ABC):
    """
    Abstract base class for causal inference models.

    Subclasses must implement:
        - fit(Y_pre_treat, Y_pre_control): learn model parameters from pre-period data
        - predict(Y_control): produce counterfactual predictions from control data

    The evaluate() method orchestrates the full pipeline: fit on pre-period,
    predict on both pre and post periods, compute diagnostics.
    """

    name: str = "base"

    @abstractmethod
    def fit(self, Y_pre_treat: np.ndarray, Y_pre_control: np.ndarray) -> None:
        """
        Fit the model on pre-treatment data.

        Parameters
        ----------
        Y_pre_treat : np.ndarray, shape (T_pre,)
            Pre-period outcome for the treated unit (or aggregated treated units).
        Y_pre_control : np.ndarray, shape (T_pre, N_control)
            Pre-period outcomes for control units.
        """

    @abstractmethod
    def predict(self, Y_control: np.ndarray) -> np.ndarray:
        """
        Predict the counterfactual for the treated unit.

        Parameters
        ----------
        Y_control : np.ndarray, shape (T, N_control)
            Control unit outcomes for the prediction period.

        Returns
        -------
        np.ndarray, shape (T,)
            Predicted counterfactual outcome for the treated unit.
        """

    def evaluate(
        self,
        Y_pre_treat: np.ndarray,
        Y_pre_control: np.ndarray,
        Y_post_treat: np.ndarray,
        Y_post_control: np.ndarray,
    ) -> ModelResult:
        """
        Full evaluation pipeline: fit on pre-period, predict on both periods.

        Parameters
        ----------
        Y_pre_treat : shape (T_pre,)
        Y_pre_control : shape (T_pre, N_control)
        Y_post_treat : shape (T_post,)
        Y_post_control : shape (T_post, N_control)

        Returns
        -------
        ModelResult with diagnostics and lift estimate.
        """
        self.fit(Y_pre_treat, Y_pre_control)

        synthetic_pre = self.predict(Y_pre_control)
        synthetic_post = self.predict(Y_post_control)

        pre_rmse = float(np.sqrt(np.mean((Y_pre_treat - synthetic_pre) ** 2)))
        post_lift = float(np.sum(Y_post_treat - synthetic_post))

        return ModelResult(
            model_name=self.name,
            weights=getattr(self, "weights_", np.array([])),
            synthetic_control=np.concatenate([synthetic_pre, synthetic_post]),
            treatment_series=np.concatenate([Y_pre_treat, Y_post_treat]),
            pre_rmse=pre_rmse,
            post_lift=post_lift,
        )
