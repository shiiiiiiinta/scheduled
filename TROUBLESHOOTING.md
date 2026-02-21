# 🔍 システム状態確認ガイド

## 現在の状態

**最終更新**: 2026-02-21  
**コミット**: cafad43  
**デプロイ先**: https://scheduled.pages.dev

---

## ✅ 実装済みの機能

### 1. 診断ページ
- **URL**: https://scheduled.pages.dev/diagnostics
- **機能**:
  - 環境変数の設定状況を確認
  - APIエンドポイントの疎通確認
  - モックデータモード/API接続モードの判定
  - 各APIのレスポンステストとパフォーマンス測定

### 2. デバッグログ
- APIクライアント（`src/api/boatrace.ts`）に詳細ログを追加
- ブラウザコンソールで以下を確認可能：
  ```
  🔧 API設定
  🏁 G1レース取得
  📅 選手スケジュール取得
  🔍 選手検索
  ✅ 成功時のログ
  ❌ エラー時のログ
  ⚠️ モックデータフォールバック
  ```

### 3. 環境変数ファイル
- `.env.production` - 本番環境用設定
- `.env.development` - 開発環境用設定
- `.env.example` - 設定例

---

## ⚠️ 現在の問題

### 問題1: モックデータが表示される

**症状**:
- G1レース一覧に実際のデータが表示されない
- 選手検索でガントチャートが表示されない
- SG詳細ページの選手一覧が更新されない

**原因**:
Cloudflare Pagesで環境変数が設定されていない

**解決方法**:
「修正手順」セクションを参照

---

## 🔧 修正手順

### ステップ1: 診断ページで現在の状態を確認

1. https://scheduled.pages.dev/diagnostics にアクセス
2. 「環境変数」セクションを確認：
   - `USE_MOCK_DATA: true` → **環境変数未設定**
   - `USE_MOCK_DATA: false` → 環境変数は設定済み（APIの問題の可能性）

### ステップ2: Cloudflare Worker URLを確認

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** をクリック
3. Worker一覧から **boatrace-api-worker** を探す
4. Worker URLをコピー（例：`https://boatrace-api-worker.xxxxx.workers.dev`）

⚠️ **重要**: Worker名が異なる場合は、正しいWorker名を確認してください

### ステップ3: Worker APIが動作しているか確認

ブラウザまたはターミナルで以下のURLにアクセス：

```bash
# G1レース一覧
https://your-worker-url.workers.dev/api/races/g1

# 賞金ランキング
https://your-worker-url.workers.dev/api/prize-ranking

# ファン投票
https://your-worker-url.workers.dev/api/fan-vote-ranking
```

**正常な場合**: JSONデータが返される  
**エラーの場合**: Workerを更新する必要があります（[WORKER_UPDATE_GUIDE.md](./WORKER_UPDATE_GUIDE.md) 参照）

### ステップ4: Cloudflare Pagesに環境変数を設定

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. **scheduled** プロジェクトを選択
3. **Settings** タブ → **Environment variables**
4. **Production** セクションで「Add variable」をクリック
5. 以下を追加：

   | Variable name | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://boatrace-api-worker.xxxxx.workers.dev` |
   | `VITE_USE_MOCK_DATA` | `false` |

6. **Save** をクリック
7. 同じ手順で **Preview** セクションにも追加

### ステップ5: 再デプロイを待つ

- 環境変数を保存すると自動的に再デプロイが開始されます
- 通常1〜2分で完了します
- **Deployments** タブでデプロイ状況を確認できます

### ステップ6: 動作確認

再デプロイ完了後、以下を確認：

#### A. 診断ページで確認
1. https://scheduled.pages.dev/diagnostics にアクセス
2. ブラウザの強制再読み込み（Ctrl+Shift+R / Cmd+Shift+R）
3. 環境変数セクションを確認：
   ```json
   {
     "API_BASE_URL": "https://boatrace-api-worker.xxxxx.workers.dev",
     "USE_MOCK_DATA": false
   }
   ```
4. APIエンドポイントセクションで各APIのステータスが「200」になっているか確認

#### B. 各機能をテスト

1. **G1レース一覧**: https://scheduled.pages.dev/races/g1
   - 実際のレースデータが表示されるか
   
2. **選手検索**: https://scheduled.pages.dev/
   - 選手番号（例：4320, 4444）を検索
   - ガントチャートが表示されるか
   
3. **SG詳細ページ**: https://scheduled.pages.dev/sg/classic
   - 全75名の選手データが表示されるか
   - 賞金ランキング（緑色）が表示されるか
   - ファン投票（紫色）が表示されるか

#### C. ブラウザコンソールで確認

1. F12キーで開発者ツールを開く
2. Console タブを確認
3. 以下のようなログが表示されることを確認：
   ```
   🔧 API設定: { API_BASE_URL: "...", USE_MOCK_DATA: false }
   🏁 G1レース取得開始: { USE_MOCK_DATA: false, ... }
   ✅ G1レース取得成功: { races: [...] }
   ```

