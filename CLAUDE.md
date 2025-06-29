# LLM LoRA ファインチューニングプラットフォーム - 技術仕様

## プロジェクト概要

**目的**: LoRA（Low-Rank Adaptation）を使用したファインチューニングの学習・体験プラットフォーム  
**現状**: 教育目的の完全実装済み、段階的チュートリアル付き  
**最終テスト**: 2024年6月29日 MacBook Air M4環境で動作確認済み  

## 技術スタック

### フロントエンド
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Shadcn/ui, Radix UI
- **Charts**: Recharts
- **Form Handling**: React Hook Form + Zod

### バックエンド
- **Framework**: FastAPI (Python)
- **ML Libraries**: 
  - Hugging Face Transformers
  - PEFT (Parameter-Efficient Fine-Tuning)
  - PyTorch
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **API Documentation**: OpenAPI/Swagger

### インフラ
- **Containerization**: Docker Compose
- **Local LLM**: Ollama
- **Data Storage**: PostgreSQL
- **File Storage**: ローカルファイルシステム

## 実装状況

### ✅ 完了済み機能

1. **Webインターフェース**
   - データセット管理 (`components/datasets/`)
   - 訓練ジョブ管理 (`components/training/`)
   - リアルタイム監視 (`components/ui/charts/`)
   - レスポンシブデザイン

2. **バックエンドAPI**
   - データセット CRUD (`backend/api/datasets.py`)
   - 訓練ジョブ管理 (`backend/api/training.py`)
   - モデル管理 (`backend/api/models.py`)
   - WebSocket進捗通知

3. **LoRAファインチューニング**
   - PEFT統合 (`backend/services/training_service.py`)
   - カスタムパラメータ設定
   - メモリ効率最適化
   - CPU/GPU自動対応

4. **チュートリアルシステム**
   - 段階的学習コース（3レベル）
   - 検証スクリプト (`tutorial/scripts/`)
   - ドキュメント (`tutorial/docs/`)

### ⚠️ 制約事項

1. **Ollamaとの統合制約**
   - UI上: `llama2:7b` → 実際: `microsoft/DialoGPT-medium`
   - 理由: Hugging Face PEFT形式とOllamaの技術的制約
   - 出力: PEFT形式アダプター（Ollamaで直接使用不可）

2. **モデル制限**
   - 現在: DialoGPT-mediumのみ対応
   - 予定: meta-llama/Llama-2-7b-hf等への対応

## コード構造

```
llmlora/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # ダッシュボードルート
│   ├── api/               # APIルート（プロキシ）
│   └── globals.css        # グローバルスタイル
├── components/            # Reactコンポーネント
│   ├── datasets/         # データセット管理UI
│   ├── training/         # 訓練管理UI
│   └── ui/               # 再利用可能UI
├── backend/              # FastAPIサーバー
│   ├── api/              # APIエンドポイント
│   ├── models/           # データモデル
│   ├── services/         # ビジネスロジック
│   └── database/         # DB設定
├── lib/                  # ユーティリティ
├── stores/               # Zustand状態管理
├── types/                # TypeScript型定義
└── tutorial/             # チュートリアル関連
    ├── docs/             # マークダウンドキュメント
    ├── scripts/          # 検証・テストスクリプト
    └── datasets/         # サンプルデータ
```

## 重要なファイル

### フロントエンド主要ファイル
- `app/(dashboard)/page.tsx` - メインダッシュボード
- `components/training/training-jobs.tsx` - 訓練ジョブUI
- `components/datasets/dataset-upload.tsx` - データアップロード
- `stores/training-store.ts` - 訓練状態管理

### バックエンド主要ファイル
- `backend/main.py` - FastAPIアプリケーション
- `backend/services/training_service.py` - LoRA訓練ロジック
- `backend/api/training.py` - 訓練APIエンドポイント
- `backend/models/database.py` - データベースモデル

### 設定ファイル
- `docker-compose.yml` - サービス設定
- `.env.example` - 環境変数テンプレート
- `backend/requirements.txt` - Python依存関係
- `package.json` - Node.js依存関係

## データフロー

