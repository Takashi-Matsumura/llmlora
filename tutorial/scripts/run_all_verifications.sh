#!/bin/bash

# LoRAファインチューニングプラットフォーム - 総合検証スクリプト
# すべての検証スクリプトを順次実行します

echo "🚀 LoRAファインチューニングプラットフォーム - 総合検証"
echo "=========================================================="

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

# スクリプトディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo ""
info "スクリプトディレクトリ: $SCRIPT_DIR"
info "プロジェクトルート: $PROJECT_ROOT"

# プロジェクトルートに移動
cd "$PROJECT_ROOT" || exit 1

# 検証結果を追跡
VERIFICATION_RESULTS=()
VERIFICATION_NAMES=()

# 1. システム検証
echo ""
echo "🔧 ステップ1: システム環境検証"
echo "================================"

if [ -f "$SCRIPT_DIR/verify_system.sh" ]; then
    if bash "$SCRIPT_DIR/verify_system.sh"; then
        VERIFICATION_RESULTS+=(0)
        success "システム環境検証: パス"
    else
        exit_code=$?
        VERIFICATION_RESULTS+=($exit_code)
        if [ $exit_code -eq 1 ]; then
            warning "システム環境検証: 警告あり（実行可能）"
        else
            error "システム環境検証: 失敗"
        fi
    fi
    VERIFICATION_NAMES+=("システム環境検証")
else
    error "システム検証スクリプトが見つかりません: $SCRIPT_DIR/verify_system.sh"
    VERIFICATION_RESULTS+=(2)
    VERIFICATION_NAMES+=("システム環境検証")
fi

# 2. データセット検証
echo ""
echo "📋 ステップ2: データセット検証"
echo "=============================="

if [ -f "$SCRIPT_DIR/validate_datasets.py" ]; then
    if command -v python3 &> /dev/null; then
        if python3 "$SCRIPT_DIR/validate_datasets.py"; then
            VERIFICATION_RESULTS+=(0)
            success "データセット検証: パス"
        else
            VERIFICATION_RESULTS+=(1)
            error "データセット検証: 失敗"
        fi
    else
        error "Python3 が見つかりません"
        VERIFICATION_RESULTS+=(2)
    fi
    VERIFICATION_NAMES+=("データセット検証")
else
    error "データセット検証スクリプトが見つかりません: $SCRIPT_DIR/validate_datasets.py"
    VERIFICATION_RESULTS+=(2)
    VERIFICATION_NAMES+=("データセット検証")
fi

# 3. チュートリアルフローテスト（オプション）
echo ""
echo "🧪 ステップ3: チュートリアルフローテスト（オプション）"
echo "================================================="

info "このテストは時間がかかる場合があります（約10-15分）"
read -p "チュートリアルフローテストを実行しますか？ (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$SCRIPT_DIR/test_tutorial_flow.py" ]; then
        if command -v python3 &> /dev/null; then
            # 必要なPythonパッケージの確認
            if python3 -c "import requests" 2>/dev/null; then
                info "チュートリアルフローテストを実行中..."
                if python3 "$SCRIPT_DIR/test_tutorial_flow.py"; then
                    VERIFICATION_RESULTS+=(0)
                    success "チュートリアルフローテスト: パス"
                else
                    VERIFICATION_RESULTS+=(1)
                    error "チュートリアルフローテスト: 失敗"
                fi
            else
                warning "requests パッケージが見つかりません"
                info "pip install requests でインストールしてください"
                VERIFICATION_RESULTS+=(2)
            fi
        else
            error "Python3 が見つかりません"
            VERIFICATION_RESULTS+=(2)
        fi
        VERIFICATION_NAMES+=("チュートリアルフローテスト")
    else
        error "チュートリアルフローテストスクリプトが見つかりません"
        VERIFICATION_RESULTS+=(2)
        VERIFICATION_NAMES+=("チュートリアルフローテスト")
    fi
else
    info "チュートリアルフローテストをスキップしました"
    VERIFICATION_RESULTS+=(0)
    VERIFICATION_NAMES+=("チュートリアルフローテスト（スキップ）")
fi

# 4. 最終結果の表示
echo ""
echo "📊 総合検証結果"
echo "================"

total_tests=${#VERIFICATION_NAMES[@]}
passed_tests=0
warned_tests=0
failed_tests=0

for i in "${!VERIFICATION_NAMES[@]}"; do
    name="${VERIFICATION_NAMES[$i]}"
    result="${VERIFICATION_RESULTS[$i]}"
    
    case $result in
        0)
            success "$name"
            ((passed_tests++))
            ;;
        1)
            warning "$name"
            ((warned_tests++))
            ;;
        2)
            error "$name"
            ((failed_tests++))
            ;;
        *)
            error "$name (不明なエラー)"
            ((failed_tests++))
            ;;
    esac
done

echo ""
echo "統計:"
echo "  ✅ パス: $passed_tests"
echo "  ⚠️  警告: $warned_tests"
echo "  ❌ 失敗: $failed_tests"
echo "  📊 合計: $total_tests"

# 全体の評価
echo ""
if [ $failed_tests -eq 0 ]; then
    if [ $warned_tests -eq 0 ]; then
        success "🎉 すべての検証が完了しました！チュートリアルを開始できます。"
        echo ""
        info "次のステップ:"
        echo "  1. ブラウザで http://localhost:3000 にアクセス"
        echo "  2. レベル1の基本チュートリアルから開始"
        echo "  3. tutorial/docs/ の各チュートリアルドキュメントを参照"
        echo ""
        exit 0
    else
        warning "🟡 すべての検証が完了しました（警告あり）。基本的なチュートリアルは実行可能です。"
        echo ""
        info "警告の内容を確認し、可能であれば解決することを推奨します。"
        echo ""
        exit 1
    fi
else
    error "🔴 一部の検証が失敗しました。チュートリアルの実行前に問題を解決してください。"
    echo ""
    info "トラブルシューティング:"
    echo "  1. docker-compose up -d でサービスを開始"
    echo "  2. しばらく待ってから再度このスクリプトを実行"
    echo "  3. 個別のスクリプトを実行して詳細なエラーを確認"
    echo "  4. docker-compose logs でサービスログを確認"
    echo ""
    exit 2
fi