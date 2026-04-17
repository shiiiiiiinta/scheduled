# データベース構築 完全ガイド

## 🎯 現在の状況

✅ **完了済み:**
- データベース設計（Cloudflare D1 / SQLite）
- スキーマファイル作成（`schema.sql`）
- 賞金ランキング上位60名のデータ取得
- SQL投入ファイル生成（`scripts/seed_data.sql`）

📊 **取得済みデータ:**
- 選手マスター: 60名（賞金ランキング上位）
- 選手成績: 60名分（賞金額、順位含む）

---

## 🚀 データベース構築手順（今すぐ実行）

### Step 1: Cloudflare D1 データベースを作成

```bash
cd /home/user/webapp
wrangler d1 create boatrace-db
```

**出力例:**
```
✅ Successfully created DB 'boatrace-db' in region APAC
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "boatrace-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**重要:** `database_id` をコピーしてください。

---

### Step 2: wrangler.toml にデータベース設定を追加

`workers/wrangler.toml` に以下を追加:

```toml
[[d1_databases]]
binding = "DB"
database_name = "boatrace-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← Step 1でコピーしたID
```

---

### Step 3: スキーマを適用

```bash
wrangler d1 execute boatrace-db --local --file=./schema.sql
wrangler d1 execute boatrace-db --remote --file=./schema.sql
```

**確認:**
```bash
wrangler d1 execute boatrace-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

**期待される出力:**
```
racers
racer_performances
races
race_entries
sync_history
schema_version
```

---

### Step 4: データを投入

```bash
wrangler d1 execute boatrace-db --local --file=./scripts/seed_data.sql
wrangler d1 execute boatrace-db --remote --file=./scripts/seed_data.sql
```

**確認:**
```bash
wrangler d1 execute boatrace-db --remote --command="SELECT COUNT(*) as count FROM racers;"
wrangler d1 execute boatrace-db --remote --command="SELECT * FROM racers LIMIT 5;"
```

**期待される出力:**
```
count: 60
```

---

## 📋 データベース内容確認コマンド

### 選手マスター確認
```bash
# 件数確認
wrangler d1 execute boatrace-db --remote --command="SELECT COUNT(*) FROM racers;"

# 上位5名表示
wrangler d1 execute boatrace-db --remote --command="SELECT racer_id, name, branch, rank FROM racers LIMIT 5;"

# 賞金ランキング上位10名
wrangler d1 execute boatrace-db --remote --command="
SELECT r.racer_id, r.name, r.branch, rp.prize_ranking, rp.total_prize_money 
FROM racers r 
LEFT JOIN racer_performances rp ON r.racer_id = rp.racer_id 
ORDER BY rp.prize_ranking LIMIT 10;
"
```

### 選手成績確認
```bash
# 件数確認
wrangler d1 execute boatrace-db --remote --command="SELECT COUNT(*) FROM racer_performances;"

# 賞金上位5名
wrangler d1 execute boatrace-db --remote --command="
SELECT racer_id, total_prize_money, prize_ranking 
FROM racer_performances 
ORDER BY total_prize_money DESC LIMIT 5;
"
```

### 同期履歴確認
```bash
wrangler d1 execute boatrace-db --remote --command="SELECT * FROM sync_history;"
```

---

## 🔧 次のステップ: Worker を DB 対応に更新

### 現在の状態
- Worker は HTML スクレイピングでデータ取得
- フロントエンドは Worker API 経由でデータ取得

### 更新後の状態
- Worker は D1 データベースからデータ取得
- スクレイピングは定期更新（Cron）で実行
- フロントエンドは変更なし（API エンドポイント同じ）

### Worker 更新内容

#### 1. `/api/search` エンドポイント（選手検索）

**Before（現在）:**
```javascript
// boatrace.jp から毎回スクレイピング
const html = await fetch(`https://www.boatrace.jp/...`);
const racer = parseHTML(html);
```

**After（DB対応後）:**
```javascript
// D1 データベースから取得
const result = await env.DB.prepare(
  "SELECT * FROM racers WHERE racer_id = ? OR name LIKE ?"
).bind(racerId, `%${query}%`).all();
```

#### 2. `/api/racer/:id` エンドポイント（選手詳細）

**Before:**
```javascript
// 毎回スクレイピング
```

**After:**
```javascript
// DB から取得（高速）
const racer = await env.DB.prepare(
  "SELECT r.*, rp.* FROM racers r LEFT JOIN racer_performances rp ON r.racer_id = rp.racer_id WHERE r.racer_id = ?"
).bind(racerId).first();
```

#### 3. `/api/sg-qualified` エンドポイント（SG選出候補）

**After:**
```javascript
// ビューを使用
const racers = await env.DB.prepare(
  "SELECT * FROM sg_qualified_candidates ORDER BY selection_score LIMIT 75"
).all();
```

---

## 📊 期待される改善

### パフォーマンス
| 項目 | Before | After | 改善率 |
|------|--------|-------|--------|
| 選手検索 | 2-3秒 | 50ms | **40-60倍** |
| 選手詳細 | 2-3秒 | 50ms | **40-60倍** |
| SG詳細 | 30秒+ | 100ms | **300倍** |

### ユーザー体験
- ✅ 即座に検索結果表示
- ✅ ガントチャートが瞬時に表示
- ✅ SG詳細ページで75名が瞬時に表示
- ✅ G1レース詳細で出場選手が瞬時に表示

---

## ⚠️ 注意事項

### データ更新について

**現在のデータ:**
- 賞金ランキング上位60名のみ
- ファン投票データなし（取得不可）
- 2026年4月17日時点のデータ

**データ更新方法:**

#### 手動更新（当面）
```bash
# 最新データ取得
node scripts/simple_seed.js

# DB更新
wrangler d1 execute boatrace-db --remote --file=./scripts/seed_data.sql
```

#### 自動更新（将来実装）
- Cron Triggers で毎日自動更新
- `wrangler.toml` に `crons = ["0 3 * * *"]` を追加
- Worker で scheduled イベント処理

---

## 🐛 トラブルシューティング

### データベースが作成できない
```bash
# Wrangler ログイン確認
wrangler whoami

# 再ログイン
wrangler login
```

### スキーマ適用でエラー
```bash
# テーブル削除（注意：データ消失）
wrangler d1 execute boatrace-db --remote --command="DROP TABLE IF EXISTS racers;"

# 再適用
wrangler d1 execute boatrace-db --remote --file=./schema.sql
```

### データ投入でエラー
```bash
# データクリア
wrangler d1 execute boatrace-db --remote --command="DELETE FROM racers;"
wrangler d1 execute boatrace-db --remote --command="DELETE FROM racer_performances;"

# 再投入
wrangler d1 execute boatrace-db --remote --file=./scripts/seed_data.sql
```

---

## 📝 チェックリスト

- [ ] Step 1: D1データベース作成完了
- [ ] Step 2: wrangler.toml に database_id 追加完了
- [ ] Step 3: スキーマ適用完了（テーブル6個作成確認）
- [ ] Step 4: データ投入完了（選手60名確認）
- [ ] 確認: 賞金ランキング上位10名が正しく表示されること
- [ ] 次: Worker を DB 対応に更新（別タスク）

---

## 🎉 完了したら

データベース構築完了後、以下を報告してください：

1. データベースID（`database_id`）
2. 選手マスターの件数（`SELECT COUNT(*) FROM racers;`）
3. 選手成績の件数（`SELECT COUNT(*) FROM racer_performances;`）
4. 賞金ランキング1位の選手情報

その後、Worker を DB 対応に更新します！
