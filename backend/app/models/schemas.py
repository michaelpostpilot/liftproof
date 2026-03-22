from pydantic import BaseModel
from typing import Optional


class AnalysisRequest(BaseModel):
    experiment_id: str


class AnalysisProgress(BaseModel):
    event: str  # "progress", "complete", "error"
    step: str
    progress: float  # 0.0 to 1.0
    message: Optional[str] = None


class AnalysisResult(BaseModel):
    experiment_id: str
    kpi: str
    lift_amount: Optional[float]
    lift_percent: Optional[float]
    ci_lower: Optional[float]
    ci_upper: Optional[float]
    p_value: Optional[float]
    incrementality_factor: Optional[float]
    iroas: Optional[float]
    cpia: Optional[float]
    statistical_power: Optional[float]
    model_weights: Optional[dict]
    synthetic_control_series: Optional[list]
    treatment_series: Optional[list]
    cumulative_lift_series: Optional[list]
    ci_lower_series: Optional[list]
    ci_upper_series: Optional[list]
    placebo_distribution: Optional[list]
    dates: Optional[list]
    pre_period_fit_rmse: Optional[float]


class ExportRequest(BaseModel):
    experiment_id: str
