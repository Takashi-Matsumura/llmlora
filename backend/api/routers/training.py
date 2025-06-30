from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from database.database import get_db
from models.database_models import TrainingJob, Dataset, TrainingMetrics, ChatSession, ChatMessage
from models.schemas import (
    TrainingJobCreate, TrainingJobResponse, TrainingStatus, 
    TrainingProgress
)
from services.training_service import TrainingService

router = APIRouter()

@router.post("/jobs", response_model=TrainingJobResponse)
async def create_training_job(
    job: TrainingJobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Create a new training job"""
    try:
        # Verify dataset exists
        result = await db.execute(select(Dataset).where(Dataset.id == job.dataset_id))
        dataset = result.scalar_one_or_none()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Create training job
        db_job = TrainingJob(
            name=job.name,
            model_name=job.model_name,
            dataset_id=job.dataset_id,
            lora_config=job.lora_config.dict(),
            training_config=job.training_config.dict(),
            total_epochs=job.training_config.num_epochs
        )
        
        db.add(db_job)
        await db.commit()
        await db.refresh(db_job)
        
        # Start training in background
        training_service = TrainingService()
        background_tasks.add_task(training_service.start_training, db_job.id)
        
        return TrainingJobResponse(
            id=db_job.id,
            name=db_job.name,
            model_name=db_job.model_name,
            dataset_id=db_job.dataset_id,
            status=db_job.status,
            lora_config=job.lora_config,
            training_config=job.training_config,
            progress=db_job.progress,
            current_epoch=db_job.current_epoch,
            total_epochs=db_job.total_epochs,
            loss=db_job.loss,
            created_at=db_job.created_at,
            started_at=db_job.started_at,
            completed_at=db_job.completed_at,
            error_message=db_job.error_message
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs", response_model=List[TrainingJobResponse])
async def list_training_jobs(db: AsyncSession = Depends(get_db)):
    """Get list of all training jobs"""
    try:
        result = await db.execute(select(TrainingJob).order_by(TrainingJob.created_at.desc()))
        jobs = result.scalars().all()
        
        response_jobs = []
        for job in jobs:
            response_jobs.append(TrainingJobResponse(
                id=job.id,
                name=job.name,
                model_name=job.model_name,
                dataset_id=job.dataset_id,
                status=job.status,
                lora_config=job.lora_config,
                training_config=job.training_config,
                progress=job.progress,
                current_epoch=job.current_epoch,
                total_epochs=job.total_epochs,
                loss=job.loss,
                created_at=job.created_at,
                started_at=job.started_at,
                completed_at=job.completed_at,
                error_message=job.error_message
            ))
        
        return response_jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}", response_model=TrainingJobResponse)
async def get_training_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific training job"""
    try:
        result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
        job = result.scalar_one_or_none()
        
        if not job:
            raise HTTPException(status_code=404, detail="Training job not found")
        
        return TrainingJobResponse(
            id=job.id,
            name=job.name,
            model_name=job.model_name,
            dataset_id=job.dataset_id,
            status=job.status,
            lora_config=job.lora_config,
            training_config=job.training_config,
            progress=job.progress,
            current_epoch=job.current_epoch,
            total_epochs=job.total_epochs,
            loss=job.loss,
            created_at=job.created_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            error_message=job.error_message
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}/progress", response_model=TrainingProgress)
async def get_training_progress(job_id: int, db: AsyncSession = Depends(get_db)):
    """Get training progress for a specific job"""
    try:
        result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
        job = result.scalar_one_or_none()
        
        if not job:
            raise HTTPException(status_code=404, detail="Training job not found")
        
        # Get recent metrics
        from models.database_models import TrainingMetrics as DBTrainingMetrics
        metrics_result = await db.execute(
            select(DBTrainingMetrics)
            .where(DBTrainingMetrics.job_id == job_id)
            .order_by(DBTrainingMetrics.timestamp.desc())
            .limit(100)
        )
        metrics = metrics_result.scalars().all()
        
        training_metrics = [
            TrainingMetrics(
                step=metric.step,
                epoch=metric.epoch,
                loss=metric.loss,
                learning_rate=metric.learning_rate,
                timestamp=metric.timestamp
            )
            for metric in metrics
        ]
        
        return TrainingProgress(
            job_id=job.id,
            status=job.status,
            progress=job.progress,
            current_epoch=job.current_epoch,
            total_epochs=job.total_epochs,
            current_step=job.current_step,
            total_steps=job.total_steps,
            loss=job.loss,
            metrics=training_metrics
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/{job_id}/cancel")
async def cancel_training_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Cancel a training job"""
    try:
        result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
        job = result.scalar_one_or_none()
        
        if not job:
            raise HTTPException(status_code=404, detail="Training job not found")
        
        if job.status not in [TrainingStatus.PENDING, TrainingStatus.RUNNING]:
            raise HTTPException(status_code=400, detail="Cannot cancel completed job")
        
        job.status = TrainingStatus.CANCELLED
        await db.commit()
        
        return {"message": "Training job cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/jobs/{job_id}")
async def delete_training_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a training job"""
    try:
        result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
        job = result.scalar_one_or_none()
        
        if not job:
            raise HTTPException(status_code=404, detail="Training job not found")
        
        # Prevent deletion of running jobs
        if job.status == TrainingStatus.RUNNING:
            raise HTTPException(status_code=400, detail="Cannot delete running training job")
        
        # Delete related records first to avoid foreign key constraints
        try:
            # Get chat session IDs for this job
            chat_sessions_result = await db.execute(
                select(ChatSession.id).where(ChatSession.job_id == job_id)
            )
            chat_session_ids = [row[0] for row in chat_sessions_result.fetchall()]
            
            # Delete chat messages first (they reference chat_sessions)
            if chat_session_ids:
                await db.execute(
                    delete(ChatMessage).where(ChatMessage.session_id.in_(chat_session_ids))
                )
            
            # Delete chat sessions
            await db.execute(delete(ChatSession).where(ChatSession.job_id == job_id))
            
            # Delete training metrics
            await db.execute(delete(TrainingMetrics).where(TrainingMetrics.job_id == job_id))
            
            # Finally delete the training job
            await db.delete(job)
            await db.commit()
            
            return {"message": "Training job deleted successfully"}
        except Exception as cleanup_error:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete related data: {str(cleanup_error)}")
            
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))