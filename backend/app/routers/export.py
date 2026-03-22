from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.dependencies import get_current_user
from app.services.export_service import ExportService

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/pdf/{experiment_id}")
async def export_pdf(
    experiment_id: str,
    user_id: str = Depends(get_current_user),
):
    """Generate and download a PDF report for an experiment."""
    service = ExportService()
    try:
        pdf_bytes = service.generate_pdf(experiment_id, user_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="liftproof-report-{experiment_id[:8]}.pdf"'
        },
    )
