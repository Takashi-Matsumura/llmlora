from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import json
import pandas as pd
from io import StringIO

from database.database import get_db
from models.database_models import Dataset
from models.schemas import DatasetCreate, DatasetResponse, DatasetType

router = APIRouter()

@router.post("/", response_model=DatasetResponse)
async def create_dataset(
    dataset: DatasetCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new dataset"""
    try:
        db_dataset = Dataset(
            name=dataset.name,
            description=dataset.description,
            type=dataset.type,
            data=dataset.data,
            size=len(dataset.data)
        )
        
        db.add(db_dataset)
        await db.commit()
        await db.refresh(db_dataset)
        
        return DatasetResponse(
            id=db_dataset.id,
            name=db_dataset.name,
            description=db_dataset.description,
            type=db_dataset.type,
            size=db_dataset.size,
            created_at=db_dataset.created_at,
            updated_at=db_dataset.updated_at
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[DatasetResponse])
async def list_datasets(db: AsyncSession = Depends(get_db)):
    """Get list of all datasets"""
    try:
        result = await db.execute(select(Dataset))
        datasets = result.scalars().all()
        
        return [
            DatasetResponse(
                id=dataset.id,
                name=dataset.name,
                description=dataset.description,
                type=dataset.type,
                size=dataset.size,
                created_at=dataset.created_at,
                updated_at=dataset.updated_at
            )
            for dataset in datasets
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific dataset"""
    try:
        result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
        dataset = result.scalar_one_or_none()
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        return DatasetResponse(
            id=dataset.id,
            name=dataset.name,
            description=dataset.description,
            type=dataset.type,
            size=dataset.size,
            created_at=dataset.created_at,
            updated_at=dataset.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dataset_id}/data")
async def get_dataset_data(dataset_id: int, limit: int = 100, offset: int = 0, db: AsyncSession = Depends(get_db)):
    """Get dataset data with pagination"""
    try:
        result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
        dataset = result.scalar_one_or_none()
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        data = dataset.data[offset:offset + limit]
        return {
            "data": data,
            "total": len(dataset.data),
            "offset": offset,
            "limit": limit
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = None,
    description: str = None,
    dataset_type: DatasetType = DatasetType.INSTRUCTION,
    db: AsyncSession = Depends(get_db)
):
    """Upload dataset from file (JSON or CSV)"""
    try:
        content = await file.read()
        
        if file.filename.endswith('.json'):
            data = json.loads(content.decode('utf-8'))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(StringIO(content.decode('utf-8')))
            data = df.to_dict('records')
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use JSON or CSV.")
        
        # Validate data format based on type
        if dataset_type == DatasetType.INSTRUCTION:
            required_fields = ['instruction', 'output']
            for item in data:
                if not all(field in item for field in required_fields):
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Instruction datasets require 'instruction' and 'output' fields"
                    )
        
        dataset_name = name or file.filename.split('.')[0]
        
        db_dataset = Dataset(
            name=dataset_name,
            description=description,
            type=dataset_type,
            data=data,
            size=len(data)
        )
        
        db.add(db_dataset)
        await db.commit()
        await db.refresh(db_dataset)
        
        return DatasetResponse(
            id=db_dataset.id,
            name=db_dataset.name,
            description=db_dataset.description,
            type=db_dataset.type,
            size=db_dataset.size,
            created_at=db_dataset.created_at,
            updated_at=db_dataset.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a dataset"""
    try:
        result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
        dataset = result.scalar_one_or_none()
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        await db.delete(dataset)
        await db.commit()
        
        return {"message": "Dataset deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))