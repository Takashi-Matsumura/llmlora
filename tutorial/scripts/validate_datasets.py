#!/usr/bin/env python3
"""
LoRAファインチューニングプラットフォーム - データセット検証スクリプト
チュートリアル用データセットの形式と品質を検証します
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any
import statistics

def print_colored(message: str, color: str = "white"):
    """色付きメッセージを出力"""
    colors = {
        "red": "\033[0;31m",
        "green": "\033[0;32m", 
        "yellow": "\033[1;33m",
        "blue": "\033[0;34m",
        "white": "\033[0m"
    }
    reset = "\033[0m"
    print(f"{colors.get(color, colors['white'])}{message}{reset}")

def success(message: str):
    print_colored(f"✅ {message}", "green")

def warning(message: str):
    print_colored(f"⚠️  {message}", "yellow")

def error(message: str):
    print_colored(f"❌ {message}", "red")

def info(message: str):
    print_colored(f"ℹ️  {message}", "blue")

def validate_json_structure(data: List[Dict[str, Any]], filename: str) -> bool:
    """JSONデータの構造を検証"""
    if not isinstance(data, list):
        error(f"{filename}: データはリスト形式である必要があります")
        return False
    
    if len(data) == 0:
        error(f"{filename}: データが空です")
        return False
    
    required_fields = ["instruction", "output"]
    valid_entries = 0
    
    for i, entry in enumerate(data):
        if not isinstance(entry, dict):
            error(f"{filename}: エントリ {i+1} は辞書形式である必要があります")
            continue
            
        missing_fields = [field for field in required_fields if field not in entry]
        if missing_fields:
            error(f"{filename}: エントリ {i+1} に必要なフィールドがありません: {missing_fields}")
            continue
            
        # 空文字列チェック
        empty_fields = [field for field in required_fields if not entry[field].strip()]
        if empty_fields:
            error(f"{filename}: エントリ {i+1} に空のフィールドがあります: {empty_fields}")
            continue
            
        valid_entries += 1
    
    success(f"{filename}: {valid_entries}/{len(data)} 個の有効なエントリ")
    return valid_entries == len(data)

def analyze_dataset_quality(data: List[Dict[str, Any]], filename: str) -> Dict[str, Any]:
    """データセットの品質を分析"""
    if not data:
        return {}
    
    instruction_lengths = [len(entry["instruction"]) for entry in data]
    output_lengths = [len(entry["output"]) for entry in data]
    
    analysis = {
        "entry_count": len(data),
        "avg_instruction_length": statistics.mean(instruction_lengths),
        "avg_output_length": statistics.mean(output_lengths),
        "min_instruction_length": min(instruction_lengths),
        "max_instruction_length": max(instruction_lengths),
        "min_output_length": min(output_lengths),
        "max_output_length": max(output_lengths)
    }
    
    info(f"{filename} 品質分析:")
    info(f"  エントリ数: {analysis['entry_count']}")
    info(f"  平均指示長: {analysis['avg_instruction_length']:.1f} 文字")
    info(f"  平均出力長: {analysis['avg_output_length']:.1f} 文字")
    info(f"  指示長範囲: {analysis['min_instruction_length']}-{analysis['max_instruction_length']} 文字")
    info(f"  出力長範囲: {analysis['min_output_length']}-{analysis['max_output_length']} 文字")
    
    # 品質警告
    if analysis['avg_instruction_length'] < 10:
        warning(f"{filename}: 指示文が短すぎる可能性があります")
    if analysis['avg_output_length'] < 20:
        warning(f"{filename}: 出力文が短すぎる可能性があります")
    if analysis['max_instruction_length'] > 1000:
        warning(f"{filename}: 非常に長い指示文があります（最大長制限に注意）")
    if analysis['max_output_length'] > 2000:
        warning(f"{filename}: 非常に長い出力文があります（最大長制限に注意）")
    
    return analysis

def check_content_diversity(data: List[Dict[str, Any]], filename: str):
    """コンテンツの多様性をチェック"""
    instructions = [entry["instruction"] for entry in data]
    outputs = [entry["output"] for entry in data]
    
    # 重複チェック
    unique_instructions = set(instructions)
    unique_outputs = set(outputs)
    
    if len(unique_instructions) < len(instructions):
        warning(f"{filename}: 重複する指示文があります ({len(instructions) - len(unique_instructions)} 個)")
    else:
        success(f"{filename}: すべての指示文が一意です")
    
    if len(unique_outputs) < len(outputs):
        warning(f"{filename}: 重複する出力文があります ({len(outputs) - len(unique_outputs)} 個)")
    else:
        success(f"{filename}: すべての出力文が一意です")
    
    # 語彙の多様性（簡易チェック）
    all_words = set()
    for instruction in instructions:
        all_words.update(instruction.split())
    for output in outputs:
        all_words.update(output.split())
    
    total_words = sum(len(inst.split()) + len(out.split()) for inst, out in zip(instructions, outputs))
    diversity_ratio = len(all_words) / total_words if total_words > 0 else 0
    
    info(f"{filename}: 語彙多様性: {diversity_ratio:.3f} (高いほど良い)")
    if diversity_ratio < 0.3:
        warning(f"{filename}: 語彙の多様性が低い可能性があります")

def validate_dataset_file(filepath: Path) -> bool:
    """単一のデータセットファイルを検証"""
    print_colored(f"\n📋 {filepath.name} の検証", "blue")
    print("-" * 50)
    
    if not filepath.exists():
        error(f"ファイルが見つかりません: {filepath}")
        return False
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        error(f"JSONパースエラー: {e}")
        return False
    except Exception as e:
        error(f"ファイル読み込みエラー: {e}")
        return False
    
    # 構造検証
    structure_valid = validate_json_structure(data, filepath.name)
    
    if structure_valid:
        # 品質分析
        analyze_dataset_quality(data, filepath.name)
        
        # 多様性チェック
        check_content_diversity(data, filepath.name)
    
    return structure_valid

def main():
    """メイン関数"""
    print_colored("🔍 LoRAチュートリアル データセット検証", "blue")
    print("=" * 60)
    
    # チュートリアルディレクトリを探す
    current_dir = Path.cwd()
    tutorial_dir = None
    
    # カレントディレクトリからチュートリアルディレクトリを探す
    for path in [current_dir / "tutorial", current_dir.parent / "tutorial", current_dir]:
        if (path / "datasets").exists():
            tutorial_dir = path
            break
    
    if not tutorial_dir:
        error("チュートリアルディレクトリが見つかりません")
        error("このスクリプトはプロジェクトルートまたはtutorialディレクトリで実行してください")
        sys.exit(1)
    
    datasets_dir = tutorial_dir / "datasets"
    info(f"データセットディレクトリ: {datasets_dir}")
    
    # 検証するファイルリスト
    dataset_files = [
        "level1_basic_qa.json",
        "level2_practical_knowledge.json", 
        "level3_advanced_medical.json"
    ]
    
    valid_count = 0
    total_count = len(dataset_files)
    
    # 各データセットファイルを検証
    for filename in dataset_files:
        filepath = datasets_dir / filename
        if validate_dataset_file(filepath):
            valid_count += 1
    
    # 最終結果
    print_colored(f"\n📊 検証結果", "blue")
    print("=" * 30)
    
    if valid_count == total_count:
        success(f"すべてのデータセット ({valid_count}/{total_count}) が検証をパスしました！")
        info("\nデータセットはチュートリアルで使用する準備ができています。")
        sys.exit(0)
    else:
        error(f"一部のデータセットに問題があります ({valid_count}/{total_count} が有効)")
        info("\n問題のあるデータセットを修正してから再度実行してください。")
        sys.exit(1)

if __name__ == "__main__":
    main()