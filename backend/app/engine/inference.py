"""
Fisher Randomization Inference (Permutation Test) for geo-experiments.

Implements placebo-based inference:
    1. Compute the observed treatment effect using the full ensemble.
    2. For each permutation, randomly reassign "treatment" to a set of
       control geos, re-run the model, and collect the placebo effect.
    3. The p-value is the fraction of placebo effects at least as extreme
       as the observed effect (two-sided).
    4. Confidence intervals are derived from the null distribution.

OPTIMIZATION: Permutations use only StandardSCM (not full ensemble)
to keep runtime manageable for large panel datasets.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np

from .ensemble import EnsembleResult, run_ensemble
from .scm import StandardSCM


@dataclass
class InferenceResult:
    """Output of the Fisher randomization test."""

    observed_effect: float
    null_effects: np.ndarray  # array of placebo effects
    p_value: float  # two-sided p-value
    ci_lower: float  # 2.5th percentile CI bound
    ci_upper: float  # 97.5th percentile CI bound
    n_permutations: int
    ensemble_result: EnsembleResult  # full ensemble result for observed


def _aggregate_treated(
    panel: np.ndarray, treated_indices: list[int]
) -> np.ndarray:
    """Average across treated unit columns to get a single treated series."""
    return panel[:, treated_indices].mean(axis=1)


def _get_control_matrix(
    panel: np.ndarray, treated_indices: list[int]
) -> np.ndarray:
    """Extract control unit columns (all non-treated)."""
    n_units = panel.shape[1]
    control_indices = [i for i in range(n_units) if i not in treated_indices]
    return panel[:, control_indices]


def run_inference(
    panel: np.ndarray,
    treated_indices: list[int],
    pre_period_len: int,
    n_permutations: int = 500,
    progress_callback: Callable[[str, float], None] | None = None,
    rng: np.random.Generator | None = None,
) -> InferenceResult:
    """
    Fisher randomization test for the treatment effect.

    Parameters
    ----------
    panel : np.ndarray, shape (T, N)
        Full panel data. Rows are time periods, columns are geo units.
    treated_indices : list[int]
        Column indices of the treated units.
    pre_period_len : int
        Number of pre-treatment time periods.
    n_permutations : int
        Number of random placebo reassignments (default 500).
    progress_callback : callable(message, progress), optional
        For SSE streaming. progress is in [0, 1].
    rng : np.random.Generator, optional
        Random number generator for reproducibility.

    Returns
    -------
    InferenceResult
    """
    if rng is None:
        rng = np.random.default_rng()

    panel = np.asarray(panel, dtype=np.float64)
    T, N = panel.shape
    n_treated = len(treated_indices)
    all_indices = list(range(N))
    control_indices = [i for i in all_indices if i not in treated_indices]

    # Split into pre/post
    pre_panel = panel[:pre_period_len, :]
    post_panel = panel[pre_period_len:, :]

    # --- Observed effect using full ensemble ---
    if progress_callback:
        progress_callback("Computing observed effect with full ensemble...", 0.0)

    Y_pre_treat = _aggregate_treated(pre_panel, treated_indices)
    Y_pre_control = _get_control_matrix(pre_panel, treated_indices)
    Y_post_treat = _aggregate_treated(post_panel, treated_indices)
    Y_post_control = _get_control_matrix(post_panel, treated_indices)

    ensemble_result = run_ensemble(
        Y_pre_treat, Y_pre_control, Y_post_treat, Y_post_control
    )
    observed_effect = ensemble_result.ensemble_lift

    if progress_callback:
        progress_callback("Running permutation tests...", 0.05)

    # --- Permutation loop using StandardSCM only (for speed) ---
    # Fisher randomization: draw placebo treatment assignments from ALL geos,
    # not just controls. This is valid for any treatment/control ratio.
    null_effects = np.zeros(n_permutations)

    for p in range(n_permutations):
        placebo_treated = rng.choice(all_indices, size=n_treated, replace=False).tolist()
        placebo_control = [i for i in all_indices if i not in placebo_treated]

        # Build placebo data splits
        Y_pre_treat_p = _aggregate_treated(pre_panel, placebo_treated)
        Y_pre_control_p = pre_panel[:, placebo_control]
        Y_post_treat_p = _aggregate_treated(post_panel, placebo_treated)
        Y_post_control_p = post_panel[:, placebo_control]

        # Fit StandardSCM only (fast)
        model = StandardSCM()
        result = model.evaluate(
            Y_pre_treat_p, Y_pre_control_p, Y_post_treat_p, Y_post_control_p
        )
        null_effects[p] = result.post_lift

        # Progress updates (every 10% or so)
        if progress_callback and (p + 1) % max(1, n_permutations // 20) == 0:
            frac = 0.05 + 0.90 * (p + 1) / n_permutations
            progress_callback(
                f"Permutation {p + 1}/{n_permutations}",
                min(frac, 0.95),
            )

    # --- Compute p-value (two-sided) ---
    # Fraction of null effects with |effect| >= |observed|
    p_value = float(np.mean(np.abs(null_effects) >= np.abs(observed_effect)))

    # --- Confidence intervals from null distribution ---
    # Shift null distribution to be centered on observed effect, then take percentiles.
    # This gives a randomization-based CI.
    shifted_null = observed_effect - null_effects
    ci_lower = float(np.percentile(shifted_null, 2.5))
    ci_upper = float(np.percentile(shifted_null, 97.5))

    if progress_callback:
        progress_callback("Inference complete.", 1.0)

    return InferenceResult(
        observed_effect=observed_effect,
        null_effects=null_effects,
        p_value=p_value,
        ci_lower=ci_lower,
        ci_upper=ci_upper,
        n_permutations=n_permutations,
        ensemble_result=ensemble_result,
    )
