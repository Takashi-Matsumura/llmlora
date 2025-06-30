from fastapi import APIRouter, HTTPException, Depends
from typing import List
from services.chat_service import ChatService
from models.schemas import (
    ChatSessionCreate, 
    ChatSessionResponse, 
    ChatMessageResponse,
    ChatGenerateRequest,
    ChatGenerateResponse
)

router = APIRouter()

# Dependency to get chat service
def get_chat_service() -> ChatService:
    return ChatService()

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    session_data: ChatSessionCreate,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Create a new chat session"""
    try:
        return await chat_service.create_session(session_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {e}")

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    chat_service: ChatService = Depends(get_chat_service)
):
    """Get all chat sessions"""
    try:
        return await chat_service.get_sessions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {e}")

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: int,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Get all messages for a chat session"""
    try:
        return await chat_service.get_session_messages(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {e}")

@router.post("/generate", response_model=ChatGenerateResponse)
async def generate_chat_response(
    request: ChatGenerateRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Generate a response using the fine-tuned model"""
    try:
        return await chat_service.generate_response(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {e}")

@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: int,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Delete a chat session"""
    try:
        await chat_service.delete_session(session_id)
        return {"message": "Session deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {e}")

@router.get("/completed-jobs")
async def get_completed_training_jobs(
    chat_service: ChatService = Depends(get_chat_service)
):
    """Get completed training jobs that can be used for chat"""
    try:
        # This will need to be implemented to return completed jobs
        from database.database import AsyncSessionLocal
        from sqlalchemy import select
        from models.database_models import TrainingJob
        from models.schemas import TrainingStatus
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(TrainingJob)
                .where(TrainingJob.status == TrainingStatus.COMPLETED)
                .where(TrainingJob.model_path.isnot(None))
            )
            jobs = result.scalars().all()
            
            return [
                {
                    "id": job.id,
                    "name": job.name,
                    "model_name": job.model_name,
                    "completed_at": job.completed_at,
                    "model_path": job.model_path
                }
                for job in jobs
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get completed jobs: {e}")