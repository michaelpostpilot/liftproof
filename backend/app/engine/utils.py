"""
Preprocessing utilities for preparing panel data for causal inference.

Converts a long-format DataFrame (geo, date, kpi) into the numpy arrays
expected by the engine models.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class PanelData:
    """Preprocessed panel data ready for causal analysis."""

    Y_pre_treat: np.ndarray  # shape (T_pre,) - averaged across treated geos
    Y_pre_control: np.ndarray  # shape (T_pre, N_control)
    Y_post_treat: np.ndarray  # shape (T_post,) - averaged across treated geos
    Y_post_control: np.ndarray  # shape (T_post, N_control)
    treatment_geos: list[str]
    control_geos: list[str]
    dates_pre: list  # dates in pre-period
    dates_post: list  # dates in post-period
    panel_matrix: np.ndarray  # shape (T, N) full panel (treated first, then control)
    treated_indices: list[int]  # column indices of treated units in panel_matrix
    pre_period_len: int


def prepare_panel_data(
    df: pd.DataFrame,
    geo_col: str,
    date_col: str,
    kpi_col: str,
    treatment_geos: list[str],
    control_geos: list[str],
    pre_start: str,
    pre_end: str,
    treat_start: str,
    treat_end: str,
) -> PanelData:
    """
    Prepare panel data from a long-format DataFrame.

    Parameters
    ----------
    df : pd.DataFrame
        Long-format data with columns for geo, date, and KPI.
    geo_col : str
        Column name for geographic unit identifier.
    date_col : str
        Column name for date/time identifier.
    kpi_col : str
        Column name for the outcome variable (KPI).
    treatment_geos : list[str]
        List of geo identifiers designated as treatment units.
    control_geos : list[str]
        List of geo identifiers designated as control units.
    pre_start, pre_end : str
        Date boundaries for the pre-treatment period (inclusive).
    treat_start, treat_end : str
        Date boundaries for the treatment period (inclusive).

    Returns
    -------
    PanelData
        Preprocessed numpy arrays and metadata.
    """
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])

    pre_start_dt = pd.to_datetime(pre_start)
    pre_end_dt = pd.to_datetime(pre_end)
    treat_start_dt = pd.to_datetime(treat_start)
    treat_end_dt = pd.to_datetime(treat_end)

    # Filter to relevant geos
    all_geos = treatment_geos + control_geos
    df = df[df[geo_col].isin(all_geos)].copy()

    # Pivot to wide format: rows=dates, columns=geos
    pivot = df.pivot_table(index=date_col, columns=geo_col, values=kpi_col, aggfunc="mean")

    # Sort by date
    pivot = pivot.sort_index()

    # Forward-fill missing values, then back-fill any remaining
    pivot = pivot.ffill().bfill()

    # Fill any remaining NaN with 0
    pivot = pivot.fillna(0)

    # Ensure all geos are present
    missing_geos = [g for g in all_geos if g not in pivot.columns]
    if missing_geos:
        raise ValueError(f"Geos not found in data: {missing_geos}")

    # Reorder columns: treatment geos first, then control geos
    pivot = pivot[all_geos]

    # Split into pre and post periods
    pre_mask = (pivot.index >= pre_start_dt) & (pivot.index <= pre_end_dt)
    post_mask = (pivot.index >= treat_start_dt) & (pivot.index <= treat_end_dt)

    pre_data = pivot.loc[pre_mask]
    post_data = pivot.loc[post_mask]

    if len(pre_data) == 0:
        raise ValueError("No data found in the pre-treatment period.")
    if len(post_data) == 0:
        raise ValueError("No data found in the treatment period.")

    # Extract treatment and control matrices
    pre_treat = pre_data[treatment_geos].values  # (T_pre, n_treat)
    pre_control = pre_data[control_geos].values  # (T_pre, n_control)
    post_treat = post_data[treatment_geos].values  # (T_post, n_treat)
    post_control = post_data[control_geos].values  # (T_post, n_control)

    # Aggregate treatment geos by averaging
    Y_pre_treat = pre_treat.mean(axis=1)  # (T_pre,)
    Y_post_treat = post_treat.mean(axis=1)  # (T_post,)

    # Build full panel matrix (T x N) with treated first
    full_mask = pre_mask | post_mask
    full_data = pivot.loc[full_mask]
    panel_matrix = full_data.values.astype(np.float64)

    # Treated indices are the first n_treat columns
    n_treat = len(treatment_geos)
    treated_indices = list(range(n_treat))

    dates_pre = pre_data.index.tolist()
    dates_post = post_data.index.tolist()

    return PanelData(
        Y_pre_treat=Y_pre_treat.astype(np.float64),
        Y_pre_control=pre_control.astype(np.float64),
        Y_post_treat=Y_post_treat.astype(np.float64),
        Y_post_control=post_control.astype(np.float64),
        treatment_geos=treatment_geos,
        control_geos=control_geos,
        dates_pre=dates_pre,
        dates_post=dates_post,
        panel_matrix=panel_matrix,
        treated_indices=treated_indices,
        pre_period_len=len(pre_data),
    )
