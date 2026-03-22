"""
Geo split recommendation endpoint.

Given a CSV upload and parameters, recommends the optimal treatment/control
geo assignment that maximizes pre-period fit quality for synthetic control.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services.recommend_service import RecommendService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


class RecommendRequest(BaseModel):
    csv_upload_id: str
    kpi_column: str
    n_treatment: int
    pre_period_start: str
    pre_period_end: str


class GeoRecommendation(BaseModel):
    treatment_geos: list[str]
    control_geos: list[str]
    pre_period_correlation: float
    cross_geo_cv: float
    explanation: str


@router.post("/geo-split", response_model=GeoRecommendation)
async def recommend_geo_split(
    request: RecommendRequest,
    user_id: str = Depends(get_current_user),
):
    """Recommend optimal treatment/control geo split."""
    try:
        service = RecommendService()
        return service.recommend_split(
            csv_upload_id=request.csv_upload_id,
            kpi_column=request.kpi_column,
            n_treatment=request.n_treatment,
            pre_period_start=request.pre_period_start,
            pre_period_end=request.pre_period_end,
        )
    except Exception as e:
        logger.exception("Geo split recommendation failed")
        raise HTTPException(status_code=500, detail=str(e))
