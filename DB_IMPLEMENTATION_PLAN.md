# データベース実装計画

## 1. データベース選定: Cloudflare D1 (SQLite)

### 選定理由
- **コスト**: 無料枠（5GB, 500万read/日）で十分
- **統合**: Cloudflare Workerとネイティブ統合
- **性能**: エッジロケーションで超高速
- **SQL**: 複雑なクエリが可能

### データ量試算
```
選手データ: 1,600名 × 1KB = 1.6MB
レースデータ: 100レース × 2KB = 200KB
選手成績: 1,600名 × 500B = 800KB
合計: 約2.6MB << 5GB（無料枠）
```

---

## 2. データベーススキーマ

### 2.1 選手マスター（racers）
```sql
CREATE TABLE racers (
  racer_id INTEGER PRIMARY KEY,        -- 登録番号（例: 4320）
  name TEXT NOT NULL,                  -- 氏名
  branch TEXT,                         -- 支部
  birth_date TEXT,                     -- 生年月日
  rank TEXT,                           -- 級別（A1, A2, B1, B2）
  win_rate REAL,                       -- 勝率
  avg_start_timing REAL,               -- 平均ST
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_racers_rank ON racers(rank);
CREATE INDEX idx_racers_win_rate ON racers(win_rate DESC);
```

### 2.2 選手成績（racer_performances）
```sql
CREATE TABLE racer_performances (
  racer_id INTEGER PRIMARY KEY,
  sg_wins INTEGER DEFAULT 0,           -- SG優勝回数
  g1_wins INTEGER DEFAULT 0,           -- G1優勝回数
  g2_wins INTEGER DEFAULT 0,           -- G2優勝回数
  general_wins INTEGER DEFAULT 0,      -- 一般優勝回数
  total_prize_money INTEGER DEFAULT 0, -- 生涯獲得賞金（円）
  prize_ranking INTEGER,               -- 賞金ランキング順位
  fan_vote_count INTEGER,              -- ファン投票数
  fan_vote_ranking INTEGER,            -- ファン投票順位
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (racer_id) REFERENCES racers(racer_id)
);

CREATE INDEX idx_performances_prize ON racer_performances(total_prize_money DESC);
CREATE INDEX idx_performances_votes ON racer_performances(fan_vote_count DESC);
```

### 2.3 レース情報（races）
```sql
CREATE TABLE races (
  race_id TEXT PRIMARY KEY,            -- レースID（例: "gc2026"）
  race_name TEXT NOT NULL,             -- レース名
  venue_name TEXT NOT NULL,            -- 開催場
  venue_code TEXT,                     -- 場コード（例: "01"）
  grade TEXT NOT NULL,                 -- グレード（SG, G1, G2, G3）
  start_date TEXT NOT NULL,            -- 開始日
  end_date TEXT NOT NULL,              -- 終了日
  status TEXT DEFAULT 'scheduled',     -- ステータス（scheduled, ongoing, finished）
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_races_grade ON races(grade);
CREATE INDEX idx_races_date ON races(start_date);
```

### 2.4 出場選手（race_entries）
```sql
CREATE TABLE race_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  race_id TEXT NOT NULL,
  racer_id INTEGER NOT NULL,
  boat_number INTEGER,                 -- 艇番
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (race_id) REFERENCES races(race_id),
  FOREIGN KEY (racer_id) REFERENCES racers(racer_id),
  UNIQUE(race_id, racer_id)
);

CREATE INDEX idx_entries_race ON race_entries(race_id);
CREATE INDEX idx_entries_racer ON race_entries(racer_id);
```

### 2.5 データ更新履歴（sync_history）
```sql
CREATE TABLE sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,             -- 同期種別（racers, performances, races）
  records_count INTEGER,               -- 更新レコード数
  status TEXT NOT NULL,                -- ステータス（success, failed）
  error_message TEXT,                  -- エラーメッセージ
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
```

---

## 3. 実装ステップ

### Phase 1: DB環境構築（30分）
1. Cloudflare D1データベースを作成
2. スキーマを適用
3. Workerとバインディング設定

### Phase 2: データ取得・投入（2時間）
1. 賞金ランキング上位100名のデータを取得・格納
2. ファン投票上位100名のデータを取得・格納
3. 重複排除して約150〜180名のデータを確保

### Phase 3: API実装（1時間）
1. 選手検索API（`/api/search`）をDB対応
2. 選手詳細API（`/api/racer/:id`）をDB対応
3. レース詳細API（`/api/race/:id`）をDB対応

### Phase 4: フロントエンド修正（30分）
1. 選手検索ページでDB取得
2. SG詳細ページでDB取得
3. G1レース詳細ページでDB取得

---

## 4. データ更新戦略

### 初期投入（手動実行）
```bash
# Wrangler CLIでデータ投入スクリプト実行
wrangler d1 execute boatrace-db --file=./scripts/seed_racers.sql
```

### 定期更新（Cron Triggers）
```toml
# wrangler.toml
[triggers]
crons = ["0 3 * * *"]  # 毎日3時に更新
```

更新スケジュール:
- **選手マスター**: 週1回（月曜3時）
- **選手成績**: 毎日（午前3時）
- **レース情報**: 毎日（午前3時）
- **賞金ランキング**: 週1回（月曜3時）
- **ファン投票**: 毎日（午前3時）

---

## 5. コスト試算

### 無料枠
- ストレージ: 5GB（使用量: 2.6MB = 0.05%）
- 読み取り: 500万/日（予想: 5万/日 = 1%）
- 書き込み: 10万/日（予想: 5千/日 = 5%）

### 結論
**完全無料で運用可能** ✅

---

## 6. 段階的実装（推奨）

### ステップ1: 最小構成（今すぐ実装）
- 賞金ランキング上位100名
- ファン投票上位100名
- 向こう3ヶ月のG1/SGレース
- 合計: 約150〜180名のデータ

### ステップ2: 拡張（必要に応じて）
- A1級選手全員（約300名）
- G1/SG出場歴のある選手（約500名）

### ステップ3: フルデータ（将来）
- 全選手1,600名
- 過去のレース結果

---

## 7. 次のアクション

### すぐに実行すること
1. **D1データベース作成**
   ```bash
   wrangler d1 create boatrace-db
   ```

2. **スキーマ適用**
   ```bash
   wrangler d1 execute boatrace-db --file=./schema.sql
   ```

3. **初期データ投入**
   - 賞金ランキング上位100名を取得
   - ファン投票上位100名を取得
   - DBに格納

4. **Worker更新**
   - DB接続コードを追加
   - APIをDB対応に変更

5. **デプロイ・動作確認**
   - Worker再デプロイ
   - Pages自動デプロイ確認
   - 診断ページで確認

---

## 参考リンク

- [Cloudflare D1 公式ドキュメント](https://developers.cloudflare.com/d1/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [D1 価格](https://developers.cloudflare.com/d1/platform/pricing/)
