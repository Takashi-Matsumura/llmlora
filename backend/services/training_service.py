import asyncio
import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
import torch
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import Dataset as HFDataset
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from loguru import logger

from database.database import AsyncSessionLocal
from models.database_models import TrainingJob, Dataset, TrainingMetrics as DBTrainingMetrics
from models.schemas import TrainingStatus

class TrainingService:
    def __init__(self):
        self.model_cache_dir = "/app/model_cache"
        self.output_dir = "/app/training_data"
        os.makedirs(self.model_cache_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)

    async def start_training(self, job_id: int):
        """Start training job in background"""
        async with AsyncSessionLocal() as db:
            try:
                # Get job details
                result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
                job = result.scalar_one_or_none()
                if not job:
                    logger.error(f"Training job {job_id} not found")
                    return

                # Update job status to running
                job.status = TrainingStatus.RUNNING
                job.started_at = datetime.utcnow()
                await db.commit()

                # Get dataset
                dataset_result = await db.execute(select(Dataset).where(Dataset.id == job.dataset_id))
                dataset = dataset_result.scalar_one_or_none()
                
                if not dataset:
                    await self._update_job_error(db, job_id, "Dataset not found")
                    return

                # Run training
                await self._run_training(db, job, dataset)

            except Exception as e:
                logger.error(f"Training job {job_id} failed: {e}")
                await self._update_job_error(db, job_id, str(e))

    async def _run_training(self, db: AsyncSession, job: TrainingJob, dataset: Dataset):
        """Execute the actual training process"""
        try:
            # Prepare output directory
            job_output_dir = Path(self.output_dir) / f"job_{job.id}"
            job_output_dir.mkdir(exist_ok=True)
            
            # Update job with output directory
            job.output_dir = str(job_output_dir)
            await db.commit()

            # Load model and tokenizer
            logger.info(f"Loading model: {job.model_name}")
            model_name = self._resolve_model_name(job.model_name)
            
            tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                cache_dir=self.model_cache_dir,
                trust_remote_code=True
            )
            
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            # Determine appropriate dtype based on device availability
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if device == "cuda" else torch.float32
            
            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                cache_dir=self.model_cache_dir,
                device_map="auto" if device == "cuda" else None,
                torch_dtype=dtype,
                trust_remote_code=True
            )
            
            # Move model to appropriate device if not using device_map
            if device == "cpu":
                model = model.to(device)

            # Prepare LoRA configuration with appropriate target modules
            target_modules = self._get_target_modules(model_name, job.lora_config.get("target_modules", []))
            lora_config = LoraConfig(
                task_type=TaskType.CAUSAL_LM,
                r=job.lora_config["r"],
                lora_alpha=job.lora_config["alpha"],
                lora_dropout=job.lora_config["dropout"],
                target_modules=target_modules,
            )

            # Apply LoRA to model
            model = get_peft_model(model, lora_config)
            model.print_trainable_parameters()

            # Prepare dataset
            train_dataset = self._prepare_dataset(dataset.data, tokenizer, job.training_config["max_length"])

            # Training arguments
            training_args = TrainingArguments(
                output_dir=str(job_output_dir),
                num_train_epochs=job.training_config["num_epochs"],
                per_device_train_batch_size=job.training_config["batch_size"],
                gradient_accumulation_steps=job.training_config["gradient_accumulation_steps"],
                warmup_ratio=job.training_config["warmup_ratio"],
                learning_rate=job.training_config["learning_rate"],
                weight_decay=job.training_config["weight_decay"],
                logging_steps=job.training_config["logging_steps"],
                save_steps=job.training_config["save_steps"],
                save_total_limit=3,
                remove_unused_columns=False,
                dataloader_pin_memory=False,
                report_to=None,
                no_cuda=True if device == "cpu" else False,
                use_cpu=True if device == "cpu" else False,
            )

            # Data collator
            data_collator = DataCollatorForLanguageModeling(
                tokenizer=tokenizer,
                mlm=False,
            )

            # Custom trainer with progress tracking
            trainer = TrainerWithProgress(
                model=model,
                args=training_args,
                train_dataset=train_dataset,
                data_collator=data_collator,
                job_id=job.id,
                db_session=db
            )

            # Start training
            logger.info(f"Starting training for job {job.id}")
            trainer.train()

            # Save final model
            final_model_path = job_output_dir / "final_model"
            trainer.save_model(str(final_model_path))
            tokenizer.save_pretrained(str(final_model_path))

            # Update job completion
            job.status = TrainingStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.progress = 100.0
            job.model_path = str(final_model_path)
            await db.commit()

            logger.info(f"Training job {job.id} completed successfully")

        except Exception as e:
            logger.error(f"Training failed for job {job.id}: {e}")
            raise

    def _resolve_model_name(self, model_name: str) -> str:
        """Resolve Ollama model name to HuggingFace model name"""
        # Map common Ollama models to HuggingFace equivalents
        model_mapping = {
            "llama2": "microsoft/DialoGPT-medium",  # Temporary for testing
            "llama2:7b": "microsoft/DialoGPT-medium",  # Temporary for testing
            "llama2:13b": "microsoft/DialoGPT-medium",  # Temporary for testing
            # TODO: Use actual models when ready for production:
            # "llama2:7b": "meta-llama/Llama-2-7b-hf",
            # "llama2:13b": "meta-llama/Llama-2-13b-hf", 
            # "gemma": "google/gemma-7b",
            # "mistral": "mistralai/Mistral-7B-Instruct-v0.1",
            "codellama": "microsoft/DialoGPT-medium",
            "mistral": "microsoft/DialoGPT-medium",
            "gemma": "microsoft/DialoGPT-medium",
        }
        
        return model_mapping.get(model_name, "microsoft/DialoGPT-medium")

    def _get_target_modules(self, model_name: str, requested_modules: list) -> list:
        """Get appropriate target modules for the given model"""
        # Define target modules for different model architectures
        model_modules = {
            "microsoft/DialoGPT-medium": ["c_attn", "c_proj"],
            "microsoft/DialoGPT-large": ["c_attn", "c_proj"],
            "meta-llama": ["q_proj", "v_proj", "k_proj", "o_proj"],
            "mistralai": ["q_proj", "v_proj", "k_proj", "o_proj"],
            "google/gemma": ["q_proj", "v_proj", "k_proj", "o_proj"],
        }
        
        # Find matching modules based on model name
        for model_prefix, modules in model_modules.items():
            if model_prefix in model_name:
                return modules
                
        # Default fallback
        return ["c_attn", "c_proj"]

    def _prepare_dataset(self, data: list, tokenizer, max_length: int) -> HFDataset:
        """Prepare dataset for training"""
        # Prepare text data
        texts = []
        for item in data:
            if "instruction" in item and "output" in item:
                text = f"### Instruction:\n{item['instruction']}\n\n### Response:\n{item['output']}"
            elif "input" in item and "output" in item:
                text = f"{item['input']}\n{item['output']}"
            else:
                # Generic text format
                text = str(item)
            texts.append(text)
        
        def tokenize_function(examples):
            # Tokenize each text
            tokenized = tokenizer(
                examples["text"],
                truncation=True,
                padding=True,
                max_length=max_length,
                return_tensors=None,
            )
            
            # Set labels same as input_ids for causal LM
            tokenized["labels"] = [input_ids.copy() for input_ids in tokenized["input_ids"]]
            
            return tokenized

        # Create dataset with text column
        dataset_dict = {"text": texts}
        hf_dataset = HFDataset.from_dict(dataset_dict)
        
        # Apply tokenization
        tokenized_dataset = hf_dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=["text"]
        )
        
        return tokenized_dataset

    async def _update_job_error(self, db: AsyncSession, job_id: int, error_message: str):
        """Update job with error status"""
        try:
            await db.execute(
                update(TrainingJob)
                .where(TrainingJob.id == job_id)
                .values(
                    status=TrainingStatus.FAILED,
                    error_message=error_message,
                    completed_at=datetime.utcnow()
                )
            )
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to update job error: {e}")

