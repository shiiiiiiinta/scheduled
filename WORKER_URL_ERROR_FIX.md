# 🚨 Worker URL エラー診断ガイド

## エラー内容

すべてのAPIエンドポイントで以下のエラーが発生：

```
"Unexpected token '<', \"<!doctype \"... is not valid JSON"
```

---

## 🔍 原因分析

このエラーは、**Worker URLが間違っている**または**Workerが存在しない**ことを示しています。

### エラーの意味

1. **期待される応答**: JSON形式のデータ
   ```json
   {
     "races": [...],
     "rankings": [...]
   }
   ```

2. **実際の応答**: HTMLページ（404エラーページやCloudflareのエラーページ）
   ```html
   <!doctype html>
   <html>
     <head><title>404 Not Found</title></head>
     ...
   ```

### 考えられる原因

1. ❌ **Worker URLが間違っている**
   - 環境変数に設定したURLが正しくない
   - タイポや余分なパスが含まれている

2. ❌ **Workerがデプロイされていない**
   - Workerが"Inactive"状態
   - または、Workerが存在しない

3. ❌ **Workerのルーティングが正しくない**
   - カスタムドメインの設定ミス
   - ルートパスの設定ミス

4. ❌ **Pages環境変数の形式が間違っている**
   - 末尾に余分な `/` がある
   - プロトコル（https://）が抜けている

---

## 🛠️ 解決手順

### ステップ1: 現在設定されているWorker URLを確認

診断ページ（https://scheduled-bvr.pages.dev/diagnostics）で、「環境変数」セクションを確認：

```json
{
  "VITE_API_BASE_URL": "ここに表示されているURL",
  "API_BASE_URL": "ここに表示されているURL"
}
```

このURLをメモしてください。

### ステップ2: Worker URLが存在するか確認

#### A. Cloudflare Dashboardで確認

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** をクリック
3. **Overview** タブを選択
4. Workerの一覧を確認：
   - Worker名を探す（例：boatrace-api-worker, scheduled, など）
   - ステータスを確認（Active/Inactive）

5. 対象のWorkerをクリック
6. **URLをコピー**（例：`https://scheduled.xxxxx.workers.dev`）

#### B. ブラウザで直接アクセス

コピーしたWorker URLにブラウザでアクセス：

```
https://your-worker-url.workers.dev/api/races/g1
```

**正常な場合**:
```json
{
  "races": [...]
}
```

**エラーの場合**:
```html
<!doctype html>
<html>...404 Not Found...</html>
```
または
```
Worker not found
```

### ステップ3: 正しいWorker URLを特定

#### パターン1: 標準的なWorker URL

```
https://worker-name.account-name.workers.dev
```

例：
- `https://boatrace-api-worker.shiiiiiiinta.workers.dev`
- `https://scheduled.your-account.workers.dev`

#### パターン2: カスタムドメイン

```
https://api.yourdomain.com
```

#### パターン3: Workerが存在しない場合

→ Workerを新規作成またはデプロイする必要があります（後述）

### ステップ4: Pages環境変数を修正

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. **scheduled-bvr** プロジェクトを選択
3. **Settings** タブ → **Environment variables**
4. **Production** セクション

#### 誤った設定例

❌ **間違い**:
```
VITE_API_BASE_URL = https://scheduled-bvr.pages.dev/
```
→ これはPages（フロントエンド）のURL（間違い）

❌ **間違い**:
```
VITE_API_BASE_URL = https://your-worker-url.workers.dev/
```
→ 末尾に余分な `/` がある

❌ **間違い**:
```
VITE_API_BASE_URL = your-worker-url.workers.dev
```
→ `https://` が抜けている

#### 正しい設定例

✅ **正しい**:
```
VITE_API_BASE_URL = https://your-worker-url.workers.dev
```

5. 設定を修正したら **Save** をクリック
6. 自動的に再デプロイが開始されます（1〜2分）

### ステップ5: Workerが存在しない場合の対処

#### Workerを新規作成してデプロイ

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. **Create application** をクリック
3. **Workers** タブを選択
4. **Create Worker** をクリック
5. Worker名を入力（例：`boatrace-api-worker`）
6. **Deploy** をクリック
7. **Quick Edit** をクリック
8. エディタのコードをすべて削除
9. 以下のURLから最新コードをコピー：
   - https://raw.githubusercontent.com/shiiiiiiinta/scheduled/main/workers/boatrace-api.js
