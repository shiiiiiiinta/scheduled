# Cloudflare Pages セットアップガイド

## ⚠️ メンテナンス表示が続く場合の対処法

### 問題の原因
Cloudflare Pagesで環境変数が設定されていない、またはデプロイ設定に問題がある可能性があります。

## 🔧 解決手順

### 1. Cloudflare Pagesダッシュボードにアクセス

1. https://dash.cloudflare.com/ にログイン
2. 左メニューから **Workers & Pages** を選択
3. **scheduled** プロジェクトをクリック

### 2. デプロイ状況を確認

1. **Deployments** タブをクリック
2. 最新のデプロイの状態を確認
   - ✅ **Success**: デプロイ成功
   - ⏳ **In Progress**: デプロイ中
   - ❌ **Failed**: デプロイ失敗（ログを確認）

### 3. デプロイが失敗している場合

#### ログを確認
```
1. 失敗したデプロイをクリック
2. "View build log" をクリック
3. エラーメッセージを確認
```

#### よくあるエラー

**Error 1: Build command failed**
```bash
解決策:
Settings > Builds & deployments > Edit configuration
Build command: npm run build
Build output directory: dist
```

**Error 2: Deploy command error**
```bash
解決策:
Deploy command: echo "Deployment complete"
（空欄または不要なコマンドを削除）
```

### 4. 環境変数を設定

1. **Settings** タブをクリック
2. **Environment variables** セクションを探す
3. **Edit variables** をクリック

#### 必要な環境変数

```bash
# Worker APIのURL（必須）
VITE_API_BASE_URL=https://boatrace-api-worker.your-subdomain.workers.dev

# モックデータを使用する場合（オプション）
# VITE_USE_MOCK_DATA=true
```

**重要**: 
- Production と Preview の両方にチェックを入れる
- `your-subdomain` を実際のWorker URLに置き換える

### 5. 再デプロイ

環境変数を設定したら：

1. **Deployments** タブに戻る
2. 最新のデプロイの右側にある **...** メニューをクリック
3. **Retry deployment** をクリック

### 6. キャッシュをクリア

#### ブラウザキャッシュをクリア

**Chrome / Edge:**
1. `Ctrl + Shift + Delete` (Windows) / `Cmd + Shift + Delete` (Mac)
2. "キャッシュされた画像とファイル" を選択
3. "データを削除" をクリック

**または:**
- `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac) でハードリロード

#### Cloudflare キャッシュをパージ

1. Cloudflare Dashboard → **Caching** → **Configuration**
2. **Purge Everything** をクリック
3. 確認して実行

## 🧪 デプロイ確認

### 1. URLにアクセス

```
https://scheduled.pages.dev
```

### 2. 正常に表示されるか確認

- ✅ ホームページが表示される
- ✅ 選手検索が動作する
- ✅ SG一覧ページにアクセスできる

### 3. コンソールエラーを確認

1. ブラウザで `F12` を押す
2. **Console** タブを開く
3. エラーメッセージがないか確認

#### よくあるエラー

**Error: "Failed to fetch"**
```
原因: VITE_API_BASE_URL が設定されていない
解決: 環境変数を設定して再デプロイ
```

**Error: "CORS error"**
```
原因: Worker APIが正しくデプロイされていない
解決: Worker を更新してデプロイ
```

## 🚀 完全なデプロイフロー

### ステップ1: Worker をデプロイ

```bash
# 方法1: Cloudflare Dashboard
1. Workers & Pages → Create → Worker
2. 名前: boatrace-api-worker
3. Quick Edit → コードを貼り付け
4. Save and Deploy

# 方法2: Wrangler CLI
cd workers
npx wrangler deploy
```

### ステップ2: Worker URLを取得

```
デプロイ後に表示される URL:
https://boatrace-api-worker.your-subdomain.workers.dev
```

### ステップ3: Pages に環境変数を設定

```bash
Settings > Environment variables > Edit variables

VITE_API_BASE_URL=https://boatrace-api-worker.your-subdomain.workers.dev
```

### ステップ4: Pages を再デプロイ

```bash
Deployments > ... > Retry deployment
```

### ステップ5: 確認

```
https://scheduled.pages.dev
```

## 📝 チェックリスト

デプロイ前に確認：

- [ ] GitHubリポジトリにコードがプッシュされている
- [ ] Worker がデプロイされている
- [ ] Worker URLが正しい
- [ ] Pagesの環境変数が設定されている
- [ ] Pagesのビルド設定が正しい
  - Build command: `npm run build`
  - Build output directory: `dist`
  - Deploy command: `echo "Deployment complete"`
- [ ] Node.js version: 18 以上

## 🔍 トラブルシューティング

### 問題: ページが真っ白

**原因1: JavaScriptエラー**
```
確認: ブラウザのコンソールを開く
解決: エラーメッセージに従って修正
```

**原因2: ルーティングエラー**
```
確認: _redirects ファイルが正しいか
解決: 
/* /index.html 200
```

### 問題: API呼び出しが失敗

**確認方法:**
```javascript
// ブラウザコンソールで実行
console.log(import.meta.env.VITE_API_BASE_URL);
```

**期待される結果:**
```
https://boatrace-api-worker.your-subdomain.workers.dev
```

**undefinedの場合:**
```
→ 環境変数が設定されていない
→ Pages の Settings で設定して再デプロイ
```

### 問題: モックデータが表示される

**確認:**
```javascript
// ブラウザコンソールで実行
console.log(import.meta.env.VITE_USE_MOCK_DATA);
```

**'true'の場合:**
```
→ VITE_USE_MOCK_DATA=true が設定されている
→ この環境変数を削除するか false に変更
```

## 📚 関連ドキュメント

- [Cloudflare Pages 公式ドキュメント](https://developers.cloudflare.com/pages/)
- [環境変数の設定](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
- [デプロイのトラブルシューティング](https://developers.cloudflare.com/pages/configuration/build-troubleshooting/)

## 💡 ヒント

- 環境変数を変更したら必ず再デプロイが必要
- デプロイには通常1-3分かかる
- キャッシュが原因の場合はハードリロード（Ctrl+Shift+R）を試す
- 問題が解決しない場合は Cloudflare Pages のログを確認
