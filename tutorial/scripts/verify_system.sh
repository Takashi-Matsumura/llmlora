#!/bin/bash

# LoRAファインチューニングプラットフォーム - システム検証スクリプト
# このスクリプトはチュートリアル実行前のシステム状態を確認します

echo "🔍 LoRAファインチューニングプラットフォーム - システム検証開始"
echo "============================================================"

# 色付きの出力関数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# エラーカウンタ
ERROR_COUNT=0
WARNING_COUNT=0

# 1. Dockerの確認
echo ""
echo "📦 Docker環境の確認"
echo "--------------------"

if command -v docker &> /dev/null; then
    success "Docker コマンドが利用可能"
    DOCKER_VERSION=$(docker --version)
    info "バージョン: $DOCKER_VERSION"
else
    error "Docker がインストールされていません"
    ((ERROR_COUNT++))
fi

if command -v docker-compose &> /dev/null; then
    success "Docker Compose コマンドが利用可能"
    COMPOSE_VERSION=$(docker-compose --version)
    info "バージョン: $COMPOSE_VERSION"
else
    error "Docker Compose がインストールされていません"
    ((ERROR_COUNT++))
fi

# 2. Dockerサービスの状態確認
echo ""
echo "🐳 Docker サービスの状態"
echo "------------------------"

if docker info &> /dev/null; then
    success "Docker デーモンが実行中"
else
    error "Docker デーモンが実行されていません"
    info "docker-compose up -d でサービスを開始してください"
    ((ERROR_COUNT++))
fi

# 3. コンテナの状態確認
echo ""
echo "📋 コンテナの状態確認"
echo "--------------------"

CONTAINERS=("llmlora-frontend" "llmlora-backend" "llmlora-ollama" "llmlora-postgres")

for container in "${CONTAINERS[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$container"; then
        STATUS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$container" | awk '{print $2}')
        success "$container: $STATUS"
    else
        error "$container: 停止中または存在しません"
        ((ERROR_COUNT++))
    fi
done

# 4. ポートの確認
echo ""
echo "🌐 ポートの確認"
echo "--------------"

PORTS=(3000 8000 11434 5432)
PORT_NAMES=("Frontend" "Backend API" "Ollama" "PostgreSQL")

for i in "${!PORTS[@]}"; do
    port=${PORTS[$i]}
    name=${PORT_NAMES[$i]}
    
    if nc -z localhost $port 2>/dev/null; then
        success "$name (ポート $port): 利用可能"
    else
        error "$name (ポート $port): アクセス不可"
        ((ERROR_COUNT++))
    fi
done

# 5. APIエンドポイントの確認
echo ""
echo "🔌 API エンドポイントの確認"
echo "---------------------------"

# Backend API
if curl -s http://localhost:8000/health &> /dev/null; then
    success "Backend API: 応答あり"
else
    error "Backend API: 応答なし"
    ((ERROR_COUNT++))
fi

# Frontend
if curl -s http://localhost:3000 &> /dev/null; then
    success "Frontend: 応答あり"
else
    error "Frontend: 応答なし"
    ((ERROR_COUNT++))
fi

# Ollama API
if curl -s http://localhost:11434/api/tags &> /dev/null; then
    success "Ollama API: 応答あり"
else
    error "Ollama API: 応答なし"
    ((ERROR_COUNT++))
fi

# 6. Ollamaモデルの確認
echo ""
echo "🤖 Ollama モデルの確認"
echo "---------------------"

if docker exec llmlora-ollama ollama list 2>/dev/null | grep -q "llama2:7b"; then
    success "llama2:7b モデル: インストール済み"
else
    warning "llama2:7b モデル: 未インストール"
    info "docker exec llmlora-ollama ollama pull llama2:7b でダウンロードしてください"
    ((WARNING_COUNT++))
fi

# 7. ディスク容量の確認
echo ""
echo "💾 ディスク容量の確認"
echo "--------------------"

AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
AVAILABLE_BYTES=$(df . | awk 'NR==2 {print $4}')

info "利用可能容量: $AVAILABLE_SPACE"

# 5GB以上の容量があるかチェック (5GB = 5,242,880 KB)
if [ "$AVAILABLE_BYTES" -gt 5242880 ]; then
    success "十分なディスク容量があります"
else
    warning "ディスク容量が不足している可能性があります"
    info "モデルダウンロードとデータ保存のため、少なくとも5GB以上の空き容量を推奨"
    ((WARNING_COUNT++))
fi

# 8. メモリの確認
echo ""
echo "🧠 メモリの確認"
echo "--------------"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    TOTAL_MEM=$(sysctl -n hw.memsize)
    TOTAL_GB=$((TOTAL_MEM / 1024 / 1024 / 1024))
    info "総メモリ: ${TOTAL_GB}GB"
    
    if [ "$TOTAL_GB" -ge 8 ]; then
        success "十分なメモリ容量があります"
    else
        warning "メモリ容量が少ない可能性があります (推奨: 8GB以上)"
        ((WARNING_COUNT++))
    fi
else
    # Linux
    TOTAL_MEM=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_GB=$((TOTAL_MEM / 1024 / 1024))
    AVAILABLE_MEM=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    AVAILABLE_GB=$((AVAILABLE_MEM / 1024 / 1024))
    
    info "総メモリ: ${TOTAL_GB}GB"
    info "利用可能メモリ: ${AVAILABLE_GB}GB"
    
    if [ "$TOTAL_GB" -ge 8 ]; then
        success "十分なメモリ容量があります"
    else
        warning "メモリ容量が少ない可能性があります (推奨: 8GB以上)"
        ((WARNING_COUNT++))
    fi
fi

# 9. チュートリアルファイルの確認
echo ""
echo "📖 チュートリアルファイルの確認"
echo "------------------------------"

TUTORIAL_FILES=(
    "tutorial/datasets/level1_basic_qa.json"
    "tutorial/datasets/level2_practical_knowledge.json"
    "tutorial/datasets/level3_advanced_medical.json"
    "tutorial/docs/level1_basic_tutorial.md"
    "tutorial/docs/level2_practical_tutorial.md"
    "tutorial/docs/level3_advanced_tutorial.md"
)

for file in "${TUTORIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        success "$file: 存在"
    else
        error "$file: 見つかりません"
        ((ERROR_COUNT++))
    fi
done

# 10. 最終結果
echo ""
echo "📊 検証結果"
echo "============"

if [ $ERROR_COUNT -eq 0 ]; then
    if [ $WARNING_COUNT -eq 0 ]; then
        success "すべての検証にパスしました！チュートリアルを開始できます。"
        echo ""
        info "次のステップ:"
        echo "  1. ブラウザで http://localhost:3000 にアクセス"
        echo "  2. チュートリアル文書を参照してLoRAファインチューニングを開始"
        echo "  3. tutorial/docs/ ディレクトリの各レベルのチュートリアルを順番に実行"
        echo ""
        exit 0
    else
        warning "$WARNING_COUNT 個の警告があります。チュートリアルは実行可能ですが、最適でない可能性があります。"
        echo ""
        info "警告を解決することを推奨しますが、基本的なチュートリアルは実行可能です。"
        echo ""
        exit 1
    fi
else
    error "$ERROR_COUNT 個のエラーがあります。チュートリアルを実行する前に解決してください。"
    echo ""
    info "エラーの解決手順:"
    echo "  1. docker-compose up -d でサービスを開始"
    echo "  2. しばらく待ってからもう一度このスクリプトを実行"
    echo "  3. エラーが続く場合は docker-compose logs でログを確認"
    echo ""
    exit 2
fi