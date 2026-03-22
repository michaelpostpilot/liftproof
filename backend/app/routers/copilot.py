from __future__ import annotations

from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services.copilot_service import CopilotService

router = APIRouter(prefix="/api/copilot", tags=["copilot"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[Dict[str, Any]] = None


@router.post("/chat")
async def chat_stream(
    request: ChatRequest,
    user_id: str = Depends(get_current_user),
):
    """
    SSE endpoint for copilot chat. Streams Claude responses in real time.
    """
    service = CopilotService()

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    async def event_generator():
        async for event in service.stream_chat(messages, request.context):
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
