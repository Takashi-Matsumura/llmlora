from fastapi import APIRouter, HTTPException
from services.ollama_service import OllamaService
from models.schemas import ModelListResponse

router = APIRouter()

@router.get("/", response_model=ModelListResponse)
async def list_models():
    """Get list of available models from Ollama"""
    async with OllamaService() as ollama:
        try:
            return await ollama.list_models()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/pull/{model_name}")
async def pull_model(model_name: str):
    """Pull a model to Ollama"""
    async with OllamaService() as ollama:
        try:
            result = await ollama.pull_model(model_name)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/check/{model_name}")
async def check_model(model_name: str):
    """Check if a model exists in Ollama"""
    async with OllamaService() as ollama:
        try:
            exists = await ollama.check_model_exists(model_name)
            return {"model_name": model_name, "exists": exists}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Check Ollama service health"""
    async with OllamaService() as ollama:
        healthy = await ollama.health_check()
        if healthy:
            return {"status": "healthy"}
        else:
            raise HTTPException(status_code=503, detail="Ollama service unavailable")