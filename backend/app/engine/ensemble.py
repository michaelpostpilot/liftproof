"""
Multi-model ensemble for robust causal inference.

Combines four models:
    1. StandardSCM
    2. AugmentedSCM (ridge)
    3. AugmentedSCM (elastic_net)
    4. DID

Models are weighted by inverse pre-period RMSE (better pre-period fit
gets higher weight). The ensemble counterfactual is the weighted average
of individual model counterfactuals.

Includes a progress_callback parameter for real-time SSE streaming updates.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np

from .augmented_scm import AugmentedSCM
from .base import CausalModel, ModelResult
from .did import DID
from .scm import StandardSCM


@dataclass
class EnsembleResult:
    """Full ensemble output including individual and combined results."""

    individual_results: list[ModelResult]
    ensemble_weights: dict[str, float]  # model_name -> ensemble weight
    ensemble_counterfactual: np.ndarray  # weighted counterfactual
    treatment_series: np.ndarray
    ensemble_lift: float
    pre_rmse: float  # ensemble pre-period RMSE


def build_default_models() -> list[CausalModel]:
    """Instantiate the default set of causal models."""
    return [
        StandardSCM(),
        AugmentedSCM(method="ridge"),
        AugmentedSCM(method="elastic_net"),
        DID(),
    ]


def run_ensemble(
    Y_pre_treat: np.ndarray,
    Y_pre_control: np.ndarray,
    Y_post_treat: np.ndarray,
    Y_post_control: np.ndarray,
    models: list[CausalModel] | None = None,
    progress_callback: Callable[[str, float], None] | None = None,
) -> EnsembleResult:
    """
    Run the multi-model ensemble and produce weighted results.

    Parameters
    ----------
    Y_pre_treat : shape (T_pre,)
    Y_pre_control : shape (T_pre, N_control)
    Y_post_treat : shape (T_post,)
    Y_post_control : shape (T_post, N_control)
    models : list of CausalModel, optional
        Custom model list. Defaults to the standard 4-model suite.
    progress_callback : callable(message: str, progress: float), optional
        Called after each model finishes. progress is in [0, 1].

    Returns
    -------
    EnsembleResult
    """
    if models is None:
        models = build_default_models()

    n_models = len(models)
    results: list[ModelResult] = []

    for i, model in enumerate(models):
        if progress_callback:
            progress_callback(f"Fitting {model.name}...", i / n_models)

        result = model.evaluate(Y_pre_treat, Y_pre_control, Y_post_treat, Y_post_control)
        results.append(result)

    if progress_callback:
        progress_callback("Computing ensemble weights...", 0.9)

    # Compute inverse-RMSE ensemble weights
    # Guard against zero RMSE (perfect fit) by adding small epsilon
    eps = 1e-10
    inverse_rmses = np.array([1.0 / (r.pre_rmse + eps) for r in results])
    ensemble_weights_arr = inverse_rmses / inverse_rmses.sum()

    ensemble_weights = {
        r.model_name: float(w) for r, w in zip(results, ensemble_weights_arr)
    }

    # Weighted average counterfactual
    ensemble_counterfactual = np.zeros_like(results[0].synthetic_control)
    for r, w in zip(results, ensemble_weights_arr):
        ensemble_counterfactual += w * r.synthetic_control

    treatment_series = results[0].treatment_series

    # Ensemble lift
    T_pre = len(Y_pre_treat)
    ensemble_post_counterfactual = ensemble_counterfactual[T_pre:]
    ensemble_lift = float(np.sum(Y_post_treat - ensemble_post_counterfactual))

    # Ensemble pre-period RMSE
    ensemble_pre_counterfactual = ensemble_counterfactual[:T_pre]
    ensemble_pre_rmse = float(
        np.sqrt(np.mean((Y_pre_treat - ensemble_pre_counterfactual) ** 2))
    )

    if progress_callback:
        progress_callback("Ensemble complete.", 1.0)

    return EnsembleResult(
        individual_results=results,
        ensemble_weights=ensemble_weights,
        ensemble_counterfactual=ensemble_counterfactual,
        treatment_series=treatment_series,
        ensemble_lift=ensemble_lift,
        pre_rmse=ensemble_pre_rmse,
    )
