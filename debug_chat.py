#!/usr/bin/env python3
"""
チャットモデルのデバッグスクリプト
トレーニング済みモデルの動作を直接テストします
"""

import sys
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from pathlib import Path

def test_model(model_path, test_prompts):
    """モデルを直接テストする関数"""
    print(f"Loading model from: {model_path}")
    
    try:
        # Load tokenizer and model
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float32,
            device_map="cpu"
        )
        
        print("Model loaded successfully!")
        print(f"Model class: {model.__class__.__name__}")
        print(f"Tokenizer class: {tokenizer.__class__.__name__}")
        print(f"Vocab size: {tokenizer.vocab_size}")
        print("-" * 50)
        
        for i, prompt in enumerate(test_prompts, 1):
            print(f"\nTest {i}: '{prompt}'")
            
            # Test different prompt formats
            formats = [
                prompt,  # Raw
                f"User: {prompt} Bot:",  # Current format
                f"{prompt}<|endoftext|>",  # Training format
                f"Human: {prompt}\nAssistant:",  # Alternative format
            ]
            
            for j, formatted_prompt in enumerate(formats):
                print(f"\n  Format {j+1}: '{formatted_prompt}'")
                
                # Tokenize
                inputs = tokenizer(formatted_prompt, return_tensors="pt")
                print(f"  Tokens: {inputs['input_ids'].shape[1]} tokens")
                print(f"  Token IDs: {inputs['input_ids'][0].tolist()}")
                
                # Generate
                with torch.no_grad():
                    outputs = model.generate(
                        inputs['input_ids'],
                        max_new_tokens=20,
                        min_new_tokens=1,
                        temperature=0.7,
                        do_sample=True,
                        pad_token_id=tokenizer.eos_token_id,
                        eos_token_id=tokenizer.eos_token_id,
                    )
                
                # Decode full output
                full_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
                
                # Extract new tokens only
                input_length = inputs['input_ids'].shape[1]
                if outputs.shape[1] > input_length:
                    new_tokens = outputs[0][input_length:]
                    response = tokenizer.decode(new_tokens, skip_special_tokens=True)
                else:
                    response = ""
                
                print(f"  Full output: '{full_output}'")
                print(f"  Response only: '{response}'")
                print(f"  Response length: {len(response)} chars")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    model_path = "/app/training_data/job_16/final_model"
    
    test_prompts = [
        "おはよう",
        "こんにちは", 
        "元気ですか？",
        "今日はいい天気ですね",
        "ありがとう",
    ]
    
    test_model(model_path, test_prompts)