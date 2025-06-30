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
            logger.info(f"Loading model: {job.model_name} -> {self._resolve_model_name(job.model_name)}")
            model_name = self._resolve_model_name(job.model_name)
            
            # Update job status to indicate model loading
            job.error_message = "モデルをダウンロード中..."
            await db.commit()
            
            logger.info(f"Loading tokenizer for {model_name}...")
            tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                cache_dir=self.model_cache_dir,
                trust_remote_code=True
            )
            logger.info("Tokenizer loaded successfully")
            
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            # Determine appropriate dtype based on device availability
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if device == "cuda" else torch.float32
            
            logger.info(f"Loading model {model_name} with dtype {dtype}...")
            job.error_message = "モデルファイルをロード中..."
            await db.commit()
            
            # Special memory-efficient loading for large models like Gemma2-2B
            if "gemma-2-2b" in model_name:
                logger.info("Loading model with memory optimizations for Gemma2-2B")
                
                # Try QLoRA if GPU is available, otherwise use CPU optimizations
                if device == "cuda":
                    try:
                        from transformers import BitsAndBytesConfig
                        bnb_config = BitsAndBytesConfig(
                            load_in_4bit=True,
                            bnb_4bit_use_double_quant=True,
                            bnb_4bit_quant_type="nf4",
                            bnb_4bit_compute_dtype=torch.float16,
                        )
                        logger.info("Using QLoRA (4-bit quantization) for GPU")
                        model = AutoModelForCausalLM.from_pretrained(
                            model_name,
                            cache_dir=self.model_cache_dir,
                            device_map="auto",
                            quantization_config=bnb_config,
                            trust_remote_code=True,
                            token=os.environ.get('HF_TOKEN')
                        )
                    except Exception as e:
                        logger.warning(f"QLoRA failed, falling back to standard loading: {e}")
                        model = AutoModelForCausalLM.from_pretrained(
                            model_name,
                            cache_dir=self.model_cache_dir,
                            device_map="auto",
                            torch_dtype=torch.float16,
                            trust_remote_code=True,
                            token=os.environ.get('HF_TOKEN')
                        )
                else:
                    # CPU optimizations
                    logger.info("Using CPU optimizations (no quantization)")
                    model = AutoModelForCausalLM.from_pretrained(
                        model_name,
                        cache_dir=self.model_cache_dir,
                        torch_dtype=torch.float32,
                        trust_remote_code=True,
                        low_cpu_mem_usage=True,
                        use_cache=False,
                        token=os.environ.get('HF_TOKEN')
                    )
            else:
                model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    cache_dir=self.model_cache_dir,
                    device_map="auto" if device == "cuda" else None,
                    torch_dtype=dtype,
                    trust_remote_code=True
                )
            logger.info("Model loaded successfully")
            
            # Move model to appropriate device if not using device_map
            if device == "cpu":
                model = model.to(device)

            # Prepare LoRA configuration with appropriate target modules
            target_modules = self._get_target_modules(model_name, job.lora_config.get("target_modules", []))
            
            # Special handling for Gemma2 models
            if "gemma-2-2b" in model_name:
                logger.info(f"Using Gemma2-specific LoRA config with modules: {target_modules}")
                lora_config = LoraConfig(
                    task_type=TaskType.CAUSAL_LM,
                    r=job.lora_config["r"],
                    lora_alpha=job.lora_config["alpha"],
                    lora_dropout=job.lora_config["dropout"],
                    target_modules=target_modules,
                    bias="none",  # Important for Gemma2
                    fan_in_fan_out=False,  # Important for Gemma2
                    inference_mode=False,  # Ensure training mode
                )
            else:
                lora_config = LoraConfig(
                    task_type=TaskType.CAUSAL_LM,
                    r=job.lora_config["r"],
                    lora_alpha=job.lora_config["alpha"],
                    lora_dropout=job.lora_config["dropout"],
                    target_modules=target_modules,
                )

            # Apply LoRA to model
            logger.info("Applying LoRA configuration...")
            job.error_message = "LoRA設定を適用中..."
            await db.commit()
            
            model = get_peft_model(model, lora_config)
            model.print_trainable_parameters()
            
            # Ensure model is in training mode and requires gradients
            model.train()
            for param in model.parameters():
                if param.requires_grad:
                    param.requires_grad_(True)
            
            logger.info("LoRA configuration applied successfully")

            # Prepare dataset
            logger.info("Preparing training dataset...")
            job.error_message = "データセットを準備中..."
            await db.commit()
            
            train_dataset = self._prepare_dataset(dataset.data, tokenizer, job.training_config["max_length"])
            logger.info(f"Dataset prepared with {len(train_dataset)} samples")

            # Memory-optimized training arguments for large models
            batch_size = 1 if "gemma-2-2b" in model_name else job.training_config["batch_size"]
            grad_accum = 8 if "gemma-2-2b" in model_name else job.training_config["gradient_accumulation_steps"]
            
            training_args = TrainingArguments(
                output_dir=str(job_output_dir),
                num_train_epochs=job.training_config["num_epochs"],
                per_device_train_batch_size=batch_size,  # Reduce for large models
                gradient_accumulation_steps=grad_accum,  # Increase for large models
                warmup_ratio=job.training_config["warmup_ratio"],
                learning_rate=job.training_config["learning_rate"],
                weight_decay=job.training_config["weight_decay"],
                logging_steps=1,  # Log every step for real-time updates
                save_steps=job.training_config["save_steps"],
                save_total_limit=2,  # Reduce to save disk space
                remove_unused_columns=False,
                dataloader_pin_memory=False,  # Disable for memory efficiency
                dataloader_num_workers=0,  # Single threaded to reduce memory
                report_to=None,
                # Gradient and optimization flags
                gradient_checkpointing=False if "gemma-2-2b" in model_name else True,  # Disable for Gemma2 to fix gradient issues
                optim="adamw_torch",  # More memory efficient optimizer
                fp16=False,  # Use float32 for CPU stability
                no_cuda=True if device == "cpu" else False,
                use_cpu=True if device == "cpu" else False,
                logging_strategy="steps",
                eval_strategy="no",  # Updated parameter name
                # Gradient specific settings for Gemma2
                max_grad_norm=1.0,  # Gradient clipping
                adam_beta1=0.9,
                adam_beta2=0.999,
                adam_epsilon=1e-8,
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

            # Clear status message and start training
            job.error_message = None
            job.total_steps = len(train_dataset) // job.training_config["batch_size"] * job.training_config["num_epochs"]
            await db.commit()
            
            # Start training
            logger.info(f"Starting training for job {job.id} with {job.total_steps} total steps")
            trainer.train()
            
            logger.info(f"Training completed for job {job.id}")

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
            # Use publicly available models for stable training
            "gemma2:2b": "google/gemma-2-2b",  # Actual Gemma2 2B model (requires HF token)
            "gemma": "rinna/japanese-gpt-neox-3.6b",  # Default to Japanese model
            "gemma:7b": "rinna/japanese-gpt-neox-3.6b",
            
            # Alternative: Use smaller public models
            "llama2": "microsoft/DialoGPT-medium",  # Stable and fast
            "llama2:7b": "microsoft/DialoGPT-medium",  
            "llama2:13b": "microsoft/DialoGPT-medium",
            
            # Other models
            "mistral": "microsoft/DialoGPT-medium",  # Fallback to stable model
            "codellama": "microsoft/DialoGPT-medium",
            
            # Japanese models
            "japanese": "rinna/japanese-gpt-neox-3.6b",  # Japanese specialized model
            "rinna-1b": "rinna/japanese-gpt-1b",  # Lightweight Japanese model (recommended)
            "gemma-3n": "google/gemma-2-2b",  # Gemma 3B model (mapped to available Gemma2-2B)
            
            # Fallback
            "fallback": "microsoft/DialoGPT-medium",
        }
        
        return model_mapping.get(model_name, "rinna/japanese-gpt-neox-3.6b")

    def _get_target_modules(self, model_name: str, requested_modules: list) -> list:
        """Get appropriate target modules for the given model"""
        # Define target modules for different model architectures
        model_modules = {
            # GPT-2 based models (DialoGPT)
            "microsoft/DialoGPT": ["c_attn", "c_proj"],
            
            # Japanese models (GPT-NeoX architecture)
            "rinna/japanese-gpt-neox": ["query_key_value", "dense"],
            "rinna/japanese-gpt-1b": ["c_attn", "c_proj"],  # GPT-2 architecture
            "cyberagent/open-calm": ["query_key_value", "dense"],
            
            # LLaMA based models
            "meta-llama": ["q_proj", "v_proj", "k_proj", "o_proj"],
            "mistralai": ["q_proj", "v_proj", "k_proj", "o_proj"],
            
            # Gemma models (specific architecture)
            "google/gemma-2": ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            "google/gemma": ["q_proj", "v_proj", "k_proj", "o_proj"],
        }
        
        # Find matching modules based on model name
        for model_prefix, modules in model_modules.items():
            if model_prefix in model_name:
                return modules
                
        # Default fallback for GPT-2 based models (most common)
        return ["c_attn", "c_proj"]

    def _prepare_dataset(self, data: list, tokenizer, max_length: int) -> HFDataset:
        """Prepare dataset for training"""
        # Prepare text data with appropriate formatting for DialoGPT
        texts = []
        for item in data:
            if "instruction" in item and "output" in item:
                # Format for Japanese instruction-response pairs
                text = f"User: {item['instruction']} Bot: {item['output']}<|endoftext|>"
            elif "input" in item and "output" in item:
                # Format for simple input-output pairs
                text = f"User: {item['input']} Bot: {item['output']}<|endoftext|>"
            elif "question" in item and "answer" in item:
                # Format for Q&A pairs
                text = f"User: {item['question']} Bot: {item['answer']}<|endoftext|>"
            else:
                # Generic text format
                text = f"User: {str(item)} Bot: こんにちは<|endoftext|>"
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
        
        # Save metrics to database synchronously to avoid session conflicts
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If we're in an async context, schedule the update
                asyncio.create_task(self._save_metrics_safely(logs))
            else:
                # Run synchronously
                loop.run_until_complete(self._save_metrics_safely(logs))
        except Exception as e:
            logger.error(f"Failed to schedule metrics save: {e}")

    async def _save_metrics_safely(self, logs: Dict[str, float]):
        """Save training metrics to database with separate session"""
        try:
            # Use a new database session to avoid conflicts
            async with AsyncSessionLocal() as new_session:
                if "loss" in logs and "epoch" in logs:
                    # Save metric
                    metric = DBTrainingMetrics(
                        job_id=self.job_id,
                        step=self.state.global_step,
                        epoch=int(logs["epoch"]),
                        loss=logs["loss"],
                        learning_rate=logs.get("learning_rate", 0),
                    )
                    
                    new_session.add(metric)
                    
                    # Update job progress - use step-based calculation for more frequent updates
                    if self.state.max_steps > 0:
                        progress = (self.state.global_step / self.state.max_steps) * 100
                    else:
                        # Fallback to epoch-based calculation
                        progress = (logs["epoch"] / self.args.num_train_epochs) * 100
                    await new_session.execute(
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
                    
                    await new_session.commit()
                    logger.info(f"Progress updated: {progress:.1f}% (Epoch {int(logs['epoch'])}/{self.args.num_train_epochs}, Step {self.state.global_step}/{self.state.max_steps}, Loss: {logs['loss']:.4f})")
                
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
    
    async def _save_metrics(self, logs: Dict[str, float]):
        """Legacy method for backward compatibility"""
        await self._save_metrics_safely(logs)