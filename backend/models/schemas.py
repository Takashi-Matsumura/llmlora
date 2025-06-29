from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TrainingStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class DatasetType(str, Enum):
    INSTRUCTION = "instruction"
    CHAT = "chat"
    COMPLETION = "completion"

class ChatMessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"

# Dataset schemas
class DatasetCreate(BaseModel):
    name: str = Field(..., description="Dataset name")
    description: Optional[str] = None
    type: DatasetType
    data: List[Dict[str, Any]] = Field(..., description="Training data")

class DatasetResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    type: DatasetType
    size: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Model schemas
class OllamaModel(BaseModel):
    name: str
    size: int
    digest: str
    modified_at: datetime

class ModelListResponse(BaseModel):
    models: List[OllamaModel]

# LoRA configuration
class LoRAConfig(BaseModel):
    r: int = Field(default=8, ge=1, le=512, description="LoRA rank")
    alpha: int = Field(default=16, ge=1, le=1024, description="LoRA alpha")
    dropout: float = Field(default=0.1, ge=0, le=1, description="LoRA dropout")
    target_modules: List[str] = Field(default=["q_proj", "v_proj"], description="Target modules for LoRA")

# Training configuration
class TrainingConfig(BaseModel):
    learning_rate: float = Field(default=2e-4, gt=0, description="Learning rate")
    num_epochs: int = Field(default=3, ge=1, le=100, description="Number of training epochs")
    batch_size: int = Field(default=4, ge=1, le=128, description="Batch size")
    max_length: int = Field(default=512, ge=64, le=4096, description="Maximum sequence length")
    gradient_accumulation_steps: int = Field(default=1, ge=1, description="Gradient accumulation steps")
    warmup_ratio: float = Field(default=0.1, ge=0, le=1, description="Warmup ratio")
    weight_decay: float = Field(default=0.01, ge=0, le=1, description="Weight decay")
    logging_steps: int = Field(default=10, ge=1, description="Logging frequency")
    save_steps: int = Field(default=500, ge=1, description="Save frequency")

# Training job
class TrainingJobCreate(BaseModel):
    name: str = Field(..., description="Training job name")
    model_name: str = Field(..., description="Base model name")
    dataset_id: int = Field(..., description="Dataset ID")
    lora_config: LoRAConfig
    training_config: TrainingConfig

class TrainingJobResponse(BaseModel):
    id: int
    name: str
    model_name: str
    dataset_id: int
    status: TrainingStatus
    lora_config: LoRAConfig
    training_config: TrainingConfig
    progress: float
    current_epoch: int
    total_epochs: int
    loss: Optional[float]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]

    class Config:
        from_attributes = True

# Training metrics
class TrainingMetrics(BaseModel):
    step: int
    epoch: int
    loss: float
    learning_rate: float
    timestamp: datetime

class TrainingProgress(BaseModel):
    job_id: int
    status: TrainingStatus
    progress: float
    current_epoch: int
    total_epochs: int
    current_step: int
    total_steps: int
    loss: Optional[float]
    metrics: List[TrainingMetrics]

# Chat schemas
class ChatSessionCreate(BaseModel):
    name: str = Field(..., description="Chat session name")
    job_id: int = Field(..., description="Training job ID")
    settings: Optional[Dict[str, Any]] = Field(default=None, description="Generation settings")

class ChatSessionResponse(BaseModel):
    id: int
    name: str
    job_id: int
    model_path: str
    settings: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    content: str = Field(..., description="Message content")

class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: ChatMessageRole
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True

class ChatGenerateRequest(BaseModel):
    session_id: int = Field(..., description="Chat session ID")
    message: str = Field(..., description="User message")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, description="Generation temperature")
    max_tokens: Optional[int] = Field(default=512, ge=1, le=4096, description="Maximum tokens to generate")

class ChatGenerateResponse(BaseModel):
    message_id: int
    response: str
    session_id: int