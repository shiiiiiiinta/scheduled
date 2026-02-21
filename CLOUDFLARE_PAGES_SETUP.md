# Cloudflare Pages 環境変数設定ガイド

## 🔴 重要：環境変数の設定が必要です

現在、アプリがモックデータを使用している場合は、Cloudflare Pagesに環境変数が設定されていない可能性があります。

## 問題の診断

ブラウザの開発者コンソールを開いて、以下のメッセージを確認してください：

```
🔧 API設定: {
  API_BASE_URL: "",  // ← 空の場合、環境変数が未設定
  USE_MOCK_DATA: true,  // ← trueの場合、モックデータを使用中
  ...
}
```

## 設定手順

### 1. Cloudflare Worker URLの確認

1. Cloudflare Dashboard (https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** → **boatrace-api-worker** を選択
3. Worker URLをコピー（例：`https://boatrace-api-worker.shiiiiiiinta.workers.dev`）

### 2. Cloudflare Pagesに環境変数を設定

1. Cloudflare Dashboard → **Workers & Pages** → **scheduled** を選択
2. **Settings** タブ → **Environment variables** をクリック
3. **Production** セクションで以下を追加：

   | Variable name | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://boatrace-api-worker.shiiiiiiinta.workers.dev` |
   | `VITE_USE_MOCK_DATA` | `false` |

4. **Preview** セクションでも同じ設定を追加

5. **Save** をクリック

### 3. 再デプロイ

環境変数を保存後、自動的に再デプロイが始まります。
完了を待って（通常1〜2分）、アプリにアクセスして確認してください。

## 確認方法

### A. 開発者コンソールで確認

1. https://scheduled.pages.dev/ にアクセス
2. F12キーで開発者ツールを開く
3. コンソールタブで以下を確認：

```
🔧 API設定: {
  API_BASE_URL: "https://boatrace-api-worker.shiiiiiiinta.workers.dev",
  USE_MOCK_DATA: false,
  ...
}
```

`API_BASE_URL`が正しく設定され、`USE_MOCK_DATA`が`false`になっていればOKです。

### B. 各機能の動作確認

#### 1. G1レース一覧ページ
- URL: https://scheduled.pages.dev/races/g1
- 確認事項：実際のG1/SGレースが表示されるか

#### 2. 選手検索
- URL: https://scheduled.pages.dev/
- 選手番号（例：4320, 4444）を入力して検索
- 実際の選手情報が表示されるか確認

#### 3. 選手ガントチャート
- 選手詳細ページ（例：https://scheduled.pages.dev/racer/4320）にアクセス
- ガントチャートが表示されるか確認

#### 4. SG詳細ページ
- URL: https://scheduled.pages.dev/sg/classic
- 確認事項：
  - 全選手データ（75名）が表示される
  - 賞金ランキング（緑色）が表示される
  - ファン投票（紫色）が表示される

## トラブルシューティング

### ❌ 環境変数を設定したがモックデータが表示される

**原因：** ブラウザキャッシュが残っている

**解決策：**
1. Ctrl+Shift+R（Windows/Linux）または Cmd+Shift+R（Mac）で強制再読み込み
2. または、開発者ツール → Network タブ → "Disable cache" をチェックして再読み込み

### ❌ CORS エラーが表示される

**原因：** Worker URLが間違っている、またはWorkerが更新されていない

**解決策：**
1. Worker URLを再確認
2. `WORKER_UPDATE_GUIDE.md`を参照してWorkerを最新版に更新
3. Workerコードに以下のCORSヘッダーが含まれているか確認：
   ```javascript
   'Access-Control-Allow-Origin': '*'
   ```

### ❌ API エラー (404, 500) が表示される

**原因：** Workerのエンドポイントが実装されていない、またはWorkerコードが古い

**解決策：**
1. Workerを最新版に更新（`WORKER_UPDATE_GUIDE.md`参照）
2. 必要なエンドポイント：
   - `/api/racer/{id}` - 選手情報とスケジュール
   - `/api/racer-performances?ids=xxx,yyy` - 選手成績一括取得
   - `/api/prize-ranking` - 賞金ランキング
   - `/api/fan-vote-ranking` - ファン投票ランキング
   - `/api/races/g1` - G1/SGレース一覧

### ❌ データが古い

**原因：** ブラウザまたはCloudflareのキャッシュ

**解決策：**
- 賞金ランキング：1時間ごとに自動更新
- ファン投票：30分ごとに自動更新
- 選手成績：1時間ごとに自動更新
- 強制更新：ブラウザの強制再読み込み（Ctrl+Shift+R）

## 関連ドキュメント

- [Workerデプロイガイド](./WORKER_UPDATE_GUIDE.md) - Cloudflare Workerの更新方法
- [データ取得最適化](./DATA_FETCH_ANALYSIS.md) - パフォーマンス改善の詳細

## サポート

問題が解決しない場合は、以下の情報を添えて報告してください：

1. ブラウザの開発者コンソールのスクリーンショット（API設定の出力含む）
2. アクセスしたURL
3. エラーメッセージの詳細
4. Cloudflare Pages環境変数の設定内容（値は伏せてOK）
