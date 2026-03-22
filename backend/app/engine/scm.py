"""
Standard Synthetic Control Method (Abadie, Diamond, Hainmueller 2010).

Finds a convex combination of control units that best approximates
the treated unit in the pre-treatment period. Weights are non-negative
and sum to one.

Uses CVXPY for constrained quadratic programming with OSQP solver
and SCS fallback.
"""

import warnings

import cvxpy as cp
import numpy as np

from .base import CausalModel


class StandardSCM(CausalModel):
    """
    Classic Synthetic Control Method.

    Solves:
        min_w  ||Y_pre_treat - Y_pre_control @ w||_2^2
        s.t.   w >= 0,  sum(w) = 1

    Parameters
    ----------
    name : str
        Model identifier for results.
    """

    name = "scm"

    def __init__(self, name: str = "scm"):
        self.name = name
        self.weights_: np.ndarray = np.array([])

    def fit(self, Y_pre_treat: np.ndarray, Y_pre_control: np.ndarray) -> None:
        """
        Fit SCM weights via constrained optimization.

        Parameters
        ----------
        Y_pre_treat : shape (T_pre,)
        Y_pre_control : shape (T_pre, N_control)
        """
        Y_pre_treat = np.asarray(Y_pre_treat, dtype=np.float64)
        Y_pre_control = np.asarray(Y_pre_control, dtype=np.float64)

        # Ensure 2D control matrix
        if Y_pre_control.ndim == 1:
            Y_pre_control = Y_pre_control.reshape(-1, 1)

        n_controls = Y_pre_control.shape[1]

        # Edge case: single control unit -> weight = 1.0
        if n_controls == 1:
            self.weights_ = np.array([1.0])
            return

        # Set up CVXPY problem
        w = cp.Variable(n_controls)
        objective = cp.Minimize(cp.sum_squares(Y_pre_treat - Y_pre_control @ w))
        constraints = [w >= 0, cp.sum(w) == 1]
        problem = cp.Problem(objective, constraints)

        # Try OSQP first (fast for QP), fall back to SCS
        solved = False
        for solver in [cp.OSQP, cp.SCS, cp.ECOS]:
            try:
                problem.solve(solver=solver, verbose=False)
                if problem.status in ("optimal", "optimal_inaccurate"):
                    solved = True
                    break
            except (cp.SolverError, Exception):
                continue

        if not solved or w.value is None:
            # Last resort: equal weights
            warnings.warn(
                "SCM optimization failed to converge. Using equal weights as fallback.",
                RuntimeWarning,
                stacklevel=2,
            )
            self.weights_ = np.ones(n_controls) / n_controls
            return

        # Clean up: clip tiny negatives from solver tolerance, re-normalize
        weights = np.asarray(w.value).flatten()
        weights = np.maximum(weights, 0.0)
        weight_sum = weights.sum()
        if weight_sum > 0:
            weights = weights / weight_sum
        else:
            weights = np.ones(n_controls) / n_controls

        self.weights_ = weights

    def predict(self, Y_control: np.ndarray) -> np.ndarray:
        """
        Predict counterfactual as weighted combination of controls.

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
        return Y_control @ self.weights_
