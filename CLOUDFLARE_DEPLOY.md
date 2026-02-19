# Cloudflare Workers デプロイガイド

このガイドでは、boatrace APIプロキシをCloudflare Workersにデプロイする手順を説明します。

## 前提条件

1. Cloudflareアカウント（無料で作成可能）
2. Node.js 18以上がインストールされていること
3. Wranglerがインストールされていること

## セットアップ手順

### 1. Wranglerのインストール

```bash
npm install -g wrangler
```

### 2. Cloudflareにログイン

```bash
wrangler login
```

ブラウザが開き、Cloudflareアカウントでログインします。

### 3. Workerのデプロイ

```bash
cd /home/user/webapp
wrangler deploy
```

デプロイが完了すると、以下のようなURLが表示されます：
```
https://boatrace-api-worker.<your-subdomain>.workers.dev
```

### 4. フロントエンドの環境変数を設定

デプロイされたWorkerのURLをメモして、フロントエンドの環境変数に設定します。

`.env` ファイルを作成：
```bash
VITE_API_BASE_URL=https://boatrace-api-worker.<your-subdomain>.workers.dev
```

### 5. フロントエンドを再ビルド

```bash
npm run build
```

## Workerのエンドポイント

デプロイされたWorkerは以下のエンドポイントを提供します：

### 選手情報取得
```
GET /api/racer/{選手番号}
```

レスポンス例：
```json
{
  "racer": {
    "id": "4444",
    "name": "桐生順平",
    "branch": "埼玉",
    "rank": "A1",
    "winRate": 7.25
  },
  "schedule": [
    {
      "date": "2/25",
      "venueName": "桐生",
      "grade": "G1"
    }
  ]
}
```

### G1以上のレース一覧
```
GET /api/races/g1
```

レスポンス例：
```json
{
  "races": [
    {
      "raceName": "正月特選",
      "venueName": "桐生",
      "grade": "G1",
      "dates": ["1/5", "1/6", "1/7"]
    }
  ]
}
```

### 選手検索
```
GET /api/search?q={検索クエリ}
```

## トラブルシューティング

### デプロイエラーが発生する場合

1. Wranglerのバージョンを確認：
```bash
wrangler --version
```

2. ログアウトして再ログイン：
```bash
wrangler logout
wrangler login
```

### CORSエラーが発生する場合

Workerのコードで以下のヘッダーが設定されていることを確認：
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

### レート制限に引っかかる場合

boatrace.jpからのスクレイピングが頻繁すぎる場合、レート制限に引っかかる可能性があります。

対策：
1. Cloudflare KVを使用してキャッシュを実装
2. リクエスト間隔を調整

## キャッシュの実装（オプション）

大量のリクエストを処理する場合は、Cloudflare KVを使用してキャッシュを実装することをお勧めします。

```bash
# KV Namespaceの作成
wrangler kv:namespace create "BOATRACE_CACHE"
```

`wrangler.toml` に追加：
```toml
[[kv_namespaces]]
binding = "BOATRACE_CACHE"
id = "your_kv_namespace_id"
```

## 料金について

Cloudflare Workersの無料プランでは、以下が利用可能です：
- 1日あたり100,000リクエスト
- CPUタイム: リクエストあたり10ms

通常の利用では無料プランで十分です。

## 参考リンク

- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Wrangler CLI リファレンス](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