### 訓練ジョブの流れ
1. **UI**: ユーザーがパラメータ設定
2. **API**: `/api/training/jobs` POST
3. **Backend**: 訓練ジョブをデータベースに保存
4. **Service**: PEFTでLoRAファインチューニング実行
5. **Storage**: `/app/training_data/job_X/` にモデル保存
6. **WebSocket**: リアルタイム進捗更新
7. **UI**: 完了通知と結果表示

### データセット処理
1. **Upload**: CSV/JSONファイルアップロード
2. **Validation**: 形式チェック（instruction-output）
3. **Storage**: PostgreSQLに保存
4. **Processing**: 訓練用形式に変換

## パフォーマンス最適化

### CPU最適化（Apple Silicon）
- **精度**: float32（CPU）/ float16（GPU）自動選択
- **メモリ**: LoRA使用により大幅削減
- **並列化**: PyTorchの自動最適化

### 実測パフォーマンス（MacBook Air M4）
- **データセット**: 5例のQ&A
- **設定**: rank=4, alpha=8, 1エポック  
- **実行時間**: 40秒
- **出力サイズ**: 4.3MB（アダプターのみ）
- **メモリ使用量**: ~2GB

## テスト・検証

### 自動検証スクリプト
- `tutorial/scripts/run_all_verifications.sh` - 全体検証
- `tutorial/scripts/validate_datasets.py` - データセット検証
- `tutorial/scripts/test_tutorial_flow.py` - チュートリアル流れテスト

### 手動テスト項目
- [ ] Docker環境起動確認
- [ ] データセットアップロード
- [ ] 基本訓練ジョブ実行
- [ ] 進捗監視機能
- [ ] モデル出力確認

## 開発ワークフロー

### ローカル開発
```bash
# バックエンド
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# フロントエンド
npm install && npm run dev

# Ollama
ollama pull llama2:7b
```

### Docker環境
```bash
docker-compose up -d
```

## API仕様

### 主要エンドポイント
- `GET /api/datasets` - データセット一覧
- `POST /api/datasets/upload` - ファイルアップロード
- `POST /api/training/jobs` - 訓練ジョブ作成
- `GET /api/training/jobs/{id}/progress` - 進捗取得
- `GET /api/models` - Ollamaモデル一覧

### WebSocket
- `/ws/training/{job_id}` - リアルタイム訓練進捗

## 今後の改善計画

### 短期（1-2週間）
- [ ] 真のLlama-2-7b-hf対応
- [ ] GGUF形式変換機能
- [ ] モデルマッピング修正

### 中期（1-2ヶ月）
- [ ] 複数ベースモデル対応
- [ ] 推論テスト機能
- [ ] バッチ処理最適化

### 長期（3-6ヶ月）
- [ ] Ollama直接統合
- [ ] マルチモーダル対応
- [ ] 分散学習サポート

## トラブルシューティング

### よくある問題

1. **メモリ不足**
   ```bash
   # バッチサイズ削減
   "batch_size": 1
   "gradient_accumulation_steps": 4
   ```

2. **GPU認識しない**
   ```bash
   # Docker GPU設定確認
   docker run --gpus all nvidia/cuda:11.0-base nvidia-smi
   ```

3. **モデルダウンロード失敗**
   ```bash
   # Hugging Face認証設定
   huggingface-cli login
   ```

## Claude利用ガイド

### 有効なコマンド例
- `npm run dev` - 開発サーバー起動
- `docker-compose up -d` - サービス起動
- `pytest backend/tests/` - テスト実行
- `npm run build` - プロダクションビルド

### 重要な設定ファイル
- 環境変数: `.env`
- Docker設定: `docker-compose.yml`
- Python要件: `backend/requirements.txt`
- TypeScript設定: `tsconfig.json`

## リソース

### ドキュメント
- [LoRA論文](https://arxiv.org/abs/2106.09685)
- [PEFT Documentation](https://huggingface.co/docs/peft)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)

### サンプルデータ
- `tutorial/datasets/basic_qa.json` - 基本Q&A（5例）
- `tutorial/datasets/tech_qa.json` - 技術Q&A（20例）
- `tutorial/datasets/medical_qa.json` - 医療Q&A（20例）

## ライセンス

MIT License - 商用利用可能