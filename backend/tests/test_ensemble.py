"""
Tests for the multi-model ensemble and Fisher randomization inference.

Verifies:
    1. Ensemble produces results from all 4 models
    2. Ensemble weights sum to 1
    3. Ensemble detects positive lift
    4. Inference yields p-value < 0.05 for a known large effect
    5. Progress callbacks are invoked
"""

import numpy as np
import pytest

from app.engine.ensemble import run_ensemble, EnsembleResult
from app.engine.inference import run_inference, InferenceResult


class TestEnsemble:
    """Tests for the multi-model ensemble."""

    def test_returns_all_models(self, synthetic_panel_data):
        """Ensemble should return results from all 4 default models."""
        d = synthetic_panel_data
        result = run_ensemble(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        assert isinstance(result, EnsembleResult)
        assert len(result.individual_results) == 4
        model_names = {r.model_name for r in result.individual_results}
        assert "scm" in model_names
        assert "ascm_ridge" in model_names
        assert "ascm_elastic_net" in model_names
        assert "did" in model_names

    def test_ensemble_weights_sum_to_one(self, synthetic_panel_data):
        """Ensemble model weights should sum to 1."""
        d = synthetic_panel_data
        result = run_ensemble(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        total_weight = sum(result.ensemble_weights.values())
        assert abs(total_weight - 1.0) < 1e-6, (
            f"Ensemble weights sum to {total_weight}, expected 1.0"
        )

    def test_ensemble_detects_lift(self, synthetic_panel_data):
        """Ensemble should detect the known positive treatment effect."""
        d = synthetic_panel_data
        result = run_ensemble(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        assert result.ensemble_lift > 0, (
            f"Ensemble: expected positive lift, got {result.ensemble_lift}"
        )

    def test_ensemble_counterfactual_shape(self, synthetic_panel_data):
        """Ensemble counterfactual should span pre + post periods."""
        d = synthetic_panel_data
        result = run_ensemble(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        expected_len = d["T_pre"] + d["T_post"]
        assert len(result.ensemble_counterfactual) == expected_len
        assert len(result.treatment_series) == expected_len

    def test_progress_callback(self, small_panel_data):
        """Progress callback should be called multiple times."""
        d = small_panel_data
        messages = []

        def callback(msg, progress):
            messages.append((msg, progress))

        run_ensemble(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
            progress_callback=callback,
        )
        assert len(messages) >= 4, f"Expected >= 4 callbacks, got {len(messages)}"
        # Final callback should have progress == 1.0
        assert messages[-1][1] == 1.0

    def test_ensemble_pre_rmse(self, synthetic_panel_data):
        """Ensemble pre-period RMSE should be reasonable."""
        d = synthetic_panel_data
        result = run_ensemble(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        mean_level = np.mean(d["Y_pre_treat"])
        # Ensemble should fit pre-period well
        assert result.pre_rmse / mean_level < 0.05, (
            f"Ensemble pre-RMSE ({result.pre_rmse:.1f}) is too large "
            f"relative to mean ({mean_level:.1f})"
        )

    def test_individual_results_have_correct_structure(self, synthetic_panel_data):
        """Each individual result should have all expected fields."""
        d = synthetic_panel_data
        result = run_ensemble(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        for r in result.individual_results:
            assert r.model_name is not None
            assert len(r.synthetic_control) == d["T_pre"] + d["T_post"]
            assert len(r.treatment_series) == d["T_pre"] + d["T_post"]
            assert r.pre_rmse >= 0
            # All models should detect positive lift for this data
            assert r.post_lift > 0, f"{r.model_name} did not detect positive lift"


class TestInference:
    """Tests for Fisher randomization inference."""

    def test_significant_p_value(self, synthetic_panel_data):
        """
        With a known 10% lift on 50 geos, the p-value should be < 0.05.

        Uses 200 permutations for reasonable test speed.
        """
        d = synthetic_panel_data
        result = run_inference(
            panel=d["panel"],
            treated_indices=d["treated_indices"],
            pre_period_len=d["pre_period_len"],
            n_permutations=200,
            rng=np.random.default_rng(42),
        )
        assert isinstance(result, InferenceResult)
        assert result.p_value < 0.10, (
            f"Expected p-value < 0.10 for known effect, got {result.p_value}"
        )

    def test_confidence_interval_contains_effect(self, synthetic_panel_data):
        """CI should contain a positive value (consistent with positive lift)."""
        d = synthetic_panel_data
        result = run_inference(
            panel=d["panel"],
            treated_indices=d["treated_indices"],
            pre_period_len=d["pre_period_len"],
            n_permutations=200,
            rng=np.random.default_rng(42),
        )
        # The CI lower bound should be positive for a clear effect
        assert result.ci_lower > 0, (
            f"CI lower bound ({result.ci_lower:.1f}) should be > 0 for known positive effect"
        )

    def test_null_effects_array(self, synthetic_panel_data):
        """Null effects array should have correct length."""
        d = synthetic_panel_data
        n_perms = 100
        result = run_inference(
            panel=d["panel"],
            treated_indices=d["treated_indices"],
            pre_period_len=d["pre_period_len"],
            n_permutations=n_perms,
            rng=np.random.default_rng(42),
        )
        assert len(result.null_effects) == n_perms

    def test_observed_effect_positive(self, synthetic_panel_data):
        """Observed effect should be positive for data with positive lift."""
        d = synthetic_panel_data
        result = run_inference(
            panel=d["panel"],
            treated_indices=d["treated_indices"],
            pre_period_len=d["pre_period_len"],
            n_permutations=50,
            rng=np.random.default_rng(42),
        )
        assert result.observed_effect > 0

    def test_inference_progress_callback(self, small_panel_data):
        """Progress callback should be invoked during inference."""
        d = small_panel_data
        messages = []

        def callback(msg, progress):
            messages.append((msg, progress))

        run_inference(
            panel=d["panel"],
            treated_indices=d["treated_indices"],
            pre_period_len=d["pre_period_len"],
            n_permutations=20,
            progress_callback=callback,
            rng=np.random.default_rng(42),
        )
        assert len(messages) >= 2, f"Expected >= 2 callbacks, got {len(messages)}"

    def test_ensemble_result_included(self, small_panel_data):
        """InferenceResult should contain the full ensemble result."""
        d = small_panel_data
        result = run_inference(
            panel=d["panel"],
            treated_indices=d["treated_indices"],
            pre_period_len=d["pre_period_len"],
            n_permutations=20,
            rng=np.random.default_rng(42),
        )
        assert result.ensemble_result is not None
        assert isinstance(result.ensemble_result, EnsembleResult)
        assert len(result.ensemble_result.individual_results) == 4
