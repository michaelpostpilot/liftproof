"""
Difference-in-Differences (DID) as a robustness check.

A simple but robust baseline estimator:
    - Equal weights across all control units
    - Pre-period difference: delta = mean(Y_treat_pre) - mean(Y_control_pre)
    - Counterfactual_t = mean(Y_control_t) + delta

This produces a parallel-trends counterfactual that is less data-adaptive
than SCM but more robust to overfitting with small donor pools.
"""

import numpy as np

from .base import CausalModel


class DID(CausalModel):
    """
    Difference-in-Differences estimator.

    Uses equal weights across control units and a constant
    pre-period level shift.
    """

    name = "did"

    def __init__(self, name: str = "did"):
        self.name = name
        self.weights_: np.ndarray = np.array([])
        self._pre_diff: float = 0.0

    def fit(self, Y_pre_treat: np.ndarray, Y_pre_control: np.ndarray) -> None:
        """
        Fit DID: compute equal weights and pre-period level difference.

        Parameters
        ----------
        Y_pre_treat : shape (T_pre,)
        Y_pre_control : shape (T_pre, N_control)
        """
        Y_pre_treat = np.asarray(Y_pre_treat, dtype=np.float64)
        Y_pre_control = np.asarray(Y_pre_control, dtype=np.float64)

        if Y_pre_control.ndim == 1:
            Y_pre_control = Y_pre_control.reshape(-1, 1)

        n_controls = Y_pre_control.shape[1]

        # Equal weights
        self.weights_ = np.ones(n_controls) / n_controls

        # Pre-period difference: treated mean - control mean
        treat_mean = np.mean(Y_pre_treat)
        control_mean = np.mean(Y_pre_control @ self.weights_)
        self._pre_diff = treat_mean - control_mean

    def predict(self, Y_control: np.ndarray) -> np.ndarray:
        """
        Predict counterfactual = control mean + pre-period difference.

        Parameters
        ----------
        Y_control : shape (T, N_control)

        Returns
        -------
        shape (T,)
        """
        Y_control = np.asarray(Y_control, dtype=np.float64)
        if Y_control.ndim == 1:
            Y_control = Y_control.reshape(-1, 1)

        # Weighted average of controls + level shift
        control_avg = Y_control @ self.weights_
        return control_avg + self._pre_diff
