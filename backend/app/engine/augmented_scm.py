from __future__ import annotations

"""
Augmented Synthetic Control Method (Ben-Michael, Feller, Rothstein 2021).

Extends standard SCM with an outcome model to correct bias:
    1. Fit StandardSCM to get weights w
    2. Compute pre-period residuals: e_t = Y_treat_t - Y_control_t @ w
    3. Fit a ridge or elastic-net regression: e ~ Y_control (learn bias correction)
    4. Predict: Y_hat = Y_control @ w + f(Y_control)  [bias-corrected counterfactual]

Two variants:
    - AugmentedSCM("ridge"): uses RidgeCV for the outcome model
    - AugmentedSCM("elastic_net"): uses ElasticNetCV for the outcome model
"""

import numpy as np
from sklearn.linear_model import ElasticNetCV, RidgeCV

from .base import CausalModel
from .scm import StandardSCM


class AugmentedSCM(CausalModel):
    """
    Augmented Synthetic Control Method with ridge or elastic-net bias correction.

    Parameters
    ----------
    method : str
        Either "ridge" or "elastic_net".
    name : str or None
        Model name override. Defaults to "ascm_{method}".
    """

    def __init__(self, method: str = "ridge", name: str | None = None):
        if method not in ("ridge", "elastic_net"):
            raise ValueError(f"method must be 'ridge' or 'elastic_net', got '{method}'")
        self.method = method
        self.name = name or f"ascm_{method}"
        self.weights_: np.ndarray = np.array([])
        self._scm = StandardSCM()
        self._outcome_model = None

    def fit(self, Y_pre_treat: np.ndarray, Y_pre_control: np.ndarray) -> None:
        """
        Fit the augmented SCM: standard SCM weights + outcome model on residuals.

        Parameters
        ----------
        Y_pre_treat : shape (T_pre,)
        Y_pre_control : shape (T_pre, N_control)
        """
        Y_pre_treat = np.asarray(Y_pre_treat, dtype=np.float64)
        Y_pre_control = np.asarray(Y_pre_control, dtype=np.float64)

        if Y_pre_control.ndim == 1:
            Y_pre_control = Y_pre_control.reshape(-1, 1)

        # Step 1: Fit standard SCM
        self._scm.fit(Y_pre_treat, Y_pre_control)
        self.weights_ = self._scm.weights_.copy()

        # Step 2: Compute pre-period residuals
        scm_prediction = Y_pre_control @ self.weights_
        residuals = Y_pre_treat - scm_prediction

        # Step 3: Fit outcome model on residuals using control units as features
        n_controls = Y_pre_control.shape[1]

        if self.method == "ridge":
            # RidgeCV automatically selects best alpha via cross-validation
            alphas = np.logspace(-3, 6, 50)
            self._outcome_model = RidgeCV(alphas=alphas, fit_intercept=True)
        else:
            # ElasticNetCV with cross-validation
            self._outcome_model = ElasticNetCV(
                l1_ratio=[0.1, 0.3, 0.5, 0.7, 0.9],
                n_alphas=50,
                fit_intercept=True,
                max_iter=10000,
                cv=min(5, max(2, Y_pre_control.shape[0] // 3)),
            )

        # Fit the outcome model: residual ~ f(control units)
        self._outcome_model.fit(Y_pre_control, residuals)

    def predict(self, Y_control: np.ndarray) -> np.ndarray:
        """
        Predict bias-corrected counterfactual.

        counterfactual = SCM prediction + outcome model correction

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

        # SCM component: weighted combination
        scm_pred = Y_control @ self.weights_

        # Bias correction from outcome model
        bias_correction = self._outcome_model.predict(Y_control)

        return scm_pred + bias_correction