---

## 🐛 トラブルシューティング

### 問題A: 環境変数を設定したがモックデータが表示される

**原因**: ブラウザキャッシュ

**解決策**:
1. Ctrl+Shift+R（Windows/Linux）または Cmd+Shift+R（Mac）で強制再読み込み
2. または、シークレットモードで開く
3. または、ブラウザキャッシュをクリア

### 問題B: APIエンドポイントがすべて失敗（ステータス: ERROR）

**原因**: Worker URLが間違っている、またはWorkerが存在しない

**解決策**:
1. Worker URLを再確認
2. Workerが正しくデプロイされているか確認
3. Worker URLにブラウザで直接アクセスして動作確認
4. 必要に応じてWorkerを再デプロイ（[WORKER_UPDATE_GUIDE.md](./WORKER_UPDATE_GUIDE.md) 参照）

### 問題C: 一部のAPIエンドポイントが失敗

**原因**: Workerコードが古い、またはエンドポイントが実装されていない

**解決策**:
1. Workerを最新版に更新（[WORKER_UPDATE_GUIDE.md](./WORKER_UPDATE_GUIDE.md) 参照）
2. 必要なエンドポイント：
   - `/api/races/g1` - G1/SGレース一覧
   - `/api/racer/{id}` - 選手情報とスケジュール
   - `/api/racer-performances?ids=xxx,yyy` - 選手成績一括取得
   - `/api/prize-ranking` - 賞金ランキング
   - `/api/fan-vote-ranking` - ファン投票ランキング

### 問題D: CORSエラー

**症状**: コンソールに以下のようなエラーが表示される
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**原因**: WorkerのCORSヘッダーが設定されていない

**解決策**:
Workerコードに以下が含まれているか確認：
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

### 問題E: データが古い

**原因**: キャッシュ

**キャッシュ期間**:
- 賞金ランキング: 1時間
- ファン投票: 30分
- 選手成績: 1時間

**解決策**:
- 強制再読み込み（Ctrl+Shift+R）
- またはキャッシュ期間が過ぎるまで待つ

---

## 📊 期待される動作

### 正常時のブラウザコンソールログ例

```
🔧 API設定: {
  API_BASE_URL: "https://boatrace-api-worker.xxxxx.workers.dev",
  USE_MOCK_DATA: false,
  mode: "production",
  dev: false,
  prod: true
}

🏁 G1レース取得開始: { USE_MOCK_DATA: false, API_BASE_URL: "..." }
✅ G1レース取得成功: { races: [...] }

📅 選手スケジュール取得開始: { racerId: "4320", USE_MOCK_DATA: false, ... }
✅ 選手スケジュール取得成功: { racer: {...}, schedule: [...] }

🔍 選手検索開始: { query: "4320", USE_MOCK_DATA: false, ... }
✅ 選手検索成功: { results: [...] }
```

### 診断ページの期待される表示

#### 環境変数セクション
- 状態: ✅ **API接続モード**
- `API_BASE_URL`: Worker URL
- `USE_MOCK_DATA`: false

#### APIエンドポイントセクション
すべてのエンドポイントが以下の状態：
- ステータス: **200** (緑色)
- `ok`: true
- `responseTime`: 100〜2000ms
- `dataKeys`: 取得したデータのキー
- `dataSize`: データサイズ（バイト）

---

## 📚 関連ドキュメント

- [環境変数設定ガイド](./CLOUDFLARE_PAGES_SETUP.md) - 詳細な設定手順
- [Workerデプロイガイド](./WORKER_UPDATE_GUIDE.md) - Workerの更新方法
- [パフォーマンス分析](./DATA_FETCH_ANALYSIS.md) - データ取得の最適化

---

## ✅ チェックリスト

環境変数設定完了後、以下をすべて確認してください：

- [ ] 診断ページで `USE_MOCK_DATA: false` と表示される
- [ ] 診断ページですべてのAPIエンドポイントがステータス200
- [ ] ブラウザコンソールに「✅ 成功」ログが表示される
- [ ] G1レース一覧に実際のレースが表示される
- [ ] 選手検索でガントチャートが表示される
- [ ] SG詳細ページに全75名のデータが表示される
- [ ] 賞金ランキング（緑色）が表示される
- [ ] ファン投票（紫色）が表示される

すべてにチェックが入れば、システムは正常に動作しています！

---

## 🆘 それでも解決しない場合

以下の情報を添えて報告してください：

1. 診断ページのスクリーンショット
2. ブラウザコンソールのログ全文
3. Cloudflare Pagesの環境変数設定のスクリーンショット（値は伏せてOK）
4. Worker URLとそのレスポンス例
5. 発生している具体的な問題
