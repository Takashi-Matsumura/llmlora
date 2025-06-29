import httpx
import os
from typing import List, Dict, Any
from models.schemas import OllamaModel, ModelListResponse
from datetime import datetime
from loguru import logger

class OllamaService:
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.client = httpx.AsyncClient(timeout=30.0)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def list_models(self) -> ModelListResponse:
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            data = response.json()
            
            models = []
            for model_info in data.get("models", []):
                models.append(OllamaModel(
                    name=model_info["name"],
                    size=model_info.get("size", 0),
                    digest=model_info.get("digest", ""),
                    modified_at=datetime.fromisoformat(
                        model_info.get("modified_at", datetime.now().isoformat())
                    )
                ))
            
            return ModelListResponse(models=models)
        except httpx.HTTPError as e:
            logger.error(f"Error fetching models from Ollama: {e}")
            raise Exception(f"Failed to fetch models: {e}")

    async def check_model_exists(self, model_name: str) -> bool:
        try:
            models = await self.list_models()
            return any(model.name == model_name for model in models.models)
        except Exception as e:
            logger.error(f"Error checking model existence: {e}")
            return False

    async def pull_model(self, model_name: str) -> Dict[str, Any]:
        try:
            response = await self.client.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name}
            )
            response.raise_for_status()
            return {"status": "success", "message": f"Model {model_name} pulled successfully"}
        except httpx.HTTPError as e:
            logger.error(f"Error pulling model {model_name}: {e}")
            raise Exception(f"Failed to pull model: {e}")

    async def generate(self, model_name: str, prompt: str, **kwargs) -> Dict[str, Any]:
        try:
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    **kwargs
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error generating with model {model_name}: {e}")
            raise Exception(f"Failed to generate: {e}")

    async def health_check(self) -> bool:
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
            return False