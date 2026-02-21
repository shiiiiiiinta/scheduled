# Cloudflare Worker 更新ガイド

## 🔄 Workerコードが更新されました

最新の機能:
- ✅ 獲得賞金ランキング取得（boatrace-grandprix.jp）
- ✅ ファン投票ランキング取得（macour.jp）
- ✅ HTMLパーサーで公式データを自動取得

## 📝 更新手順

### 方法1: Cloudflare Dashboard（推奨）

1. **Cloudflare Dashboard にログイン**
   - https://dash.cloudflare.com/

2. **Workers & Pages に移動**
   - 左メニューから「Workers & Pages」を選択

3. **Worker を選択**
   - 既存の `boatrace-api-worker` を選択
   - または、新規作成する場合は「Create」ボタンをクリック

4. **コードをコピー**
   - GitHubから最新コードを取得:
     https://github.com/shiiiiiiinta/scheduled/blob/main/workers/boatrace-api.js
   - 「Raw」ボタンをクリックしてコード全体をコピー

5. **Worker を編集**
   - 「Quick Edit」ボタンをクリック
   - 既存のコードを全て削除し、コピーしたコードを貼り付け

6. **保存とデプロイ**
   - 「Save and Deploy」ボタンをクリック

7. **URLを確認**
   - デプロイ後に表示されるWorker URLをコピー
   - 例: `https://boatrace-api-worker.your-subdomain.workers.dev`

### 方法2: Wrangler CLI（ローカル）

```bash
# Wranglerをインストール
npm install -g wrangler

# ログイン
wrangler login

# Workerディレクトリに移動
cd workers

# デプロイ
npx wrangler deploy
```

## 🔧 環境変数の設定

Worker URLを取得したら、Cloudflare Pagesの環境変数を更新:

1. **Cloudflare Dashboard** → **Workers & Pages**
2. **scheduled** プロジェクトを選択
3. **Settings** → **Environment variables**
4. **Edit variables** をクリック
5. `VITE_API_BASE_URL` を更新:
   - Value: `https://boatrace-api-worker.your-subdomain.workers.dev`
   - Production と Preview の両方にチェック
6. **Save** をクリック

## 🧪 動作確認

### 1. Worker のテスト

ブラウザで以下のURLにアクセス:

```
https://boatrace-api-worker.your-subdomain.workers.dev/api/prize-ranking
https://boatrace-api-worker.your-subdomain.workers.dev/api/fan-vote-ranking
```

正常に動作していれば、JSONデータが表示されます。

### 2. フロントエンドで確認

1. Cloudflare Pages が自動再デプロイされるのを待つ
   - https://scheduled.pages.dev

2. SG一覧ページにアクセス
   - https://scheduled.pages.dev/sg

3. 任意のSGレースをクリック
   - 例: https://scheduled.pages.dev/sg/classic

4. 表に「獲得賞金」と「ファン投票」の列が表示されることを確認
   - 獲得賞金: 緑色で金額と順位
   - ファン投票: 紫色で投票数と順位

## 📊 取得されるデータ

### 獲得賞金ランキング
- データソース: https://www.boatrace-grandprix.jp/2026/rtg/sp/ranking.php
- 更新頻度: ほぼリアルタイム（レース終了後）
- 内容: 登録番号、氏名、支部、獲得賞金、順位

### ファン投票ランキング
- データソース: https://sp.macour.jp/allstars
- 更新頻度: 投票期間中は随時更新
- 内容: 登録番号、氏名、投票数、順位

## 🔍 トラブルシューティング

### エラー: "Cannot find module"
→ Worker コードが正しくデプロイされていない可能性があります
→ 方法1の手順に従って、コード全体を再度貼り付けてください

### エラー: "CORS error"
→ Worker URLが正しく設定されていない可能性があります
→ 環境変数 `VITE_API_BASE_URL` を確認してください

### データが表示されない
→ Worker が公式サイトにアクセスできていない可能性があります
→ Worker のログを確認してください（Dashboard → Workers → Logs）

## 📚 参考リンク

- Worker コード: https://github.com/shiiiiiiinta/scheduled/blob/main/workers/boatrace-api.js
- デプロイガイド: https://github.com/shiiiiiiinta/scheduled/blob/main/WEB_WORKER_DEPLOY.md
- フロントエンド: https://scheduled.pages.dev