10. エディタに貼り付け
11. **Save and Deploy** をクリック
12. デプロイ完了後、Worker URLをコピー
13. 「ステップ4: Pages環境変数を修正」に戻る

---

## ✅ 動作確認

### 1. Worker URLをブラウザでテスト

各エンドポイントに直接アクセス：

```bash
# G1レース一覧
https://your-worker-url.workers.dev/api/races/g1

# 賞金ランキング
https://your-worker-url.workers.dev/api/prize-ranking

# ファン投票
https://your-worker-url.workers.dev/api/fan-vote-ranking

# 選手情報
https://your-worker-url.workers.dev/api/racer/4320
```

すべてJSON形式のデータが返されることを確認。

### 2. Pages環境変数を確認

Pages環境変数を設定後、再デプロイが完了したら：

1. https://scheduled-bvr.pages.dev/diagnostics にアクセス
2. Ctrl+Shift+R で強制再読み込み
3. 「環境変数」セクションで以下を確認：
   ```json
   {
     "VITE_API_BASE_URL": "https://your-worker-url.workers.dev",
     "USE_MOCK_DATA": false
   }
   ```
4. 「APIエンドポイント」セクションですべてステータス200になることを確認

### 3. 各ページで動作確認

- G1レース一覧: https://scheduled-bvr.pages.dev/races/g1
- 選手検索: https://scheduled-bvr.pages.dev/
- SG詳細: https://scheduled-bvr.pages.dev/sg/classic

---

## 📋 チェックリスト

解決するために以下を確認してください：

- [ ] Cloudflare DashboardでWorkerが存在することを確認
- [ ] Workerのステータスが"Active"であることを確認
- [ ] Worker URLをブラウザで直接アクセスしてJSONが返されることを確認
- [ ] Pages環境変数 `VITE_API_BASE_URL` が正しいWorker URLに設定されている
- [ ] 環境変数のURLに余分な `/` や間違ったプロトコルがない
- [ ] Pages環境変数を保存後、再デプロイが完了している（1〜2分）
- [ ] 診断ページで `USE_MOCK_DATA: false` と表示される
- [ ] 診断ページですべてのAPIエンドポイントがステータス200

---

## 🆘 それでも解決しない場合

以下の情報を提供してください：

1. **診断ページのスクリーンショット**
   - 特に「環境変数」と「APIエンドポイント」セクション

2. **Cloudflare Dashboard のスクリーンショット**
   - Workers一覧画面
   - 対象Workerの詳細画面（URLとステータスが見える状態）
   - Pages環境変数設定画面

3. **ブラウザでWorker URLに直接アクセスした結果**
   - 例：`https://your-worker-url.workers.dev/api/races/g1`
   - レスポンスの内容（JSON or HTML）

4. **ブラウザコンソールのエラーログ**
   - F12 → Console タブ
   - 赤いエラーメッセージをすべてコピー

---

## 💡 よくある間違い

### 間違い1: PagesのURLをWorker URLとして設定

❌ **間違い**:
```
VITE_API_BASE_URL = https://scheduled-bvr.pages.dev
```

✅ **正しい**:
```
VITE_API_BASE_URL = https://your-worker-name.your-account.workers.dev
```

### 間違い2: 末尾にスラッシュをつける

❌ **間違い**:
```
VITE_API_BASE_URL = https://your-worker-url.workers.dev/
```

✅ **正しい**:
```
VITE_API_BASE_URL = https://your-worker-url.workers.dev
```

### 間違い3: プロトコルを忘れる

❌ **間違い**:
```
VITE_API_BASE_URL = your-worker-url.workers.dev
```

✅ **正しい**:
```
VITE_API_BASE_URL = https://your-worker-url.workers.dev
```

### 間違い4: 存在しないWorkerのURLを設定

❌ **間違い**:
```
VITE_API_BASE_URL = https://non-existent-worker.workers.dev
```

→ まずWorkerを作成・デプロイしてから、そのURLを設定する

---

## 📚 関連ドキュメント

- [Workerデプロイガイド](./WORKER_UPDATE_GUIDE.md)
- [Worker Inactive問題](./WORKER_INACTIVE_FIX.md)
- [環境変数設定ガイド](./CLOUDFLARE_PAGES_SETUP.md)
- [トラブルシューティング](./TROUBLESHOOTING.md)
