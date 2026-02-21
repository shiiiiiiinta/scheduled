# 🚨 Cloudflare Pages デプロイエラー完全解決ガイド

## 問題の特定

Cloudflare Pagesのビルドで以下のエラーが出ている：

```
error occurred while running deploy command
If are uploading a directory of assets...
```

**原因**: Cloudflare PagesがWorkerをデプロイしようとしている

---

## ✅ 解決方法（3つの選択肢）

### 【推奨】方法1: Cloudflare Pagesダッシュボードで設定

#### Step 1: ビルド設定を確認

1. **Cloudflare Dashboard** にログイン
   - https://dash.cloudflare.com/

2. **Workers & Pages** をクリック

3. あなたのプロジェクト **scheduled** をクリック

4. **Settings** タブ → **Builds & deployments** をクリック

#### Step 2: ビルドコマンドを確認・修正

**現在の設定を確認：**
- Framework preset: `Vite` になっているか？
- Build command: 何が設定されているか？

**以下のように修正：**

```
Framework preset: Vite
Build command: npm install && npm run build
Build output directory: dist
Root directory: (空欄のまま)
Node.js version: 18
```

#### Step 3: 環境変数を確認（オプション）

まだWorkerをデプロイしていない場合は、環境変数は後で設定します。

#### Step 4: 再デプロイ

1. **Deployments** タブに移動
2. 最新の失敗したデプロイを見つける
3. 右側の **⋯** (三点リーダー) をクリック
4. **Retry deployment** を選択

**これで成功するはずです！**

---

### 方法2: Build commandを明示的に指定

Cloudflare Pagesのダッシュボードで：

```bash
# シンプルバージョン
npm run build

# または完全バージョン
npm ci && npm run build
```

**注意**: 以下は含めない
- ❌ `wrangler deploy`
- ❌ `./deploy-worker.sh`
- ❌ Workerに関連するコマンド

---

### 方法3: package.jsonを確認

`package.json` の `scripts` セクションを確認：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",  // ← これだけであることを確認
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

もし `build` スクリプトに `wrangler` や `deploy` が含まれていたら削除してください。

---

## 🎯 正しいデプロイフロー

```
📦 フロントエンド (Cloudflare Pages)
  ↓
  1. GitHubにプッシュ
  2. Cloudflare Pagesが自動ビルド
     ビルドコマンド: npm run build
     出力: dist/
  3. デプロイ完了！
     URL: https://scheduled-bvr.pages.dev

⚙️ Workers API (別途デプロイ)
  ↓
  1. ローカル環境で実行:
     cd workers
     npx wrangler deploy
  2. WorkerのURLを取得
  3. Cloudflare Pagesの環境変数に設定
```

---

## 🔧 具体的な手順

### Step 1: Cloudflare Pagesでフロントエンドをデプロイ

#### 1-1. ビルド設定を確認
```
Build command: npm run build
Output directory: dist
```

#### 1-2. 再デプロイを実行

#### 1-3. 成功を確認
- ビルドログで `✓ built in XXXs` が表示される
- デプロイが成功する
- URLにアクセスできる

### Step 2: Workerを別途デプロイ（ローカル環境）

```bash
# ターミナルで実行

# 1. Wranglerインストール（初回のみ）
npm install -g wrangler

# 2. Cloudflareにログイン
wrangler login

# 3. workersディレクトリに移動
cd workers

# 4. デプロイ
npx wrangler deploy

# WorkerのURLが表示される
# 例: https://boatrace-api-worker.your-subdomain.workers.dev
```

### Step 3: 環境変数を設定

1. Cloudflare Pages → Settings → Environment variables
2. 変数を追加：
   ```
   VITE_API_BASE_URL = https://boatrace-api-worker.your-subdomain.workers.dev
   ```
3. Production と Preview の両方に設定
4. Save

### Step 4: 再デプロイ

Deployments → Retry deployment

---

## 🛠 トラブルシューティング

### エラー: "error occurred while running deploy command"

**原因**: ビルドコマンドにWorkerのデプロイが含まれている

**解決策**:
1. Cloudflare Pages → Settings → Builds & deployments
2. Build command を `npm run build` に変更
3. 保存して再デプロイ

### エラー: "npm ERR! missing script: build"

**原因**: `package.json` に `build` スクリプトがない

**解決策**:
1. `package.json` を確認
2. `scripts` セクションに以下があることを確認：
   ```json
   "build": "tsc -b && vite build"
   ```

### ビルドは成功するが、ページが表示されない

**原因**: 環境変数が設定されていない、またはWorkerがデプロイされていない

**解決策**:
1. まずフロントエンドのみで動作確認（モックデータで動く）
2. Workerをデプロイ
3. 環境変数を設定
4. 再デプロイ

---

## 📋 チェックリスト

デプロイ前に確認：

- [ ] `package.json` の `build` スクリプトに `wrangler` が含まれていない
- [ ] Cloudflare Pagesのビルドコマンドが `npm run build` になっている
- [ ] `workers/` ディレクトリがGitHubにプッシュされている（ローカルデプロイ用）
- [ ] `.cfignore` ファイルが作成されている（Pagesビルドから除外）

デプロイ後に確認：

- [ ] Cloudflare Pagesのビルドが成功している
- [ ] フロントエンドのURLにアクセスできる
- [ ] Workerを別途デプロイした
- [ ] 環境変数 `VITE_API_BASE_URL` を設定した
- [ ] 再デプロイを実行した

---

## 💡 重要なポイント

### ✅ やること

1. **Cloudflare Pagesのビルドコマンド**: `npm run build` のみ
2. **Workerのデプロイ**: ローカルから `wrangler deploy`
3. **環境変数**: デプロイ後に設定

### ❌ やらないこと

1. ビルドコマンドに `wrangler deploy` を含めない
2. `package.json` の `build` スクリプトにWorkerデプロイを含めない
3. Cloudflare PagesでWorkerをデプロイしようとしない

---

## 🎉 成功の確認

### フロントエンドのデプロイ成功

```
✓ Built in XXXs
✓ Deployment complete!
✓ Visit: https://scheduled-bvr.pages.dev
```

### Workerのデプロイ成功

```
✓ Uploaded boatrace-api-worker
✓ Deployed boatrace-api-worker
✓ https://boatrace-api-worker.your-subdomain.workers.dev
```

---

## 📞 それでも解決しない場合

以下の情報を確認してください：

1. **Cloudflare Pagesのビルドログ全文**
   - Deployments → 失敗したデプロイ → View build log

2. **ビルドコマンド**
   - Settings → Builds & deployments → Build command

3. **package.json の scripts**
   ```bash
   cat package.json | grep -A 5 "scripts"
   ```

4. **エラーメッセージの全文**

---

**最重要**: Cloudflare Pagesはフロントエンドのみ。Workerは別途ローカルからデプロイ！
