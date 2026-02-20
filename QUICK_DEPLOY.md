# 🚀 簡単デプロイガイド

このガイドに従えば、5分でアプリケーションを公開できます！

## 📋 前提条件

- GitHubアカウント
- Cloudflareアカウント（無料で作成可能）
- このプロジェクトがGitHubにプッシュされていること

## ステップ1: フロントエンドをCloudflare Pagesにデプロイ

### 1-1. Cloudflareにログイン
https://dash.cloudflare.com/ にアクセスしてログイン

### 1-2. Pagesプロジェクトを作成
1. 左メニューから **Workers & Pages** をクリック
2. **Create** ボタンをクリック
3. **Pages** タブを選択
4. **Connect to Git** をクリック

### 1-3. GitHubと連携
1. **Connect GitHub** をクリック
2. リポジトリへのアクセスを許可
3. このプロジェクトのリポジトリを選択

### 1-4. ビルド設定
以下のように設定してください：

```
Project name: boatrace-app（または任意の名前）
Production branch: main
Framework preset: Vite
Build command: npm run build
Build output directory: dist
```

**重要**: 環境変数は後で設定するので、ここではスキップ

### 1-5. デプロイ
**Save and Deploy** をクリック

数分待つと、デプロイが完了します！
URLは `https://boatrace-app.pages.dev` のような形式になります。

## ステップ2: Workers APIをデプロイ

### 2-1. Wranglerをインストール（初回のみ）
```bash
npm install -g wrangler
```

### 2-2. Cloudflareにログイン
```bash
wrangler login
```
ブラウザが開くので、ログインを承認してください。

### 2-3. Workerをデプロイ
プロジェクトのルートディレクトリで実行：
```bash
./deploy-worker.sh
```

または手動で：
```bash
cd workers
npx wrangler deploy
```

### 2-4. WorkerのURLをメモ
デプロイが完了すると、以下のようなURLが表示されます：
```
https://boatrace-api-worker.your-subdomain.workers.dev
```
**このURLをコピーしてください！**

## ステップ3: 環境変数を設定

### 3-1. Cloudflare Pagesの環境変数を設定
1. Cloudflare Dashboard → **Workers & Pages**
2. あなたのプロジェクト（boatrace-app）をクリック
3. **Settings** タブ → **Environment variables**
4. **Add variable** をクリック
5. 以下を入力：
   ```
   Variable name: VITE_API_BASE_URL
   Value: https://boatrace-api-worker.your-subdomain.workers.dev
   ```
   ※先ほどメモしたWorkerのURLを貼り付け
6. **Save** をクリック

### 3-2. 再デプロイ
1. **Deployments** タブに移動
2. 最新のデプロイの右側にある **⋯** をクリック
3. **Retry deployment** を選択

## ✅ 完了！

数分待つと、アプリケーションが利用可能になります！

**フロントエンドURL**: `https://boatrace-app.pages.dev`
**API URL**: `https://boatrace-api-worker.your-subdomain.workers.dev`

## 🧪 動作確認

### フロントエンドの確認
1. `https://boatrace-app.pages.dev` にアクセス
2. トップページが表示される ✓

### APIの確認
1. ブラウザで `https://boatrace-api-worker.your-subdomain.workers.dev/api/racer/4444` にアクセス
2. JSONレスポンスが返される ✓

### 統合確認
1. フロントエンドで選手番号「4444」を検索
2. データが表示される ✓

## 🔧 トラブルシューティング

### ビルドエラー
**問題**: ビルドが失敗する

**解決策**:
1. ローカルで `npm run build` を実行してエラーを確認
2. GitHub に最新のコードがプッシュされているか確認

### データが表示されない
**問題**: 選手検索してもデータが表示されない

**解決策**:
1. ブラウザの開発者ツール（F12）でコンソールを確認
2. APIのURLが正しく設定されているか確認
   - Cloudflare Pages → Settings → Environment variables
   - `VITE_API_BASE_URL` が正しいWorkerのURLになっているか確認
3. 再デプロイを実行

### CORSエラー
**問題**: `CORS policy` のエラーが出る

**解決策**:
Worker が正しくデプロイされているか確認
```bash
cd workers
npx wrangler deployments list
```

## 📱 モバイル対応

このアプリはレスポンシブデザインなので、スマートフォンからもアクセス可能です！

## 💰 料金

**完全無料**で使えます！

- Cloudflare Pages: 無制限のリクエスト（無料）
- Cloudflare Workers: 10万リクエスト/日まで無料

通常の利用では無料枠で十分です。

## 🔄 更新方法

コードを更新した場合：

### フロントエンド
GitHubにプッシュするだけで自動的に再デプロイされます！
```bash
git add .
git commit -m "更新内容"
git push
```

### Workers API
```bash
./deploy-worker.sh
```

## 🎉 おめでとうございます！

あなたの競艇アプリが世界中からアクセス可能になりました！

---

問題が発生した場合は、[DEPLOY.md](./DEPLOY.md) の詳細ガイドを参照してください。
