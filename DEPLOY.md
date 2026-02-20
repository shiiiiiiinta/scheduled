# Cloudflare Pages デプロイガイド

このガイドでは、フロントエンドをCloudflare Pagesに、APIをCloudflare Workersにデプロイする手順を説明します。

## デプロイ構成

```
┌─────────────────────────────────────────┐
│  Cloudflare Pages (フロントエンド)       │
│  - React + TypeScript                   │
│  - 静的ファイル配信                      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Cloudflare Workers (API)               │
│  - boatrace.jp プロキシ                 │
│  - CORS対応                             │
└─────────────────────────────────────────┘
```

## 1. フロントエンドのデプロイ（Cloudflare Pages）

### 方法A: Cloudflare ダッシュボードから（推奨）

1. **Cloudflareダッシュボードにログイン**
   - https://dash.cloudflare.com/ にアクセス

2. **Pages → Create a project**
   - 「Connect to Git」を選択
   - GitHubまたはGitLabと連携

3. **リポジトリを選択**
   - このプロジェクトのリポジトリを選択

4. **ビルド設定**
   ```
   Framework preset: Vite
   Build command: npm run build
   Build output directory: dist
   ```

5. **環境変数を設定**
   ```
   VITE_API_BASE_URL = https://boatrace-api-worker.your-subdomain.workers.dev
   ```
   ※WorkerのURLは次のステップでデプロイ後に取得

6. **「Save and Deploy」をクリック**

デプロイが完了すると、以下のようなURLが発行されます：
```
https://boatrace-app.pages.dev
```

### 方法B: Wrangler CLIから

```bash
# Wranglerをインストール
npm install -g wrangler

# ログイン
wrangler login

# ビルド
npm run build

# Pagesにデプロイ
npx wrangler pages deploy dist --project-name=boatrace-app
```

## 2. Workers API のデプロイ

### ステップ1: Workerをデプロイ

```bash
# workers ディレクトリに移動
cd workers

# デプロイ
npx wrangler deploy boatrace-api.js --name boatrace-api-worker
```

デプロイが完了すると、以下のようなURLが表示されます：
```
https://boatrace-api-worker.your-subdomain.workers.dev
```

### ステップ2: WorkerのURLをメモ

表示されたWorkerのURLをコピーしておきます。

### ステップ3: フロントエンドの環境変数を更新

#### Cloudflare Pagesの環境変数を更新

1. Cloudflare Dashboard → Pages → あなたのプロジェクト
2. Settings → Environment variables
3. `VITE_API_BASE_URL` を追加/更新
   ```
   VITE_API_BASE_URL = https://boatrace-api-worker.your-subdomain.workers.dev
   ```
4. 「Save」をクリック
5. 「Deployments」タブから「Retry deployment」で再デプロイ

## 3. 動作確認

### フロントエンドの確認
1. `https://boatrace-app.pages.dev` にアクセス
2. トップページが表示されることを確認

### APIの確認
1. ブラウザで `https://boatrace-api-worker.your-subdomain.workers.dev/api/racer/4444` にアクセス
2. JSON レスポンスが返ることを確認

### 統合確認
1. フロントエンドで選手番号を検索
2. データが正しく表示されることを確認

## トラブルシューティング

### ビルドエラーが発生する

**エラー**: `error occurred while running deploy command`

**解決策**:
1. `package.json` の `scripts` に `build` コマンドがあることを確認
2. ローカルで `npm run build` が成功することを確認
3. `dist` ディレクトリが生成されることを確認

### CORSエラーが発生する

**エラー**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**解決策**:
1. WorkerのコードでCORSヘッダーが設定されていることを確認
2. Worker側で以下のヘッダーが返されていることを確認：
   ```javascript
   'Access-Control-Allow-Origin': '*'
   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
   'Access-Control-Allow-Headers': 'Content-Type'
   ```

### 環境変数が反映されない

**解決策**:
1. Cloudflare Pages の Settings → Environment variables を確認
2. 変数名が `VITE_` で始まっていることを確認（Viteの要件）
3. 再デプロイを実行

### Workerが404を返す

**解決策**:
1. Worker のデプロイが成功していることを確認
2. `wrangler deployments list` でデプロイ履歴を確認
3. URLが正しいことを確認

## ローカル開発環境

### フロントエンド
```bash
# .env ファイルを作成
echo "VITE_API_BASE_URL=https://boatrace-api-worker.your-subdomain.workers.dev" > .env

# 開発サーバー起動
npm run dev
```

### Workers（ローカルテスト）
```bash
cd workers
npx wrangler dev boatrace-api.js
# http://localhost:8787 でアクセス可能
```

フロントエンドの `.env` をローカルWorkerに向ける：
```bash
VITE_API_BASE_URL=http://localhost:8787
```

## カスタムドメインの設定（オプション）

### Cloudflare Pagesにカスタムドメインを追加

1. Cloudflare Dashboard → Pages → あなたのプロジェクト
2. Custom domains → Set up a custom domain
3. ドメインを入力（例: `boatrace.yourdomain.com`）
4. DNS レコードが自動的に設定されます

### Workerにカスタムドメインを追加

1. Cloudflare Dashboard → Workers & Pages → あなたのWorker
2. Settings → Triggers → Add Custom Domain
3. ドメインを入力（例: `api.yourdomain.com`）
4. DNS レコードが自動的に設定されます

## 料金について

### Cloudflare Pages（無料プラン）
- 無制限のリクエスト
- 無制限の帯域幅
- 500ビルド/月

### Cloudflare Workers（無料プラン）
- 100,000リクエスト/日
- 10ms CPU時間/リクエスト

通常の利用では無料プランで十分です。

## 参考リンク

- [Cloudflare Pages ドキュメント](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Wrangler CLI リファレンス](https://developers.cloudflare.com/workers/wrangler/)
