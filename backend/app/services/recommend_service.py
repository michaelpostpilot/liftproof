"""
Service for recommending optimal treatment/control geo splits.

Algorithm:
1. Load CSV data and pivot to (dates x geos) matrix for the pre-period
2. For all possible n_treatment-sized subsets (or a greedy search if too many),
   evaluate the pre-period correlation between the treatment aggregate and the
   synthetic-control-weighted control aggregate.
3. Return the split that maximizes pre-period correlation and minimizes CV.
"""
from __future__ import annotations

import io
import itertools

import numpy as np
import pandas as pd

from app.services.data_service import DataService


class RecommendService:
    def __init__(self):
        self.data_service = DataService()

    def recommend_split(
        self,
        csv_upload_id: str,
        kpi_column: str,
        n_treatment: int,
        pre_period_start: str,
        pre_period_end: str,
        user_id: str | None = None,
    ) -> dict:
        # Load CSV (filtered by user_id for authorization)
        query = self.data_service.supabase.table("csv_uploads").select("*").eq("id", csv_upload_id)
        if user_id:
            query = query.eq("user_id", user_id)
        upload = query.single().execute()
        file_bytes = self.data_service.supabase.storage.from_("csv-uploads").download(
            upload.data["storage_path"]
        )
        df = pd.read_csv(io.BytesIO(file_bytes))

        geo_col = upload.data["geo_column"]
        date_col = upload.data["date_column"]

        # Parse dates and filter to pre-period
        df[date_col] = pd.to_datetime(df[date_col])
        pre_start = pd.to_datetime(pre_period_start)
        pre_end = pd.to_datetime(pre_period_end)
        df_pre = df[(df[date_col] >= pre_start) & (df[date_col] <= pre_end)]

        # Pivot to wide format (dates x geos)
        pivot = df_pre.pivot_table(
            index=date_col, columns=geo_col, values=kpi_column, aggfunc="mean"
        )
        pivot = pivot.sort_index().ffill().bfill().fillna(0)

        all_geos = list(pivot.columns)
        n_geos = len(all_geos)

        if n_treatment >= n_geos:
            n_treatment = max(1, n_geos // 3)

        # Compute pairwise correlation matrix
        corr_matrix = pivot.corr().values
        geo_means = pivot.mean().values
        geo_stds = pivot.std().values

        # Choose search strategy based on number of possible combinations
        n_combos = _n_choose_k(n_geos, n_treatment)

        if n_combos <= 5000:
            # Exhaustive search
            best_score = -1.0
            best_treatment_idx = list(range(n_treatment))

            for combo in itertools.combinations(range(n_geos), n_treatment):
                treatment_idx = list(combo)
                control_idx = [i for i in range(n_geos) if i not in treatment_idx]
                if len(control_idx) == 0:
                    continue

                score = _evaluate_split(pivot.values, treatment_idx, control_idx)
                if score > best_score:
                    best_score = score
                    best_treatment_idx = treatment_idx
        else:
            # Greedy search with random restarts
            best_score = -1.0
            best_treatment_idx = list(range(n_treatment))
            rng = np.random.default_rng(42)

            for _ in range(200):
                # Random starting assignment
                perm = rng.permutation(n_geos)
                treatment_idx = sorted(perm[:n_treatment].tolist())
                control_idx = sorted(perm[n_treatment:].tolist())

                # Local search: try swapping each treatment geo with each control
                improved = True
                while improved:
                    improved = False
                    current_score = _evaluate_split(
                        pivot.values, treatment_idx, control_idx
                    )
                    for ti, t_geo in enumerate(treatment_idx):
                        for ci, c_geo in enumerate(control_idx):
                            # Swap
                            new_treat = treatment_idx.copy()
                            new_ctrl = control_idx.copy()
                            new_treat[ti] = c_geo
                            new_ctrl[ci] = t_geo
                            new_treat.sort()
                            new_ctrl.sort()

                            new_score = _evaluate_split(
                                pivot.values, new_treat, new_ctrl
                            )
                            if new_score > current_score:
                                treatment_idx = new_treat
                                control_idx = new_ctrl
                                current_score = new_score
                                improved = True
                                break
                        if improved:
                            break

                score = _evaluate_split(pivot.values, treatment_idx, control_idx)
                if score > best_score:
                    best_score = score
                    best_treatment_idx = treatment_idx

        # Final results
        control_idx = [i for i in range(n_geos) if i not in best_treatment_idx]
        treatment_geos = [all_geos[i] for i in best_treatment_idx]
        control_geos = [all_geos[i] for i in control_idx]

        # Compute metrics for the recommended split
        treat_series = pivot.values[:, best_treatment_idx].mean(axis=1)
        ctrl_series = pivot.values[:, control_idx].mean(axis=1)
        corr_val = np.corrcoef(treat_series, ctrl_series)[0, 1]
        correlation = float(corr_val) if not np.isnan(corr_val) else 0.0

        # Cross-geo CV: std of geo weekly averages / mean
        all_means = pivot.mean().values
        cross_cv = float(np.std(all_means) / np.mean(all_means)) if np.mean(all_means) > 0 else 0

        # Build explanation
        explanation = (
            f"Recommended {len(treatment_geos)} treatment geos and "
            f"{len(control_geos)} control geos. "
            f"Pre-period correlation between groups: {correlation:.2f}. "
        )
        if correlation >= 0.9:
            explanation += "Excellent fit — the control geos track the treatment geos very closely."
        elif correlation >= 0.7:
            explanation += "Good fit — the groups move together reasonably well in the pre-period."
        else:
            explanation += "Fair fit — consider adding more pre-period data or adjusting the number of treatment geos."

        return {
            "treatment_geos": treatment_geos,
            "control_geos": control_geos,
            "pre_period_correlation": round(correlation, 4),
            "cross_geo_cv": round(cross_cv, 4),
            "explanation": explanation,
        }


def _evaluate_split(
    panel: np.ndarray,
    treatment_idx: list[int],
    control_idx: list[int],
) -> float:
    """
    Score a treatment/control split by pre-period correlation between
    the treatment aggregate and control aggregate.
    """
    treat_series = panel[:, treatment_idx].mean(axis=1)
    ctrl_series = panel[:, control_idx].mean(axis=1)

    if np.std(treat_series) == 0 or np.std(ctrl_series) == 0:
        return 0.0

    corr = np.corrcoef(treat_series, ctrl_series)[0, 1]
    return float(corr) if not np.isnan(corr) else 0.0


def _n_choose_k(n: int, k: int) -> int:
    """Compute binomial coefficient."""
    if k > n:
        return 0
    if k == 0 or k == n:
        return 1
    k = min(k, n - k)
    result = 1
    for i in range(k):
        result = result * (n - i) // (i + 1)
    return result
