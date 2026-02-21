# ⚠️ Cloudflare Worker の "Inactive" 状態について

## 現在の状況

**Worker URL**: 設定済み（確認済み）  
**Worker Status**: **Inactive** ⚠️  
**Pages URL**: https://scheduled-bvr.pages.dev/

---

## 🔴 重要：Workerが"Inactive"の場合の影響

### Workerの状態とは？

Cloudflare Workerには以下の状態があります：

1. **Active（アクティブ）** ✅
   - Workerが正常に動作中
   - APIリクエストに応答する
   - フロントエンドがデータを取得できる

2. **Inactive（非アクティブ）** ⚠️
   - Workerがデプロイされていない、またはエラーがある
   - APIリクエストが失敗する
   - フロントエンドはモックデータにフォールバックする

### 現在の問題

**Workerが"Inactive"の場合、以下の問題が発生します**：

- ❌ G1レース一覧が取得できない
- ❌ 選手検索が動作しない（ガントチャート表示されない）
- ❌ SG詳細ページの選手データが取得できない
- ❌ 賞金ランキングが取得できない
- ❌ ファン投票が取得できない

**結果**: フロントエンドがすべてモックデータを使用してしまう

---

## 🛠️ 解決方法

### ステップ1: Workerの状態を確認

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** をクリック
3. 左側のメニューで **Overview** を選択
4. Worker一覧から **boatrace-api-worker**（または類似の名前）を探す
5. ステータスを確認：
   - ✅ **Active** → 正常
   - ⚠️ **Inactive** または **エラーアイコン** → 要修正

### ステップ2: Workerをデプロイする

#### 方法A: Cloudflare Dashboardから手動デプロイ（推奨）

1. **Workers & Pages** → 対象のWorkerを選択
2. 右上の **Edit Code** または **Quick Edit** をクリック
3. 最新のWorkerコードを貼り付け：
   - コードの場所: https://github.com/shiiiiiiinta/scheduled/blob/main/workers/boatrace-api.js
   - または、ローカルの `workers/boatrace-api.js` ファイル
4. **Save and Deploy** をクリック
5. デプロイが完了するまで待つ（通常10〜30秒）
6. ステータスが **Active** になることを確認

#### 方法B: Wrangler CLIでデプロイ

```bash
cd /home/user/webapp/workers
npx wrangler deploy
```

---

## 🔍 Git連携について

### ⚠️ 重要：WorkerはGit連携していません

**誤解を解消**：

1. **Cloudflare Pages（フロントエンド）**:
   - ✅ Git連携している
   - ✅ GitHubにpushすると自動デプロイ
   - ✅ https://scheduled-bvr.pages.dev/

2. **Cloudflare Worker（バックエンドAPI）**:
   - ❌ Git連携していない
   - ❌ GitHubにpushしても自動デプロイされない
   - ❌ **手動でデプロイする必要がある**

### なぜWorkerはGit連携していないのか？

Cloudflare Workersは以下の理由で手動デプロイが一般的です：

1. **単一ファイル**: 通常1つのJavaScriptファイルのみ
2. **高速デプロイ**: 手動デプロイでも10〜30秒で完了
3. **カスタム設定**: 環境変数やルーティングの細かい制御が必要
4. **テストの柔軟性**: デプロイ前にローカルでテスト可能

---

## ✅ 正しい運用フロー

### フロントエンド（Pages）の変更

```bash
# コード修正
git add .
git commit -m "feat: 新機能追加"
git push origin main

# → 自動的にCloudflare Pagesがデプロイ ✅
```

### バックエンド（Worker）の変更

```bash
# コード修正（workers/boatrace-api.js）
git add .
git commit -m "feat: 新しいAPIエンドポイント追加"
git push origin main

# ⚠️ この時点ではWorkerは更新されていない

# 手動デプロイが必要 👇
cd workers
npx wrangler deploy

# または、Cloudflare Dashboardから手動デプロイ
```

---

## 🎯 今すぐ実行すべきこと

### 1. Workerをデプロイする

**最も簡単な方法**：

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. 対象のWorkerを選択
3. **Quick Edit** をクリック
4. 最新コードを貼り付け：https://github.com/shiiiiiiinta/scheduled/blob/main/workers/boatrace-api.js
5. **Save and Deploy**

### 2. Workerが正常に動作するか確認

ブラウザで以下のURLにアクセス：

```
https://your-worker-url.workers.dev/api/races/g1
```

**正常な場合**: JSONデータが返される  
**エラーの場合**: エラーメッセージが表示される → Workerコードを再確認

### 3. Pages環境変数を設定

[Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **scheduled-bvr**

**Settings** → **Environment variables** → **Production**:

| Variable name | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://your-worker-url.workers.dev` |
| `VITE_USE_MOCK_DATA` | `false` |

**Save** をクリック → 自動的に再デプロイ

### 4. 動作確認

1. https://scheduled-bvr.pages.dev/diagnostics にアクセス
2. `USE_MOCK_DATA: false` と表示されることを確認
3. すべてのAPIエンドポイントがステータス200になることを確認

---

## 📊 状態確認チェックリスト

環境変数設定前に、以下を確認してください：

- [ ] Workerのステータスが **Active** になっている
- [ ] Worker URLにブラウザでアクセスして、APIが動作することを確認
- [ ] `/api/races/g1` エンドポイントがJSONを返す
- [ ] `/api/prize-ranking` エンドポイントがJSONを返す
- [ ] `/api/fan-vote-ranking` エンドポイントがJSONを返す

すべてクリアしてから、Pages環境変数を設定してください。

---

## 🆘 それでもWorkerが"Inactive"の場合

### 考えられる原因

1. **Workerコードにエラーがある**
   - ログを確認：Cloudflare Dashboard → Worker詳細 → **Logs**
   - エラーメッセージを確認して修正

2. **Workerがデプロイされていない**
   - 一度も手動デプロイしていない
   - → 上記の「ステップ2: Workerをデプロイする」を実行

3. **Workerのルーティングが間違っている**
   - Worker URLが正しいか確認
   - カスタムドメインを使用している場合、ルーティング設定を確認

4. **アカウントの問題**
   - Cloudflareの無料プランの制限を超えている
   - → ダッシュボードでアカウント状態を確認

---

## 📚 関連ドキュメント

- [Workerデプロイの詳細手順](./WORKER_UPDATE_GUIDE.md)
- [環境変数設定ガイド](./CLOUDFLARE_PAGES_SETUP.md)
- [トラブルシューティング](./TROUBLESHOOTING.md)

---

## 💡 まとめ

1. ✅ **Pages URL**: `https://scheduled-bvr.pages.dev/` （正しく設定済み）
2. ⚠️ **Worker Status**: **Inactive** → **今すぐデプロイが必要**
3. ❌ **Git連携**: WorkerはGit連携していない → **手動デプロイが必須**

**次のアクション**:
1. Workerを手動デプロイ
2. Workerが**Active**になることを確認
3. Pages環境変数を設定
4. 診断ページで動作確認

この順序で進めてください！
