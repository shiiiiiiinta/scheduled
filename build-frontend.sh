#!/bin/bash

# フロントエンドのみをビルド（Cloudflare Pages用）
# Workerは別途デプロイしてください

echo "🏗️  フロントエンドをビルドしています..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ ビルド成功！"
    echo ""
    echo "📦 distディレクトリにファイルが生成されました"
    echo ""
    echo "次のステップ:"
    echo "1. GitHubにプッシュ: git push"
    echo "2. Cloudflare Pagesが自動的にデプロイします"
    echo ""
    echo "⚠️  Workers APIは別途デプロイしてください:"
    echo "   ./deploy-worker.sh"
else
    echo "❌ ビルド失敗"
    exit 1
fi
