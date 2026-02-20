# ⚠️ Cloudflare Pages デプロイエラーの解決方法

## エラーの原因

Cloudflare Pagesのビルドコマンドで、Workerのデプロイも実行しようとしているため、エラーが発生しています。

```
error occurred while running deploy command
```

## ✅ 正しいデプロイ方法

**重要**: フロントエンドとWorkerは**別々**にデプロイする必要があります。

### 方法1: Cloudflare Pagesダッシュボードでビルドコマンドを確認（推奨）

1. **Cloudflare Dashboard** にログイン
   - https://dash.cloudflare.com/

2. **Workers & Pages** → あなたのプロジェクト

3. **Settings** → **Builds & deployments**

4. **Build configuration** を確認/編集：
   ```
   Framework preset: Vite
   Build command: npm run build
   Build output directory: dist
   Root directory: (空欄、またはルートディレクトリ)
   ```

5. **Build command** に以下が含まれていないことを確認：
   - ❌ `wrangler deploy`
   - ❌ `./deploy-worker.sh`
   - ✅ `npm run build` のみ

6. 保存して再デプロイ

### 方法2: GitHubからビルドコマンドを削除

もし `package.json` の `build` スクリプトや、プロジェクトルートの設定ファイルに `wrangler deploy` が含まれている場合は削除してください。

#### 確認すべきファイル：
- `package.json` - `scripts.build` に `wrangler` コマンドが入っていないか
- `.github/workflows/*.yml` - GitHub Actionsでデプロイしていないか

### 方法3: 正しいデプロイフロー

#### Step 1: フロントエンドのデプロイ（Cloudflare Pages）

**GitHubから自動デプロイ：**
1. GitHubにコードをプッシュ
2. Cloudflare Pagesが自動的にビルド・デプロイ
3. ビルドコマンド: `npm run build`
4. 出力ディレクトリ: `dist`

#### Step 2: Workerのデプロイ（ローカルから手動）

**ローカル環境で実行：**
```bash
# プロジェクトルートで実行
cd /home/user/webapp

# Wranglerインストール（初回のみ）
npm install -g wrangler

# ログイン
wrangler login

# workersディレクトリに移動
cd workers

# デプロイ
npx wrangler deploy

# または、ルートディレクトリから
cd /home/user/webapp
./deploy-worker.sh
```

## 🔧 デプロイスクリプトの使い方

### フロントエンド
```bash
# GitHubにプッシュするだけ
git add .
git commit -m "update"
git push

# Cloudflare Pagesが自動的にデプロイ
```

### Workers API
```bash
# ローカルから手動でデプロイ
./deploy-worker.sh
```

## 📝 Cloudflare Pagesのビルド設定（正しい設定）

Cloudflare Pagesダッシュボードで以下のように設定してください：

```yaml
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: (空欄)
Node.js version: 18
```

### 環境変数（後で設定）
```
VITE_API_BASE_URL = https://boatrace-api-worker.your-subdomain.workers.dev
```

## ❌ よくある間違い

### 間違い1: ビルドコマンドにWorkerデプロイを含める
```bash
# ❌ 間違い
Build command: npm run build && wrangler deploy
```

### 間違い2: package.jsonのbuildスクリプトにWorkerデプロイを含める
```json
{
  "scripts": {
    "build": "vite build && wrangler deploy"  // ❌ 間違い
  }
}
```

### 正解: フロントエンドのビルドのみ
```bash
# ✅ 正しい
Build command: npm run build
```

```json
{
  "scripts": {
    "build": "tsc -b && vite build"  // ✅ 正しい
  }
}
```

## 🚀 デプロイの流れ（正しい方法）

```
1. コードをGitHubにプッシュ
   ↓
2. Cloudflare Pagesが自動ビルド
   - フロントエンドのみビルド
   - distディレクトリを公開
   ↓
3. ローカルからWorkerをデプロイ
   - cd workers
   - npx wrangler deploy
   ↓
4. 環境変数を設定
   - VITE_API_BASE_URL=<WorkerのURL>
   ↓
5. Cloudflare Pagesで再デプロイ
   - 環境変数を読み込んで再ビルド
```

## 🆘 トラブルシューティング

### エラーが続く場合

1. **Cloudflare Pagesのビルドログを確認**
   - Deployments → 失敗したデプロイ → View logs
   - どのコマンドでエラーが出ているか確認

2. **ビルドコマンドをシンプルに**
   ```
   npm run build
   ```
   これだけにする

3. **ローカルでビルドテスト**
   ```bash
   cd /home/user/webapp
   npm run build
   # エラーが出ないか確認
   ```

4. **Workerは別途デプロイ**
   ```bash
   cd workers
   npx wrangler deploy
   ```

## 📞 サポート

それでもエラーが解決しない場合は、以下の情報を確認してください：
- Cloudflare Pagesのビルドログ全文
- `package.json` の `scripts` セクション
- 実行されているビルドコマンド

---

**重要**: Cloudflare Pagesはフロントエンドのみをビルドし、Workerは別途デプロイしてください！
