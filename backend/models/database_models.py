from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON, Enum, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.database import Base
from models.schemas import TrainingStatus, DatasetType, ChatMessageRole
import enum

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    type = Column(Enum(DatasetType), nullable=False)
    data = Column(JSON, nullable=False)
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    model_name = Column(String(255), nullable=False)
    dataset_id = Column(Integer, nullable=False)  # Foreign key reference
    status = Column(Enum(TrainingStatus), default=TrainingStatus.PENDING, nullable=False)
    
    # Configuration
    lora_config = Column(JSON, nullable=False)
    training_config = Column(JSON, nullable=False)
    
    # Progress tracking
    progress = Column(Float, default=0.0)
    current_epoch = Column(Integer, default=0)
    total_epochs = Column(Integer, nullable=False)
    current_step = Column(Integer, default=0)
    total_steps = Column(Integer, default=0)
    
    # Metrics
    loss = Column(Float, nullable=True)
    best_loss = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
    # Output paths
    output_dir = Column(String(500), nullable=True)
    model_path = Column(String(500), nullable=True)

class TrainingMetrics(Base):
    __tablename__ = "training_metrics"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=False)  # Foreign key reference
    step = Column(Integer, nullable=False)
    epoch = Column(Integer, nullable=False)
    loss = Column(Float, nullable=False)
    learning_rate = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("training_jobs.id"), nullable=False)
    model_path = Column(String(500), nullable=False)
    settings = Column(JSON, nullable=True)  # For generation parameters like temperature, max_tokens
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    training_job = relationship("TrainingJob")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(Enum(ChatMessageRole), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    session = relationship("ChatSession")