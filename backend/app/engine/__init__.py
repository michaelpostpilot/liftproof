"""
LiftProof Statistical Engine - Geo-testing incrementality analysis.

Implements Augmented Synthetic Control Methods for measuring the causal
impact of geo-targeted marketing interventions.

Public API:
    - StandardSCM: Classic synthetic control (Abadie et al. 2010)
    - AugmentedSCM: Bias-corrected SCM (Ben-Michael et al. 2021)
    - DID: Difference-in-Differences baseline
    - run_ensemble: Multi-model ensemble with inverse-RMSE weighting
    - run_inference: Fisher randomization test for statistical significance
    - prepare_panel_data: DataFrame -> numpy array preprocessing
"""

from .augmented_scm import AugmentedSCM
from .base import CausalModel, ModelResult
from .did import DID
from .ensemble import EnsembleResult, run_ensemble
from .inference import InferenceResult, run_inference
from .scm import StandardSCM
from .utils import PanelData, prepare_panel_data

__all__ = [
    "CausalModel",
    "ModelResult",
    "StandardSCM",
    "AugmentedSCM",
    "DID",
    "run_ensemble",
    "EnsembleResult",
    "run_inference",
    "InferenceResult",
    "prepare_panel_data",
    "PanelData",
]
