from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.dependencies import get_current_user
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/stream/{experiment_id}")
async def stream_analysis(
    experiment_id: str,
    user_id: str = Depends(get_current_user),
):
    """
    SSE endpoint that runs the analysis and streams progress events.
    The client connects to this endpoint to receive real-time updates.
    """
    service = AnalysisService()

    async def event_generator():
        async for event in service.run_analysis(experiment_id, user_id):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
