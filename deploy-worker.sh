#!/bin/bash

# Cloudflare Workersデプロイスクリプト

echo "🚀 Cloudflare Workerをデプロイします..."
echo ""

# workersディレクトリに移動
cd workers

# デプロイ
echo "📦 Workerをデプロイ中..."
npx wrangler deploy

echo ""
echo "✅ デプロイが完了しました！"
echo ""
echo "次のステップ:"
echo "1. 表示されたWorkerのURLをコピーしてください"
echo "2. Cloudflare Pagesの環境変数に設定してください:"
echo "   VITE_API_BASE_URL=<WorkerのURL>"
echo ""
