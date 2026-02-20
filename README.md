# 競艇選手 出走予定管理アプリ

競艇選手の向こう数ヶ月の出走予定をまとめて確認できるWebアプリケーションです。

## 🚀 クイックスタート

### デプロイ（5分で完了）
**完全無料**でインターネットに公開できます！

👉 **[簡単デプロイガイドはこちら](./QUICK_DEPLOY.md)**

1. Cloudflare Pagesでフロントエンドをデプロイ
2. Cloudflare Workersで APIをデプロイ
3. 環境変数を設定して完了！

### ローカル開発
```bash
npm install
npm run dev
```

## 🚤 主な機能

### 1. 選手番号で検索
- 選手登録番号で検索して、選手の出走予定を確認できます
- 検索結果から選手をタップして、詳細ページに遷移できます

### 2. G1以上のレース一覧
- 向こう3ヶ月のG1以上（SG、G1）のレースを一覧表示
- レースをタップすると、出場選手一覧が表示されます

### 3. 選手個人ページ
- 選手の出走予定をガントチャート形式で表示
- レース名、場名、開催予定日程が視覚的にわかりやすく表示されます
- グレード別に色分けされています

### 4. レース出場選手一覧
- G1レースの出場予定選手を一覧表示
- 選手をタップすると、その選手の出走予定ページに遷移します

### 5. SG出場資格選手ランキング
- SG出場資格を持つ選手の順位とポイントを表示
- 優勝回数や獲得ポイントも確認できます

## 🛠 技術スタック

- **フロントエンド**: React 19.0.0
- **言語**: TypeScript
- **ビルドツール**: Vite 7.3.1
- **ルーティング**: React Router v7.1.3
- **日付処理**: date-fns 4.1.0
- **HTTPクライアント**: axios 1.7.9
- **バックエンド**: Cloudflare Workers（プロキシAPI）

## 📦 セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn
- Cloudflareアカウント（実際のデータ取得を使用する場合）

### インストール

```bash
# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してCloudflare WorkersのURLを設定

# 開発サーバーの起動（モックデータ使用）
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

### Cloudflare Workersのデプロイ

実際のboatrace.jpからデータを取得する場合は、Cloudflare Workersをデプロイする必要があります。

詳細は [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) を参照してください。

```bash
# Wranglerのインストール
npm install -g wrangler

# Cloudflareにログイン
wrangler login

# Workerのデプロイ
wrangler deploy

# デプロイ後、.envファイルにWorkerのURLを設定
VITE_API_BASE_URL=https://boatrace-api-worker.your-subdomain.workers.dev
```

## 📁 プロジェクト構造

```
src/
├── api/              # APIクライアント
│   └── boatrace.ts   # boatrace APIクライアント（モック/リアルAPI切り替え）
├── components/       # 再利用可能なコンポーネント
├── pages/           # ページコンポーネント
│   ├── HomePage.tsx          # トップページ
│   ├── RacerPage.tsx         # 選手個人ページ
│   ├── G1RacesPage.tsx       # G1レース一覧
│   ├── RaceEntryPage.tsx     # レース出場選手一覧
│   └── SGRankingPage.tsx     # SG出場資格選手ランキング
├── types/           # TypeScript型定義
│   └── index.ts
├── utils/           # ユーティリティ関数
│   └── venues.ts    # 競艇場マスタデータ
├── App.tsx          # ルートコンポーネント
└── main.tsx         # エントリーポイント

workers/             # Cloudflare Workers
└── boatrace-api.js  # boatrace.jpプロキシAPI
```

## 🎨 UI設計

### カラースキーム
- **SG**: 赤 (#dc3545) - 最高峰のレース
- **G1**: 黄色 (#ffc107) - トップクラスのレース
- **G2**: 緑 (#28a745)
- **G3**: 青 (#17a2b8)

### レスポンシブデザイン
- モバイル、タブレット、デスクトップに対応
- 横スクロール対応のガントチャート

## ⚠️ データソースについて

このアプリケーションは2つのモードで動作します：

### モックデータモード（デフォルト）
- `.env`ファイルで`VITE_API_BASE_URL`が設定されていない場合
- または`VITE_USE_MOCK_DATA=true`の場合
- ハードコードされたサンプルデータを表示

### リアルデータモード
- Cloudflare Workersをデプロイ後、`.env`に`VITE_API_BASE_URL`を設定
- boatrace.jp公式サイトから実際のデータを取得
- CORS制限を回避してデータを提供

実際のデータを取得するには：

1. [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) の手順に従ってWorkerをデプロイ
2. `.env`ファイルを作成してWorkerのURLを設定
3. アプリを再起動

### データ取得の仕組み

```
フロントエンド → Cloudflare Workers → boatrace.jp
                 (プロキシAPI)        (公式サイト)
                 
- HTMLをスクレイピング
- JSONに変換
- CORSヘッダーを追加
```

## 🚀 今後の拡張予定

- [x] Cloudflare Workersによるデータ取得
- [x] モック/リアルデータの切り替え機能
- [ ] HTMLパーサーの精度向上
- [ ] 選手名での検索機能
- [ ] レース結果の表示
- [ ] お気に入り選手の登録
- [ ] 通知機能（出走予定のリマインダー）
- [ ] Cloudflare KVによるキャッシング
- [ ] オフライン対応

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📞 お問い合わせ

質問や提案がある場合は、Issueを作成してください。
