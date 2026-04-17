-- Cloudflare D1 Database Schema for Boatrace App
-- 作成日: 2026-04-17

-- ============================================
-- 1. 選手マスター
-- ============================================
CREATE TABLE IF NOT EXISTS racers (
  racer_id INTEGER PRIMARY KEY,        -- 登録番号（例: 4320）
  name TEXT NOT NULL,                  -- 氏名
  branch TEXT,                         -- 支部（例: "福岡"）
  birth_date TEXT,                     -- 生年月日
  rank TEXT,                           -- 級別（A1, A2, B1, B2）
  win_rate REAL,                       -- 勝率
  avg_start_timing REAL,               -- 平均ST
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_racers_rank ON racers(rank);
CREATE INDEX IF NOT EXISTS idx_racers_win_rate ON racers(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_racers_name ON racers(name);

-- ============================================
-- 2. 選手成績
-- ============================================
CREATE TABLE IF NOT EXISTS racer_performances (
  racer_id INTEGER PRIMARY KEY,
  sg_wins INTEGER DEFAULT 0,           -- SG優勝回数
  g1_wins INTEGER DEFAULT 0,           -- G1優勝回数
  g2_wins INTEGER DEFAULT 0,           -- G2優勝回数
  general_wins INTEGER DEFAULT 0,      -- 一般優勝回数
  total_prize_money INTEGER DEFAULT 0, -- 生涯獲得賞金（円）
  prize_ranking INTEGER,               -- 賞金ランキング順位
  fan_vote_count INTEGER DEFAULT 0,    -- ファン投票数
  fan_vote_ranking INTEGER,            -- ファン投票順位
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (racer_id) REFERENCES racers(racer_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_performances_prize ON racer_performances(total_prize_money DESC);
CREATE INDEX IF NOT EXISTS idx_performances_votes ON racer_performances(fan_vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_performances_prize_rank ON racer_performances(prize_ranking);
CREATE INDEX IF NOT EXISTS idx_performances_vote_rank ON racer_performances(fan_vote_ranking);

-- ============================================
-- 3. レース情報
-- ============================================
CREATE TABLE IF NOT EXISTS races (
  race_id TEXT PRIMARY KEY,            -- レースID（例: "gc2026", "classic2026"）
  race_name TEXT NOT NULL,             -- レース名
  venue_name TEXT NOT NULL,            -- 開催場
  venue_code TEXT,                     -- 場コード（例: "01"）
  grade TEXT NOT NULL,                 -- グレード（SG, G1, G2, G3）
  start_date TEXT NOT NULL,            -- 開始日（ISO 8601形式）
  end_date TEXT NOT NULL,              -- 終了日（ISO 8601形式）
  status TEXT DEFAULT 'scheduled',     -- ステータス（scheduled, ongoing, finished）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_races_grade ON races(grade);
CREATE INDEX IF NOT EXISTS idx_races_date ON races(start_date);
CREATE INDEX IF NOT EXISTS idx_races_status ON races(status);

-- ============================================
-- 4. 出場選手
-- ============================================
CREATE TABLE IF NOT EXISTS race_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  race_id TEXT NOT NULL,
  racer_id INTEGER NOT NULL,
  boat_number INTEGER,                 -- 艇番（1〜6）
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (race_id) REFERENCES races(race_id) ON DELETE CASCADE,
  FOREIGN KEY (racer_id) REFERENCES racers(racer_id) ON DELETE CASCADE,
  UNIQUE(race_id, racer_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_race ON race_entries(race_id);
CREATE INDEX IF NOT EXISTS idx_entries_racer ON race_entries(racer_id);

-- ============================================
-- 5. データ同期履歴
-- ============================================
CREATE TABLE IF NOT EXISTS sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,             -- 同期種別（racers, performances, races, entries）
  records_count INTEGER DEFAULT 0,     -- 処理レコード数
  status TEXT NOT NULL,                -- ステータス（success, failed, partial）
  error_message TEXT,                  -- エラーメッセージ
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_type ON sync_history(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_started ON sync_history(started_at DESC);

-- ============================================
-- 6. ビュー: SG選出候補選手
-- ============================================
CREATE VIEW IF NOT EXISTS sg_qualified_candidates AS
SELECT 
  r.racer_id,
  r.name,
  r.branch,
  r.rank,
  r.win_rate,
  rp.total_prize_money,
  rp.prize_ranking,
  rp.fan_vote_count,
  rp.fan_vote_ranking,
  rp.sg_wins,
  rp.g1_wins,
  -- 選出スコア（賞金30%、投票70%）
  CASE 
    WHEN rp.prize_ranking IS NOT NULL AND rp.fan_vote_ranking IS NOT NULL THEN
      (CAST(rp.prize_ranking AS REAL) * 0.3 + CAST(rp.fan_vote_ranking AS REAL) * 0.7)
    WHEN rp.prize_ranking IS NOT NULL THEN
      CAST(rp.prize_ranking AS REAL)
    WHEN rp.fan_vote_ranking IS NOT NULL THEN
      CAST(rp.fan_vote_ranking AS REAL)
    ELSE 9999
  END AS selection_score
FROM racers r
LEFT JOIN racer_performances rp ON r.racer_id = rp.racer_id
WHERE r.rank = 'A1'
  AND (rp.prize_ranking <= 100 OR rp.fan_vote_ranking <= 100)
ORDER BY selection_score;

-- ============================================
-- 7. 初期データ（メタ情報）
-- ============================================
-- データベースバージョン管理
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now')),
  description TEXT
);

INSERT OR IGNORE INTO schema_version (version, description) 
VALUES (1, 'Initial schema creation');
