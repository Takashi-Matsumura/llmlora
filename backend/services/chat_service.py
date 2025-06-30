import os
import torch
from typing import Dict, Any, Optional, List
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, text
from datetime import datetime

from database.database import AsyncSessionLocal
from models.database_models import ChatSession, ChatMessage, TrainingJob, ChatMessageRole
from models.schemas import ChatSessionCreate, ChatSessionResponse, ChatMessageResponse, ChatGenerateRequest, ChatGenerateResponse

class ChatService:
    def __init__(self):
        self.model_cache = {}  # Cache for loaded models
        self.tokenizer_cache = {}  # Cache for tokenizers
        
    async def create_session(self, session_data: ChatSessionCreate) -> ChatSessionResponse:
        """Create a new chat session"""
        async with AsyncSessionLocal() as db:
            model_path = None
            
            # Handle fine-tuned model (training job)
            if session_data.job_id:
                result = await db.execute(select(TrainingJob).where(TrainingJob.id == session_data.job_id))
                job = result.scalar_one_or_none()
                
                if not job:
                    raise ValueError(f"Training job {session_data.job_id} not found")
                
                if not job.model_path:
                    raise ValueError(f"Training job {session_data.job_id} has no model path")
                
                model_path = job.model_path
            
            # Handle Ollama model
            elif session_data.model_name:
                # Verify Ollama model exists
                from services.ollama_service import OllamaService
                async with OllamaService() as ollama:
                    if not await ollama.check_model_exists(session_data.model_name):
                        raise ValueError(f"Ollama model {session_data.model_name} not found")
            
            else:
                raise ValueError("Either job_id or model_name must be provided")
            
            # Create chat session
            new_session = ChatSession(
                name=session_data.name,
                job_id=session_data.job_id,
                model_name=session_data.model_name,
                model_path=model_path,
                settings=session_data.settings or {}
            )
            
            db.add(new_session)
            await db.commit()
            await db.refresh(new_session)
            
            return ChatSessionResponse(
                id=new_session.id,
                name=new_session.name,
                job_id=new_session.job_id,
                model_name=new_session.model_name,
                model_path=new_session.model_path,
                settings=new_session.settings,
                created_at=new_session.created_at,
                updated_at=new_session.updated_at
            )
    
    async def get_sessions(self) -> List[ChatSessionResponse]:
        """Get all chat sessions"""
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(ChatSession))
            sessions = result.scalars().all()
            
            return [
                ChatSessionResponse(
                    id=session.id,
                    name=session.name,
                    job_id=session.job_id,
                    model_name=session.model_name,
                    model_path=session.model_path,
                    settings=session.settings,
                    created_at=session.created_at,
                    updated_at=session.updated_at
                )
                for session in sessions
            ]
    
    async def get_session_messages(self, session_id: int) -> List[ChatMessageResponse]:
        """Get all messages for a chat session"""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.timestamp)
            )
            messages = result.scalars().all()
            
            return [
                ChatMessageResponse(
                    id=msg.id,
                    session_id=msg.session_id,
                    role=msg.role,
                    content=msg.content,
                    timestamp=msg.timestamp
                )
                for msg in messages
            ]
    
    async def generate_response(self, request: ChatGenerateRequest) -> ChatGenerateResponse:
        """Generate a response using the fine-tuned model"""
        async with AsyncSessionLocal() as db:
            # Get session
            result = await db.execute(select(ChatSession).where(ChatSession.id == request.session_id))
            session = result.scalar_one_or_none()
            
            if not session:
                raise ValueError(f"Chat session {request.session_id} not found")
            
            # Save user message
            user_message = ChatMessage(
                session_id=request.session_id,
                role=ChatMessageRole.USER,
                content=request.message
            )
            db.add(user_message)
            await db.commit()
            await db.refresh(user_message)
            
            try:
                # Generate response based on session type
                if session.model_name:  # Ollama model
                    response_text = await self._generate_with_ollama(
                        session.model_name,
                        request.message,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens
                    )
                else:  # Fine-tuned model
                    response_text = await self._generate_with_model(
                        session.model_path,
                        session.job_id,
                        request.message,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens
                    )
                
                # Save assistant message
                assistant_message = ChatMessage(
                    session_id=request.session_id,
                    role=ChatMessageRole.ASSISTANT,
                    content=response_text
                )
                db.add(assistant_message)
                await db.commit()
                await db.refresh(assistant_message)
                
                return ChatGenerateResponse(
                    message_id=assistant_message.id,
                    response=response_text,
                    session_id=request.session_id
                )
                
            except Exception as e:
                logger.error(f"Error generating response: {e}")
                # Save error message for user
                error_message = ChatMessage(
                    session_id=request.session_id,
                    role=ChatMessageRole.ASSISTANT,
                    content="エラーが発生しました。"
                )
                db.add(error_message)
                await db.commit()
                await db.refresh(error_message)
                
                return ChatGenerateResponse(
                    message_id=error_message.id,
                    response="エラーが発生しました。",
                    session_id=request.session_id
                )
    
    async def _generate_with_model(
        self, 
        model_path: str, 
        job_id: int,
        prompt: str, 
        temperature: float = 0.7,
        max_tokens: int = 512
    ) -> str:
        """Generate response using the fine-tuned model"""
        try:
            logger.info(f"Starting generation for prompt: '{prompt[:50]}...'")
            
            # Load model and tokenizer if not cached
            if job_id not in self.model_cache:
                await self._load_model(model_path, job_id)
            
            model = self.model_cache[job_id]
            tokenizer = self.tokenizer_cache[job_id]
            
            # Use simple format that matches training data better
            formatted_prompt = prompt  # Start with simple approach
            logger.info(f"Formatted prompt: '{formatted_prompt}'")
            
            inputs = tokenizer(formatted_prompt, return_tensors="pt", truncation=True, max_length=512)
            logger.info(f"Input token shape: {inputs['input_ids'].shape}")
            
            # Determine device
            device = "cuda" if torch.cuda.is_available() else "cpu"
            inputs = {k: v.to(device) for k, v in inputs.items()}
            logger.info(f"Using device: {device}")
            
            # Simple generation for better Japanese responses
            actual_temp = max(min(temperature, 0.8), 0.3)  # Moderate temperature for stability
            logger.info(f"Using temperature: {actual_temp}")
            
            with torch.no_grad():
                outputs = model.generate(
                    input_ids=inputs["input_ids"],
                    attention_mask=inputs["attention_mask"],
                    max_new_tokens=min(max_tokens, 30),  # Shorter for more focused responses
                    min_new_tokens=1,  # Allow short responses
                    temperature=actual_temp,
                    do_sample=True,
                    top_p=0.8,  # More focused sampling
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    repetition_penalty=1.0,  # No repetition penalty
                    num_beams=1,
                    early_stopping=True
                )
            
            logger.info(f"Generated token shape: {outputs.shape}")
            logger.info(f"Input length: {len(inputs['input_ids'][0])}, Output length: {len(outputs[0])}")
            
            # Decode full output first for debugging
            full_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
            logger.info(f"Full generated output: '{full_output}'")
            
            # Extract only the new tokens (response part)
            input_length = len(inputs["input_ids"][0])
            if len(outputs[0]) > input_length:
                response_tokens = outputs[0][input_length:]
                response = tokenizer.decode(response_tokens, skip_special_tokens=True)
            else:
                logger.warning("No new tokens generated!")
                response = ""
            
            logger.info(f"Extracted response: '{response}'")
            
            # Clean up and validate the response
            response = response.strip()
            
            # Remove common prefixes that might appear
            prefixes_to_remove = ["Bot:", "Assistant:", "AI:", "Response:", "Reply:"]
            for prefix in prefixes_to_remove:
                if response.startswith(prefix):
                    response = response[len(prefix):].strip()
                    break
            
            # Filter out responses that are clearly nonsensical
            if response and (
                response.replace(" ", "").replace(".", "").replace(",", "").isdigit() or  # Just numbers
                len(response.strip()) < 1 or  # Empty
                (len(response.strip()) == 1 and response.strip() in "!?.,;:")  # Single punctuation only
            ):
                logger.warning(f"Filtering out low-quality response: '{response}'")
                response = ""
            
            # If still empty, provide more detailed logging and try alternative approach
            if not response:
                logger.warning("Response is empty after processing")
                logger.info(f"Raw output tokens: {outputs[0].tolist()}")
                logger.info(f"Input tokens: {inputs['input_ids'][0].tolist()}")
                
                # Try decoding with different approach
                if len(outputs[0]) > input_length:
                    alt_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
                    logger.info(f"Alternative full decode: '{alt_response}'")
                    
                    # Extract everything after the Bot: marker
                    if "Bot:" in alt_response:
                        response = alt_response.split("Bot:")[-1].strip()
                        logger.info(f"Extracted after Bot marker: '{response}'")
                
                # Final fallback if still empty or inappropriate
                if not response or "User:" in response or "I have no idea" in response:
                    logger.warning("Using Japanese fallback response")
                    # Simple Japanese responses based on common patterns
                    simple_responses = {
                        "おはよう": "おはようございます！",
                        "こんにちは": "こんにちは！",
                        "こんばんは": "こんばんは！",
                        "ありがとう": "どういたしまして。",
                        "元気": "はい、元気です！",
                        "天気": "今日はいい天気ですね。",
                        "さようなら": "さようなら、また会いましょう。"
                    }
                    
                    # Find matching response
                    for key, fallback_response in simple_responses.items():
                        if key in prompt:
                            response = fallback_response
                            logger.info(f"Using fallback response for '{key}': '{response}'")
                            break
                    
                    if not response:
                        response = "そうですね。他に何かお話ししませんか？"
            
            logger.info(f"Final response: '{response}'")
            return response
            
        except Exception as e:
            logger.error(f"Error in model generation: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return "エラーが発生しました。"
    
    async def _load_model(self, model_path: str, job_id: int):
        """Load the fine-tuned model and tokenizer"""
        try:
            logger.info(f"Loading model from {model_path}")
            
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            # Determine device and dtype
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if device == "cuda" else torch.float32
            
            # Load base model first (this should be the PEFT model)
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                torch_dtype=dtype,
                device_map="auto" if device == "cuda" else None,
                trust_remote_code=True
            )
            
            if device == "cpu":
                model = model.to(device)
            
            # Cache the model and tokenizer
            self.model_cache[job_id] = model
            self.tokenizer_cache[job_id] = tokenizer
            
            logger.info(f"Model loaded successfully for job {job_id}")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    async def _generate_with_ollama(
        self,
        model_name: str,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 512
    ) -> str:
        """Generate response using Ollama model"""
        try:
            logger.info(f"Generating with Ollama model: {model_name} for prompt: '{prompt[:50]}...'")
            
            from services.ollama_service import OllamaService
            
            async with OllamaService() as ollama:
                response = await ollama.generate(
                    model_name=model_name,
                    prompt=prompt,
                    options={
                        "temperature": temperature,
                        "num_predict": max_tokens,
                        "stop": ["User:", "Human:", "\n\nUser:", "\n\nHuman:"]
                    }
                )
                
                generated_text = response.get("response", "").strip()
                logger.info(f"Ollama response: '{generated_text}'")
                
                if not generated_text:
                    return "申し訳ございませんが、応答を生成できませんでした。"
                
                return generated_text
                
        except Exception as e:
            logger.error(f"Error generating with Ollama: {e}")
            return "Ollamaでの生成中にエラーが発生しました。"
    
    async def delete_session(self, session_id: int):
        """Delete a chat session and its messages"""
        async with AsyncSessionLocal() as db:
            try:
                # Check if session exists
                result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
                session = result.scalar_one_or_none()
                
                if not session:
                    raise ValueError(f"Chat session {session_id} not found")
                
                # Use raw SQL to delete messages first
                await db.execute(text("DELETE FROM chat_messages WHERE session_id = :session_id"), 
                                {"session_id": session_id})
                
                # Then delete the session using raw SQL
                await db.execute(text("DELETE FROM chat_sessions WHERE id = :session_id"), 
                                {"session_id": session_id})
                
                # Commit all changes
                await db.commit()
                logger.info(f"Successfully deleted chat session {session_id} using raw SQL")
                
            except ValueError:
                await db.rollback()
                raise
            except Exception as e:
                await db.rollback()
                logger.error(f"Error deleting session {session_id}: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                raise