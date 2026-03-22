import json
import numpy as np
import pandas as pd
from typing import AsyncGenerator

from app.services.data_service import DataService
from app.engine.utils import prepare_panel_data
from app.engine.ensemble import run_ensemble
from app.engine.inference import run_inference


class AnalysisService:
    def __init__(self):
        self.data_service = DataService()

    async def run_analysis(
        self, experiment_id: str, user_id: str
    ) -> AsyncGenerator[str, None]:
        """
        Run the full analysis pipeline, yielding SSE events.
        Each yield is a string formatted as: "data: {json}\n\n"
        """
        try:
            # Step 1: Load data
            yield self._sse_event("progress", {"step": "loading_data", "progress": 0.0})

            df, experiment, upload = self.data_service.load_experiment_data(experiment_id, user_id)

            yield self._sse_event("progress", {"step": "loading_data", "progress": 1.0})

            # Step 2: Prepare panel data
            yield self._sse_event("progress", {"step": "preparing_data", "progress": 0.0})

            panel = prepare_panel_data(
                df=df,
                geo_col=upload["geo_column"],
                date_col=upload["date_column"],
                kpi_col=experiment["primary_kpi"],
                treatment_geos=experiment["treatment_geos"],
                control_geos=experiment["control_geos"],
                pre_start=experiment["pre_period_start"],
                pre_end=experiment["pre_period_end"],
                treat_start=experiment["treatment_start"],
                treat_end=experiment["treatment_end"],
            )

            yield self._sse_event("progress", {"step": "preparing_data", "progress": 1.0})

            # Step 3: Fit models
            yield self._sse_event("progress", {"step": "fitting_models", "progress": 0.0})

            ensemble_result = run_ensemble(
                Y_pre_treat=panel.Y_pre_treat,
                Y_pre_control=panel.Y_pre_control,
                Y_post_treat=panel.Y_post_treat,
                Y_post_control=panel.Y_post_control,
            )

            yield self._sse_event("progress", {"step": "fitting_models", "progress": 1.0})

            # Step 4: Run permutation test
            yield self._sse_event("progress", {"step": "permutation_test", "progress": 0.0})

            inference_result = run_inference(
                panel=panel.panel_matrix,
                treated_indices=panel.treated_indices,
                pre_period_len=panel.pre_period_len,
                n_permutations=200,  # Reduced for POC speed
            )

            yield self._sse_event("progress", {"step": "permutation_test", "progress": 1.0})

            # Step 5: Compute business metrics
            yield self._sse_event("progress", {"step": "computing_metrics", "progress": 0.0})

            # Treatment period actual total
            treatment_total = float(np.sum(panel.Y_post_treat))
            # Counterfactual total (what would have happened without treatment)
            counterfactual_total = float(np.sum(ensemble_result.ensemble_counterfactual[panel.pre_period_len:]))
            lift_amount = treatment_total - counterfactual_total
            lift_percent = lift_amount / counterfactual_total if counterfactual_total != 0 else 0

            # Cumulative lift series
            daily_lift = panel.Y_post_treat - ensemble_result.ensemble_counterfactual[panel.pre_period_len:]
            cumulative_lift = np.cumsum(daily_lift).tolist()

            # iROAS and CPIA from spend data
            iroas = None
            cpia = None
            spend_col = experiment.get("spend_column")
            if spend_col and spend_col in df.columns:
                try:
                    spend_df = df.copy()
                    spend_df[upload["date_column"]] = pd.to_datetime(spend_df[upload["date_column"]])
                    treat_start_dt = pd.to_datetime(experiment["treatment_start"])
                    treat_end_dt = pd.to_datetime(experiment["treatment_end"])

                    treat_spend = spend_df[
                        (spend_df[upload["date_column"]] >= treat_start_dt) &
                        (spend_df[upload["date_column"]] <= treat_end_dt) &
                        (spend_df[upload["geo_column"]].isin(experiment["treatment_geos"]))
                    ][spend_col]

                    total_spend = float(treat_spend.astype(float).sum())
                    if total_spend > 0 and lift_amount != 0:
                        iroas = lift_amount / total_spend
                        cpia = total_spend / abs(lift_amount) if lift_amount > 0 else None
                except Exception:
                    pass  # Spend computation is best-effort

            # Format dates
            all_dates = [d.strftime("%Y-%m-%d") for d in panel.dates_pre + panel.dates_post]

            results = {
                "kpi": experiment["primary_kpi"],
                "lift_amount": lift_amount,
                "lift_percent": lift_percent,
                "ci_lower": inference_result.ci_lower,
                "ci_upper": inference_result.ci_upper,
                "p_value": inference_result.p_value,
                "incrementality_factor": None,
                "iroas": iroas,
                "cpia": cpia,
                "statistical_power": None,
                "model_weights": ensemble_result.ensemble_weights,
                "synthetic_control_series": ensemble_result.ensemble_counterfactual.tolist(),
                "treatment_series": ensemble_result.treatment_series.tolist(),
                "cumulative_lift_series": cumulative_lift,
                "ci_lower_series": [x * (1 + inference_result.ci_lower) for x in cumulative_lift] if inference_result.ci_lower is not None else None,
                "ci_upper_series": [x * (1 + inference_result.ci_upper) for x in cumulative_lift] if inference_result.ci_upper is not None else None,
                "placebo_distribution": inference_result.null_effects.tolist(),
                "dates": all_dates,
                "pre_period_fit_rmse": float(
                    min(r.pre_rmse for r in ensemble_result.individual_results)
                ),
            }

            yield self._sse_event("progress", {"step": "computing_metrics", "progress": 1.0})

            # Step 6: Save results
            yield self._sse_event("progress", {"step": "saving_results", "progress": 0.0})

            self.data_service.save_results(experiment_id, results)

            yield self._sse_event("progress", {"step": "saving_results", "progress": 1.0})

            # Final event
            yield self._sse_event("complete", {"experiment_id": experiment_id})

        except Exception as e:
            self.data_service.mark_failed(experiment_id, str(e))
            yield self._sse_event("error", {"message": str(e)})

    def _sse_event(self, event: str, data: dict) -> str:
        payload = json.dumps({"event": event, "data": data})
        return f"data: {payload}\n\n"
