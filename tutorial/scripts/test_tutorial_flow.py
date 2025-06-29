#!/usr/bin/env python3
"""
LoRAファインチューニングプラットフォーム - チュートリアルフロー検証スクリプト
APIを通じてチュートリアルの基本的なフローをテストします
"""

import requests
import json
import time
import sys
from pathlib import Path
from typing import Dict, Any, Optional

class TutorialTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def print_colored(self, message: str, color: str = "white"):
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

    def success(self, message: str):
        self.print_colored(f"✅ {message}", "green")

    def warning(self, message: str):
        self.print_colored(f"⚠️  {message}", "yellow")

    def error(self, message: str):
        self.print_colored(f"❌ {message}", "red")

    def info(self, message: str):
        self.print_colored(f"ℹ️  {message}", "blue")

    def test_api_connection(self) -> bool:
        """API接続をテスト"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                self.success("Backend API接続成功")
                return True
            else:
                self.error(f"Backend API接続失敗: ステータス {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.error(f"Backend API接続エラー: {e}")
            return False

    def test_ollama_connection(self) -> bool:
        """Ollama接続をテスト"""
        try:
            response = self.session.get(f"{self.base_url}/models", timeout=10)
            if response.status_code == 200:
                models = response.json()
                self.success(f"Ollama接続成功 ({len(models)} モデル利用可能)")
                
                # llama2:7bモデルの確認
                model_names = [model.get('name', '') for model in models]
                if any('llama2:7b' in name for name in model_names):
                    self.success("llama2:7b モデルが利用可能")
                    return True
                else:
                    self.warning("llama2:7b モデルが見つかりません")
                    self.info("利用可能モデル: " + ", ".join(model_names))
                    return False
            else:
                self.error(f"Ollama接続失敗: ステータス {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.error(f"Ollama接続エラー: {e}")
            return False

    def upload_test_dataset(self, filepath: Path, name: str, description: str) -> Optional[int]:
        """テスト用データセットをアップロード"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                dataset_content = f.read()
            
            files = {
                'file': (filepath.name, dataset_content, 'application/json')
            }
            data = {
                'name': name,
                'description': description,
                'dataset_type': 'instruction'
            }
            
            response = self.session.post(
                f"{self.base_url}/datasets/upload",
                files=files,
                data=data,
                timeout=30
            )
            
            if response.status_code == 200:
                dataset_info = response.json()
                dataset_id = dataset_info.get('id')
                self.success(f"データセットアップロード成功: {name} (ID: {dataset_id})")
                return dataset_id
            else:
                self.error(f"データセットアップロード失敗: {response.status_code}")
                self.error(f"レスポンス: {response.text}")
                return None
                
        except Exception as e:
            self.error(f"データセットアップロードエラー: {e}")
            return None

    def create_test_training_job(self, dataset_id: int, job_name: str) -> Optional[int]:
        """テスト用訓練ジョブを作成"""
        try:
            job_data = {
                "name": job_name,
                "model_name": "llama2:7b",
                "dataset_id": dataset_id,
                "lora_config": {
                    "r": 4,
                    "alpha": 8,
                    "dropout": 0.1,
                    "target_modules": ["q_proj", "v_proj"]
                },
                "training_config": {
                    "learning_rate": 0.00005,
                    "epochs": 1,
                    "batch_size": 2,
                    "max_length": 512
                }
            }
            
            response = self.session.post(
                f"{self.base_url}/training/jobs",
                json=job_data,
                timeout=30
            )
            
            if response.status_code == 200:
                job_info = response.json()
                job_id = job_info.get('id')
                self.success(f"訓練ジョブ作成成功: {job_name} (ID: {job_id})")
                return job_id
            else:
                self.error(f"訓練ジョブ作成失敗: {response.status_code}")
                self.error(f"レスポンス: {response.text}")
                return None
                
        except Exception as e:
            self.error(f"訓練ジョブ作成エラー: {e}")
            return None

    def monitor_training_job(self, job_id: int, max_wait_time: int = 300) -> bool:
        """訓練ジョブの進捗を監視"""
        self.info(f"訓練ジョブ {job_id} を監視中 (最大 {max_wait_time} 秒)")
        
        start_time = time.time()
        last_status = None
        last_progress = None
        
        while time.time() - start_time < max_wait_time:
            try:
                response = self.session.get(f"{self.base_url}/training/jobs/{job_id}", timeout=10)
                if response.status_code == 200:
                    job_info = response.json()
                    status = job_info.get('status', 'unknown')
                    progress = job_info.get('progress', 0)
                    
                    # ステータスまたは進捗が変わった場合のみ表示
                    if status != last_status or abs(progress - (last_progress or 0)) > 5:
                        self.info(f"ステータス: {status}, 進捗: {progress:.1f}%")
                        last_status = status
                        last_progress = progress
                    
                    if status == 'completed':
                        self.success(f"訓練ジョブ {job_id} が完了しました")
                        return True
                    elif status == 'failed':
                        error_msg = job_info.get('error_message', '不明なエラー')
                        self.error(f"訓練ジョブ {job_id} が失敗: {error_msg}")
                        return False
                    elif status in ['pending', 'running']:
                        time.sleep(5)  # 5秒待機
                    else:
                        self.warning(f"不明なステータス: {status}")
                        time.sleep(5)
                else:
                    self.error(f"ジョブ情報取得失敗: {response.status_code}")
                    return False
                    
            except requests.exceptions.RequestException as e:
                self.error(f"ジョブ監視エラー: {e}")
                return False
        
        self.warning(f"訓練ジョブ {job_id} がタイムアウトしました")
        return False

    def cleanup_test_data(self, dataset_id: Optional[int], job_id: Optional[int]):
        """テストデータをクリーンアップ"""
        self.info("テストデータをクリーンアップ中...")
        
        if job_id:
            try:
                response = self.session.delete(f"{self.base_url}/training/jobs/{job_id}")
                if response.status_code == 200:
                    self.success(f"訓練ジョブ {job_id} を削除しました")
                else:
                    self.warning(f"訓練ジョブ削除失敗: {response.status_code}")
            except Exception as e:
                self.warning(f"訓練ジョブ削除エラー: {e}")
        
        if dataset_id:
            try:
                response = self.session.delete(f"{self.base_url}/datasets/{dataset_id}")
                if response.status_code == 200:
                    self.success(f"データセット {dataset_id} を削除しました")
                else:
                    self.warning(f"データセット削除失敗: {response.status_code}")
            except Exception as e:
                self.warning(f"データセット削除エラー: {e}")

    def run_full_test(self) -> bool:
        """完全なチュートリアルフローテストを実行"""
        self.print_colored("🧪 チュートリアルフローテスト開始", "blue")
        print("=" * 50)
        
        # 1. API接続テスト
        self.print_colored("\n1️⃣ API接続テスト", "blue")
        if not self.test_api_connection():
            return False
        
        # 2. Ollama接続テスト
        self.print_colored("\n2️⃣ Ollama接続テスト", "blue")
        if not self.test_ollama_connection():
            return False
        
        # 3. データセットアップロードテスト
        self.print_colored("\n3️⃣ データセットアップロードテスト", "blue")
        
        # テスト用データセットファイルを探す
        current_dir = Path.cwd()
        test_dataset_path = None
        
        for path in [
            current_dir / "tutorial" / "datasets" / "level1_basic_qa.json",
            current_dir.parent / "tutorial" / "datasets" / "level1_basic_qa.json",
            current_dir / "level1_basic_qa.json"
        ]:
            if path.exists():
                test_dataset_path = path
                break
        
        if not test_dataset_path:
            self.error("テスト用データセットファイルが見つかりません")
            return False
        
        dataset_id = self.upload_test_dataset(
            test_dataset_path,
            "テスト用データセット",
            "チュートリアルフローテスト用の基本Q&Aデータ"
        )
        
        if not dataset_id:
            return False
        
        # 4. 訓練ジョブ作成テスト
        self.print_colored("\n4️⃣ 訓練ジョブ作成テスト", "blue")
        job_id = self.create_test_training_job(dataset_id, "テスト用訓練ジョブ")
        
        if not job_id:
            self.cleanup_test_data(dataset_id, None)
            return False
        
        # 5. 訓練ジョブ監視テスト
        self.print_colored("\n5️⃣ 訓練ジョブ監視テスト", "blue")
        training_success = self.monitor_training_job(job_id, max_wait_time=600)  # 10分まで待機
        
        # 6. クリーンアップ
        self.print_colored("\n6️⃣ クリーンアップ", "blue")
        self.cleanup_test_data(dataset_id, job_id)
        
        # 結果
        self.print_colored("\n📊 テスト結果", "blue")
        print("=" * 30)
        
        if training_success:
            self.success("すべてのテストがパスしました！")
            self.info("チュートリアルの基本的なフローが正常に動作しています。")
            return True
        else:
            self.error("一部のテストが失敗しました。")
            self.info("システムの設定やリソース状況を確認してください。")
            return False

def main():
    """メイン関数"""
    tester = TutorialTester()
    
    try:
        success = tester.run_full_test()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        tester.print_colored("\n⚠️ テストが中断されました", "yellow")
        sys.exit(1)
    except Exception as e:
        tester.error(f"予期しないエラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()