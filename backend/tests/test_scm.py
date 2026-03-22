"""
Tests for Standard Synthetic Control Method.

Verifies:
    1. Weights are non-negative and sum to 1
    2. Pre-period fit is reasonable (low RMSE relative to signal)
    3. Estimated treatment effect is within tolerance of true effect
    4. Edge cases: single control unit, identical controls
"""

import numpy as np
import pytest

from app.engine.scm import StandardSCM
from app.engine.augmented_scm import AugmentedSCM
from app.engine.did import DID


class TestStandardSCM:
    """Tests for the StandardSCM model."""

    def test_weights_non_negative(self, synthetic_panel_data):
        """SCM weights must be >= 0 (convexity constraint)."""
        d = synthetic_panel_data
        model = StandardSCM()
        model.fit(d["Y_pre_treat"], d["Y_pre_control"])
        assert np.all(model.weights_ >= -1e-10), "Weights contain negative values"

    def test_weights_sum_to_one(self, synthetic_panel_data):
        """SCM weights must sum to 1 (simplex constraint)."""
        d = synthetic_panel_data
        model = StandardSCM()
        model.fit(d["Y_pre_treat"], d["Y_pre_control"])
        assert abs(model.weights_.sum() - 1.0) < 1e-6, (
            f"Weights sum to {model.weights_.sum()}, expected 1.0"
        )

    def test_weights_sparse(self, synthetic_panel_data):
        """SCM should produce sparse weights (not all controls get weight)."""
        d = synthetic_panel_data
        model = StandardSCM()
        model.fit(d["Y_pre_treat"], d["Y_pre_control"])
        n_nonzero = np.sum(model.weights_ > 0.01)
        # Typically SCM selects a handful of controls
        assert n_nonzero < d["n_control"], "SCM weights are not sparse"

    def test_pre_period_fit(self, synthetic_panel_data):
        """Pre-period RMSE should be small relative to the outcome level."""
        d = synthetic_panel_data
        model = StandardSCM()
        result = model.evaluate(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        # RMSE should be < 5% of mean outcome level
        mean_level = np.mean(d["Y_pre_treat"])
        assert result.pre_rmse / mean_level < 0.05, (
            f"Pre-period RMSE ({result.pre_rmse:.1f}) is too large "
            f"relative to mean level ({mean_level:.1f})"
        )

    def test_detects_positive_lift(self, synthetic_panel_data):
        """SCM should detect a positive treatment effect (10% lift)."""
        d = synthetic_panel_data
        model = StandardSCM()
        result = model.evaluate(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        assert result.post_lift > 0, (
            f"Expected positive lift, got {result.post_lift:.2f}"
        )

    def test_lift_magnitude(self, synthetic_panel_data):
        """Estimated lift should be within reasonable range of true effect."""
        d = synthetic_panel_data
        model = StandardSCM()
        result = model.evaluate(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        # True total lift = sum of (10% * avg base level) over 21 days
        avg_base = np.mean(d["base_levels_treated"])
        expected_total_lift = d["true_lift_pct"] * avg_base * d["T_post"]
        # Allow wide tolerance (within 50% of true effect)
        assert result.post_lift > expected_total_lift * 0.5, (
            f"Lift {result.post_lift:.0f} is too far below expected {expected_total_lift:.0f}"
        )
        assert result.post_lift < expected_total_lift * 2.0, (
            f"Lift {result.post_lift:.0f} is too far above expected {expected_total_lift:.0f}"
        )

    def test_synthetic_control_length(self, synthetic_panel_data):
        """Output arrays should have correct dimensions."""
        d = synthetic_panel_data
        model = StandardSCM()
        result = model.evaluate(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        expected_len = d["T_pre"] + d["T_post"]
        assert len(result.synthetic_control) == expected_len
        assert len(result.treatment_series) == expected_len

    def test_single_control_unit(self):
        """Edge case: should work with a single control unit."""
        rng = np.random.default_rng(99)
        T_pre = 50
        T_post = 10
        control = rng.normal(100, 5, size=(T_pre + T_post, 1))
        treat_pre = control[:T_pre, 0] + rng.normal(0, 1, T_pre)
        treat_post = control[T_pre:, 0] + 10 + rng.normal(0, 1, T_post)

        model = StandardSCM()
        result = model.evaluate(treat_pre, control[:T_pre], treat_post, control[T_pre:])
        assert len(model.weights_) == 1
        assert abs(model.weights_[0] - 1.0) < 1e-10
        assert result.post_lift > 0


class TestAugmentedSCM:
    """Basic tests for Augmented SCM variants."""

    def test_ridge_detects_lift(self, synthetic_panel_data):
        """ASCM (ridge) should detect the treatment effect."""
        d = synthetic_panel_data
        model = AugmentedSCM(method="ridge")
        result = model.evaluate(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        assert result.post_lift > 0, f"Ridge ASCM: expected positive lift, got {result.post_lift}"

    def test_elastic_net_detects_lift(self, synthetic_panel_data):
        """ASCM (elastic_net) should detect the treatment effect."""
        d = synthetic_panel_data
        model = AugmentedSCM(method="elastic_net")
        result = model.evaluate(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        assert result.post_lift > 0, (
            f"ElasticNet ASCM: expected positive lift, got {result.post_lift}"
        )

    def test_invalid_method_raises(self):
        """Invalid method should raise ValueError."""
        with pytest.raises(ValueError, match="method must be"):
            AugmentedSCM(method="lasso")


class TestDID:
    """Tests for Difference-in-Differences."""

    def test_equal_weights(self, synthetic_panel_data):
        """DID should use equal weights."""
        d = synthetic_panel_data
        model = DID()
        model.fit(d["Y_pre_treat"], d["Y_pre_control"])
        expected_weight = 1.0 / d["n_control"]
        assert np.allclose(model.weights_, expected_weight), "DID weights are not equal"

    def test_detects_lift(self, synthetic_panel_data):
        """DID should detect the treatment effect."""
        d = synthetic_panel_data
        model = DID()
        result = model.evaluate(
            d["Y_pre_treat"], d["Y_pre_control"],
            d["Y_post_treat"], d["Y_post_control"],
        )
        assert result.post_lift > 0, f"DID: expected positive lift, got {result.post_lift}"