class TrainerWithProgress(Trainer):
    """Custom trainer that tracks progress to database"""
    
    def __init__(self, job_id: int, db_session: AsyncSession, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.job_id = job_id
        self.db_session = db_session

    def log(self, logs: Dict[str, float]) -> None:
        """Override log method to save metrics to database"""
        super().log(logs)
        
        # Save metrics to database
        asyncio.create_task(self._save_metrics(logs))

    async def _save_metrics(self, logs: Dict[str, float]):
        """Save training metrics to database"""
        try:
            if "loss" in logs and "epoch" in logs:
                metric = DBTrainingMetrics(
                    job_id=self.job_id,
                    step=self.state.global_step,
                    epoch=int(logs["epoch"]),
                    loss=logs["loss"],
                    learning_rate=logs.get("learning_rate", 0),
                )
                
                self.db_session.add(metric)
                
                # Update job progress
                progress = (logs["epoch"] / self.args.num_train_epochs) * 100
                await self.db_session.execute(
                    update(TrainingJob)
                    .where(TrainingJob.id == self.job_id)
                    .values(
                        progress=progress,
                        current_epoch=int(logs["epoch"]),
                        current_step=self.state.global_step,
                        total_steps=self.state.max_steps,
                        loss=logs["loss"]
                    )
                )
                
                await self.db_session.commit()
                
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")