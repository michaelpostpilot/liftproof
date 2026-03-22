"""
Test fixtures for the LiftProof statistical engine.

Generates synthetic panel data with known treatment effects for testing
that causal inference methods can recover the true effect.

Data generation:
    - 50 geos total: 5 treated, 45 control
    - 180 days pre-treatment + 21 days post-treatment = 201 days
    - Each geo has a base level + shared trend + geo-specific noise
    - Treatment effect: 10% lift applied to treated geos in post-period
"""

import numpy as np
import pytest


@pytest.fixture
def synthetic_panel_data():
    """
    Generate synthetic panel data with a known 10% treatment effect.

    Returns a dict with:
        - panel: (201, 50) array, rows=days, cols=geos
        - treated_indices: [0, 1, 2, 3, 4]
        - control_indices: [5, 6, ..., 49]
        - pre_period_len: 180
        - true_lift_pct: 0.10
        - Y_pre_treat, Y_pre_control, Y_post_treat, Y_post_control
    """
    rng = np.random.default_rng(42)

    n_geos = 50
    n_treated = 5
    n_control = n_geos - n_treated
    T_pre = 180
    T_post = 21
    T_total = T_pre + T_post
    true_lift_pct = 0.10

    # Base levels for each geo (some geos are bigger markets)
    base_levels = rng.uniform(500, 2000, size=n_geos)

    # Shared time trend (all geos follow roughly the same trend)
    # Slight upward trend with weekly seasonality
    t = np.arange(T_total)
    shared_trend = 0.5 * t + 50 * np.sin(2 * np.pi * t / 7)

    # Build panel: each geo = base + trend + noise
    panel = np.zeros((T_total, n_geos))
    for j in range(n_geos):
        geo_noise = rng.normal(0, 20, size=T_total)
        panel[:, j] = base_levels[j] + shared_trend + geo_noise

    # Apply treatment effect to treated geos in post-period
    treated_indices = list(range(n_treated))
    for j in treated_indices:
        # 10% lift on the treated geo's average level
        lift = true_lift_pct * base_levels[j]
        panel[T_pre:, j] += lift

    control_indices = list(range(n_treated, n_geos))

    # Split into components
    Y_pre_treat = panel[:T_pre, treated_indices].mean(axis=1)
    Y_pre_control = panel[:T_pre, :][:, control_indices]
    Y_post_treat = panel[T_pre:, treated_indices].mean(axis=1)
    Y_post_control = panel[T_pre:, :][:, control_indices]

    return {
        "panel": panel,
        "treated_indices": treated_indices,
        "control_indices": control_indices,
        "pre_period_len": T_pre,
        "true_lift_pct": true_lift_pct,
        "base_levels_treated": base_levels[treated_indices],
        "Y_pre_treat": Y_pre_treat,
        "Y_pre_control": Y_pre_control,
        "Y_post_treat": Y_post_treat,
        "Y_post_control": Y_post_control,
        "T_pre": T_pre,
        "T_post": T_post,
        "n_geos": n_geos,
        "n_treated": n_treated,
        "n_control": n_control,
        "rng_seed": 42,
    }


@pytest.fixture
def small_panel_data():
    """
    Smaller panel for fast unit tests (10 geos, 30+7 days).

    Still has a clear 15% lift that should be detectable.
    """
    rng = np.random.default_rng(123)

    n_geos = 10
    n_treated = 2
    T_pre = 30
    T_post = 7
    T_total = T_pre + T_post
    true_lift_pct = 0.15

    base_levels = rng.uniform(100, 500, size=n_geos)
    t = np.arange(T_total)
    shared_trend = 0.3 * t

    panel = np.zeros((T_total, n_geos))
    for j in range(n_geos):
        geo_noise = rng.normal(0, 5, size=T_total)
        panel[:, j] = base_levels[j] + shared_trend + geo_noise

    treated_indices = list(range(n_treated))
    for j in treated_indices:
        lift = true_lift_pct * base_levels[j]
        panel[T_pre:, j] += lift

    control_indices = list(range(n_treated, n_geos))

    Y_pre_treat = panel[:T_pre, treated_indices].mean(axis=1)
    Y_pre_control = panel[:T_pre, :][:, control_indices]
    Y_post_treat = panel[T_pre:, treated_indices].mean(axis=1)
    Y_post_control = panel[T_pre:, :][:, control_indices]

    return {
        "panel": panel,
        "treated_indices": treated_indices,
        "control_indices": control_indices,
        "pre_period_len": T_pre,
        "true_lift_pct": true_lift_pct,
        "base_levels_treated": base_levels[treated_indices],
        "Y_pre_treat": Y_pre_treat,
        "Y_pre_control": Y_pre_control,
        "Y_post_treat": Y_post_treat,
        "Y_post_control": Y_post_control,
        "T_pre": T_pre,
        "T_post": T_post,
    }
