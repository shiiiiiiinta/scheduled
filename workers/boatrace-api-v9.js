/**
 * Cloudflare Worker for Boatrace API Proxy
 * 
 * このWorkerは、boatrace.jpの公式サイトからデータを取得し、
 * CORS制限を回避してフロントエンドにデータを提供します。
 */

// CORS ヘッダーを設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// boatrace.jp は UTF-8 配信だが、Workers の response.text() が稀に
// エンコーディングを誤判定して文字化けするため、arrayBuffer を取得して
// 明示的に UTF-8 でデコードする共通ヘルパー
async function fetchHtml(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...extraHeaders,
    },
  });
  if (!response.ok) {
    const err = new Error(`取得失敗: ${response.status} (${url})`);
    err.status = response.status;
    throw err;
  }
  const buffer = await response.arrayBuffer();
  // fatal:false で不正バイトは置換。boatrace.jp は UTF-8 固定
  return new TextDecoder('utf-8').decode(buffer);
}

// HTMLをパースしてJSONに変換するヘルパー関数
class HTMLParser {
  /**
   * 選手情報をパース
   */
  static parseRacerInfo(html) {
    try {
      // 選手名を抽出
      const nameMatch = html.match(/<div[^>]*class="[^"]*racer_name[^"]*"[^>]*>([^<]+)<\/div>/);
      const name = nameMatch ? nameMatch[1].trim() : null;

      // 登録番号を抽出
      const numberMatch = html.match(/登録番号[：:]?\s*(\d{4})/);
      const id = numberMatch ? numberMatch[1] : null;

      // 支部を抽出
      const branchMatch = html.match(/支部[：:]?\s*([^\s<]+)/);
      const branch = branchMatch ? branchMatch[1] : null;

      // 級別を抽出
      const rankMatch = html.match(/級別[：:]?\s*([AB][12])/);
      const rank = rankMatch ? rankMatch[1] : null;

      // 勝率を抽出
      const winRateMatch = html.match(/勝率[：:]?\s*([\d.]+)/);
      const winRate = winRateMatch ? parseFloat(winRateMatch[1]) : null;

      return {
        id,
        name,
        branch,
        rank,
        winRate,
      };
    } catch (error) {
      console.error('選手情報のパースエラー:', error);
      return null;
    }
  }

  /**
   * 選手の詳細成績をパース（SG用）
   */
  static parseRacerPerformance(html) {
    try {
      const performance = {};

      // 基本情報
      const nameMatch = html.match(/class="[^"]*racer_name[^"]*">([^<]+)/);
      performance.name = nameMatch ? nameMatch[1].trim() : null;

      const numberMatch = html.match(/登録番号[：:]?\s*(\d{4})/);
      performance.racerId = numberMatch ? numberMatch[1] : null;

      const branchMatch = html.match(/支部[：:]?\s*([^\s<]+)/);
      performance.branch = branchMatch ? branchMatch[1] : null;

      const rankMatch = html.match(/級別[：:]?\s*([AB][12])/);
      performance.rank = rankMatch ? rankMatch[1] : null;

      // 勝率
      const winRateMatch = html.match(/勝率[：:]?\s*([\d.]+)/);
      performance.winRate = winRateMatch ? parseFloat(winRateMatch[1]) : 0;

      // 平均スタートタイミング
      const stMatch = html.match(/S\.T[：:]?\s*([\d.]+)/);
      performance.avgStartTiming = stMatch ? parseFloat(stMatch[1]) : 0.15;

      // 優勝回数を抽出
      const sgWinsMatch = html.match(/SG優勝[：:]?\s*(\d+)/);
      performance.sgWins = sgWinsMatch ? parseInt(sgWinsMatch[1]) : 0;

      const g1WinsMatch = html.match(/G1優勝[：:]?\s*(\d+)/);
      performance.g1Wins = g1WinsMatch ? parseInt(g1WinsMatch[1]) : 0;

      const g2WinsMatch = html.match(/G2優勝[：:]?\s*(\d+)/);
      performance.g2Wins = g2WinsMatch ? parseInt(g2WinsMatch[1]) : 0;

      // 一般戦優勝回数（総優勝回数から計算）
      const totalWinsMatch = html.match(/優勝回数[：:]?\s*(\d+)/);
      const totalWins = totalWinsMatch ? parseInt(totalWinsMatch[1]) : 0;
      performance.generalWins = Math.max(0, totalWins - performance.sgWins - performance.g1Wins - performance.g2Wins);

      // 獲得賞金とランキングは別途APIから取得
      performance.totalPrizeMoney = 0; // /api/prize-ranking から取得
      performance.prizeRanking = 0; // /api/prize-ranking から取得

      // SG成績
      performance.sgAppearances = performance.sgWins * 5; // 推定
      performance.sgFinalAppearances = performance.sgWins * 3; // 推定
      performance.sgPoints = performance.sgFinalAppearances * 8; // 推定

      // G2以上の成績（推定）
      performance.g2PlusPoints = (performance.sgWins + performance.g1Wins + performance.g2Wins) * 10;
      performance.g2PlusFinalPoints = performance.g2PlusPoints * 10;

      // ファン投票は別途APIから取得
      performance.fanVotes = 0; // /api/fan-vote-ranking から取得

      // 期間別勝率（通常の勝率を使用）
      performance.periodWinRate = performance.winRate;

      // 出場回数（A1級なら160回以上と仮定）
      performance.raceAppearances = performance.rank === 'A1' ? 180 : 140;

      return performance;
    } catch (error) {
      console.error('選手成績のパースエラー:', error);
      return null;
    }
  }

  /**
   * 出走予定（出場予定）をパース
   * profile?toban=XXXX ページの「出場予定」テーブルから取得
   * 各行に開催の「開始日」と「終了日」の2つの日付が含まれる
   * 戻り値: [{ date(=開始日), startDate, endDate, venueName, venueCode, hd, grade, raceName }]
   */
  static parseSchedule(html) {
    try {
      const races = [];

      // class="is-S?a" のグレード判定マップ
      const gradeFromClass = (rowHtml) => {
        if (/is-SGa/.test(rowHtml)) return 'SG';
        if (/is-G1[ab]/.test(rowHtml)) return 'G1';
        if (/is-G2[ab]/.test(rowHtml)) return 'G2';
        if (/is-G3[ab]/.test(rowHtml)) return 'G3';
        return '一般';
      };

      const toISO = (y, m, d) => `${y}-${m}-${d}`;
      const addDaysISO = (isoDate, days) => {
        const dt = new Date(`${isoDate}T00:00:00Z`);
        dt.setUTCDate(dt.getUTCDate() + days);
        return dt.toISOString().slice(0, 10);
      };

      // 「本日出走予定」＋「出場予定」テーブルを対象にする（開催中＋今後の予定を両方含む）
      // ページ構成: ... 本日出走予定 → 出場予定 → 過去成績タブ ...
      // 「本日出走予定」見出し以降を採用（無ければ全体）
      const todayHeaderIdx = html.indexOf('本日出走予定</span>');
      const scheduleHeaderIdx = html.lastIndexOf('出場予定</span>');
      const startIdx = todayHeaderIdx >= 0
        ? todayHeaderIdx
        : (scheduleHeaderIdx >= 0 ? scheduleHeaderIdx : 0);
      const targetHtml = html.slice(startIdx);

      // race_id 相当のキーで重複を除外（本日出走予定と出場予定で同一開催が重複しないように）
      const seen = new Set();

      // 各 <tr> を走査
      const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      let match;

      while ((match = tableRowRegex.exec(targetHtml)) !== null) {
        const rowHtml = match[1];

        // 行内のすべての日付（YYYY/MM/DD）を取得 → 1つ目=開始日, 2つ目=終了日
        const dateMatches = [...rowHtml.matchAll(/(\d{4})\/(\d{2})\/(\d{2})/g)];
        if (dateMatches.length === 0) continue;

        const [, sy, sm, sd] = dateMatches[0];
        const startDate = toISO(sy, sm, sd);

        let endDate;
        if (dateMatches.length >= 2) {
          const [, ey, em, ed] = dateMatches[1];
          endDate = toISO(ey, em, ed);
        } else {
          // 終了日が無い場合は6日間開催とみなし開始日+5日
          endDate = addDaysISO(startDate, 5);
        }

        // レース場（img alt から）
        const venueMatch = rowHtml.match(/<img[^>]*alt="([^"]+)"/);
        const venueName = venueMatch ? venueMatch[1].trim() : null;

        // jcd（場コード）と hd（開催日）を raceindex / racelist リンクから抽出
        const jcdMatch = rowHtml.match(/jcd=(\d+)&(?:amp;)?hd=(\d{8})/);
        const venueCode = jcdMatch ? jcdMatch[1] : null;
        const hd = jcdMatch ? jcdMatch[2] : null;

        // レースタイトル（is-alignL セル内の <a> テキスト）
        const nameMatch = rowHtml.match(/is-alignL[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
        const raceName = nameMatch ? nameMatch[1].trim() : null;

        // グレード
        const grade = gradeFromClass(rowHtml);

        // 重複除去キー（場コード or 場名 + 開催月）
        const dedupKey = `${venueCode || venueName || ''}_${(hd || startDate || '').slice(0, 7)}`;
        if (seen.has(dedupKey)) continue;

        // レース場 or レース名のどちらかがあれば採用
        if (venueName || raceName) {
          seen.add(dedupKey);
          races.push({
            date: startDate, // 後方互換
            startDate,
            endDate,
            venueName,
            venueCode,
            hd,
            grade,
            raceName,
          });
        }
      }

      return races;
    } catch (error) {
      console.error('出走予定のパースエラー:', error);
      return [];
    }
  }

  /**
   * グレード別開催スケジュールをパース
   * race/gradesch?hcd=01(SG/PG1) / hcd=02(G1/G2) / hcd=03(G3) ページ用
   * 各行: 日付(MM/DD-MM/DD) / 会場(img alt) / グレードclass / レース名
   *   レース名は <a hd=...>名前</a>（開催確定）か、プレーンテキスト（未確定・シリーズ戦）
   * 戻り値: [{ raceId, raceName, venueName, venueCode, hd, grade, startDate, endDate }]
   * @param {string} html
   * @param {number} refYear このページが対象とする年（hdが無い行の年決定に使用）
   */
  static parseGradeSchedule(html, refYear) {
    try {
      const races = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      let match;

      while ((match = rowRegex.exec(html)) !== null) {
        const rowHtml = match[1];

        // 日付 MM/DD-MM/DD
        const dm = rowHtml.match(/<td class="td_date">(\d{2})\/(\d{2})-(\d{2})\/(\d{2})<\/td>/);
        if (!dm) continue;
        const [, sMonth, sDay, eMonth, eDay] = dm;

        // 会場（img alt）と場コード（src の text_place1_XX.png）
        const vm = rowHtml.match(/alt="([^"]+)"[^>]*src="\/static_extra\/pc\/images\/text_place\d?_(\d+)\.png"/);
        const venueName = vm ? vm[1].trim() : null;
        const venueCode = vm ? vm[2] : null;

        // レース名: まず <a hd=...>名前</a>（開催確定行）を試す
        let hd = null;
        let raceName = null;
        const linkMatch = rowHtml.match(/is-alignL"><a[^>]*hd=(\d{8})[^>]*>([^<]+)<\/a>/);
        if (linkMatch) {
          hd = linkMatch[1];
          raceName = linkMatch[2].trim();
        } else {
          // リンクが無い行（シリーズ戦・未確定）はセル内テキストを抽出
          const textMatch = rowHtml.match(/is-alignL"[^>]*>([\s\S]*?)<\/td>/);
          if (textMatch) {
            raceName = textMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
          }
        }
        if (!raceName) continue;

        // グレード（is-SGa / is-G1b など）
        const gm = rowHtml.match(/is-(SG|G1|G2|G3)[ab]?/);
        const grade = gm ? gm[1] : '一般';

        // 年の決定: hd があればそれを基準。無ければ refYear を使う
        const endYear = hd ? parseInt(hd.slice(0, 4), 10) : refYear;
        const startYear = parseInt(sMonth, 10) > parseInt(eMonth, 10) ? endYear - 1 : endYear;
        const startDate = `${startYear}-${sMonth}-${sDay}`;
        const endDate = `${endYear}-${eMonth}-${eDay}`;

        // race_id: 場コード + 終了日hd（hd無しは日付から生成）
        const hdKey = hd || `${endYear}${eMonth}${eDay}`;
        const raceId = venueCode ? `${venueCode}_${hdKey}` : `${startDate}_${venueName || 'unknown'}`;

        if (venueName || raceName) {
          // 同一 raceId の重複を除去。
          // 「〜シリーズ」より正式名（例:「グランプリ」）を優先して上書き
          const existingIdx = races.findIndex((r) => r.raceId === raceId);
          if (existingIdx >= 0) {
            const existing = races[existingIdx];
            const existingIsSeries = /シリーズ/.test(existing.raceName);
            const newIsSeries = /シリーズ/.test(raceName);
            // 既存がシリーズ戦で、新しい方が正式名なら差し替え
            if (existingIsSeries && !newIsSeries) {
              races[existingIdx] = { raceId, raceName, venueName, venueCode, hd: hdKey, grade, startDate, endDate };
            }
            // それ以外は既存を維持（重複追加しない）
          } else {
            races.push({ raceId, raceName, venueName, venueCode, hd: hdKey, grade, startDate, endDate });
          }
        }
      }

      return races;
    } catch (error) {
      console.error('グレードスケジュールのパースエラー:', error);
      return [];
    }
  }

  /**
   * レース開催の出場選手一覧をパース
   * race/raceindex?jcd=X&hd=YYYYMMDD ページから、出場選手(登録番号・氏名)を抽出
   * 各Rの番組表に含まれる profile リンクを集約し重複除去
   * 戻り値: [{ racerId, name }]
   */
  static parseRaceEntries(html) {
    try {
      const entries = [];
      const seen = new Set();
      // profile?toban=XXXX...>氏名</a> を全て抽出
      const linkRegex = /racersearch\/profile\?toban=(\d{4})[^>]*>([^<]+)<\/a>/g;
      let m;
      while ((m = linkRegex.exec(html)) !== null) {
        const racerId = m[1];
        // 全角スペースを半角に整形
        const name = m[2].replace(/\u3000/g, ' ').replace(/\s+/g, ' ').trim();
        if (seen.has(racerId)) continue;
        seen.add(racerId);
        entries.push({ racerId, name });
      }
      return entries;
    } catch (error) {
      console.error('出場選手のパースエラー:', error);
      return [];
    }
  }

  /**
   * 獲得賞金ランキングをパース（公式サイトから）
   */
  static parsePrizeRanking(html) {
    try {
      const rankings = [];
      
      // data属性付きのtr要素を抽出（登録番号がdata属性に入っている）
      const rowRegex = /<tr data="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
      let match;

      while ((match = rowRegex.exec(html)) !== null) {
        const racerId = match[1];
        const rowHtml = match[2];
        
        // 順位を抽出（<span class="rank rankX ...>数字</span>）
        const rankMatch = rowHtml.match(/<span class="rank[^"]*">\s*(\d+)\s*<\/span>/);
        const rank = rankMatch ? parseInt(rankMatch[1]) : 0;

        // 氏名を抽出（<span class="racer">名前</span>）
        const nameMatch = rowHtml.match(/<span class="racer">([^<]+)<\/span>/);
        const name = nameMatch ? nameMatch[1].trim() : null;

        // 支部を抽出（<span class="shibu">支部名</span>）
        const branchMatch = rowHtml.match(/<span class="shibu">([^<]+)<\/span>/);
        const branch = branchMatch ? branchMatch[1].trim() : null;

        // 級別を抽出（<span class="kyu">級別</span>）
        const rankClassMatch = rowHtml.match(/<span class="kyu">([^<]+)<\/span>/);
        const rankClass = rankClassMatch ? rankClassMatch[1].trim() : null;

        // 獲得賞金を抽出（<span class="money">数字</span>円）
        const prizeMatch = rowHtml.match(/<span class="money">([\d,]+)<\/span>円/);
        const prizeMoney = prizeMatch ? prizeMatch[1] : '0';

        if (racerId && name) {
          rankings.push({
            rank,
            registrationNumber: racerId,
            name,
            branch,
            rankClass,
            prizeMoney: `¥${prizeMoney}`,
          });
        }
      }

      return rankings;
    } catch (error) {
      console.error('賞金ランキングのパースエラー:', error);
      return [];
    }
  }

  /**
   * ファン投票ランキングをパース
   */
  static parseFanVoteRanking(html) {
    try {
      const rankings = [];
      
      // テーブル行を抽出
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      let match;

      while ((match = rowRegex.exec(html)) !== null) {
        const rowHtml = match[1];
        
        // 登録番号を抽出（4桁の数字）
        const numberMatch = rowHtml.match(/>(\d{4})</);
        if (!numberMatch) continue;
        
        const racerId = numberMatch[1];

        // 氏名を抽出
        const nameMatch = rowHtml.match(/>([\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+)\s*選手</);
        const name = nameMatch ? nameMatch[1].trim() : null;

        // 投票数を抽出（,を除去）
        const voteMatch = rowHtml.match(/([\d,]+)\s*票/);
        const votes = voteMatch ? parseInt(voteMatch[1].replace(/,/g, '')) : 0;

        // 順位を抽出
        const rankMatch = rowHtml.match(/>\s*(\d+)\s*位/);
        const rank = rankMatch ? parseInt(rankMatch[1]) : 0;

        if (racerId && name && votes > 0) {
          rankings.push({
            rank,
            racerId,
            name,
            votes,
          });
        }
      }

      return rankings;
    } catch (error) {
      console.error('ファン投票ランキングのパースエラー:', error);
      return [];
    }
  }

  /**
   * レース一覧をパース
   */
  static parseRaceList(html) {
    try {
      const races = [];
      
      // レースカードを抽出
      const raceCardRegex = /<div[^>]*class="[^"]*race[-_]?card[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
      let match;

      while ((match = raceCardRegex.exec(html)) !== null) {
        const cardHtml = match[1];
        
        // レース名を抽出
        const nameMatch = cardHtml.match(/class="[^"]*race[-_]?name[^"]*">([^<]+)</);
        const raceName = nameMatch ? nameMatch[1].trim() : null;

        // 場名を抽出
        const venueMatch = cardHtml.match(/>(桐生|戸田|江戸川|平和島|多摩川|浜名湖|蒲郡|常滑|津|三国|びわこ|住之江|尼崎|鳴門|丸亀|児島|宮島|徳山|下関|若松|芦屋|福岡|唐津|大村)</);
        const venueName = venueMatch ? venueMatch[1] : null;

        // グレードを抽出
        const gradeMatch = cardHtml.match(/>(SG|G1|G2|G3)/);
        const grade = gradeMatch ? gradeMatch[1] : null;

        // 日付を抽出
        const dateMatch = cardHtml.match(/(\d{1,2})月(\d{1,2})日/g);
        
        if (raceName && venueName && grade) {
          races.push({
            raceName,
            venueName,
            grade,
            dates: dateMatch || [],
          });
        }
      }

      return races;
    } catch (error) {
      console.error('レース一覧のパースエラー:', error);
      return [];
    }
  }
}

// ============================================
// D1 ヘルパー関数
// ============================================

// DB が利用可能か判定
function hasDB(env) {
  return env && env.DB && typeof env.DB.prepare === 'function';
}

// racers + racer_performances を結合して1選手分を取得
async function dbGetRacer(env, racerId) {
  const row = await env.DB.prepare(
    `SELECT r.racer_id, r.name, r.branch, r.rank, r.win_rate, r.avg_start_timing,
            p.sg_wins, p.g1_wins, p.g2_wins, p.general_wins,
            p.total_prize_money, p.prize_ranking,
            p.fan_vote_count, p.fan_vote_ranking
       FROM racers r
       LEFT JOIN racer_performances p ON r.racer_id = p.racer_id
      WHERE r.racer_id = ?`
  ).bind(parseInt(racerId, 10)).first();
  return row || null;
}

// DB行をフロント向けの選手オブジェクトに整形
function mapRacerRow(row) {
  if (!row) return null;
  return {
    id: String(row.racer_id),
    racerId: String(row.racer_id),
    name: (row.name || '').replace(/\s+/g, ' ').trim(),
    branch: row.branch || null,
    rank: row.rank || null,
    winRate: row.win_rate ?? 0,
    avgStartTiming: row.avg_start_timing ?? 0.15,
    sgWins: row.sg_wins ?? 0,
    g1Wins: row.g1_wins ?? 0,
    g2Wins: row.g2_wins ?? 0,
    generalWins: row.general_wins ?? 0,
    totalPrizeMoney: row.total_prize_money ?? 0,
    prizeRanking: row.prize_ranking ?? null,
    fanVotes: row.fan_vote_count ?? 0,
    fanVoteRanking: row.fan_vote_ranking ?? null,
  };
}

// ============================================
// 出走予定（スケジュール）の取得・保存
// ============================================

// boatrace.jp から選手の出走予定をスクレイピング
async function fetchScheduleFromSite(racerId) {
  const html = await fetchHtml(
    `https://www.boatrace.jp/owpc/pc/data/racersearch/profile?toban=${racerId}`
  );
  return HTMLParser.parseSchedule(html);
}

// 出走予定を races / race_entries テーブルに保存
async function saveScheduleToDB(env, racerId, schedule) {
  for (const item of schedule) {
    // race_id を一意に生成（場コード+開催日、無ければ日付+場名）
    const raceId = item.venueCode && item.hd
      ? `${item.venueCode}_${item.hd}`
      : `${(item.date || '').replace(/-/g, '')}_${item.venueName || 'unknown'}`;

    const startDate = item.startDate || item.date || null;
    // 終了日: パース結果のendDateを優先。無ければ開始日+5日（6日間開催）
    let endDate = item.endDate || null;
    if (!endDate && startDate) {
      const dt = new Date(`${startDate}T00:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() + 5);
      endDate = dt.toISOString().slice(0, 10);
    }

    // races に upsert
    await env.DB.prepare(
      `INSERT INTO races (race_id, race_name, venue_name, venue_code, grade, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
       ON CONFLICT(race_id) DO UPDATE SET
         race_name=excluded.race_name,
         venue_name=excluded.venue_name,
         venue_code=excluded.venue_code,
         grade=excluded.grade,
         start_date=excluded.start_date,
         end_date=excluded.end_date,
         updated_at=datetime('now')`
    ).bind(
      raceId,
      item.raceName || '（タイトル未定）',
      item.venueName || '不明',
      item.venueCode || null,
      item.grade || '一般',
      startDate,
      endDate
    ).run();

    // race_entries に upsert（UNIQUE(race_id, racer_id)）
    await env.DB.prepare(
      `INSERT OR IGNORE INTO race_entries (race_id, racer_id) VALUES (?, ?)`
    ).bind(raceId, parseInt(racerId, 10)).run();
  }

  // 同期履歴を記録
  await env.DB.prepare(
    `INSERT INTO sync_history (sync_type, records_count, status, completed_at)
     VALUES ('schedule', ?, 'success', datetime('now'))`
  ).bind(schedule.length).run();
}

// DB から選手の出走予定を取得
async function getScheduleFromDB(env, racerId) {
  const { results } = await env.DB.prepare(
    `SELECT r.race_id, r.race_name, r.venue_name, r.venue_code, r.grade,
            r.start_date, r.end_date
       FROM race_entries e
       JOIN races r ON r.race_id = e.race_id
      WHERE e.racer_id = ?
      ORDER BY r.start_date ASC`
  ).bind(parseInt(racerId, 10)).all();

  return (results || []).map((row) => ({
    raceId: row.race_id,
    raceName: row.race_name,
    venueName: row.venue_name,
    venueCode: row.venue_code,
    grade: row.grade,
    startDate: row.start_date,
    endDate: row.end_date,
  }));
}

// ============================================
// グレード別開催スケジュール（SG/G1/G2/G3一覧）
// ============================================

// boatrace.jp のグレードスケジュールをスクレイピング（hcd: 01=SG/PG1, 02=G1/G2, 03=G3）
async function fetchGradeScheduleFromSite(hcd, refYear) {
  const year = refYear || new Date().getFullYear();
  const html = await fetchHtml(
    `https://www.boatrace.jp/owpc/pc/race/gradesch?hcd=${hcd}`
  );
  return HTMLParser.parseGradeSchedule(html, year);
}

// グレードスケジュールを races テーブルに保存（race_entries は作らない）
async function saveRacesToDB(env, races) {
  for (const item of races) {
    await env.DB.prepare(
      `INSERT INTO races (race_id, race_name, venue_name, venue_code, grade, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
       ON CONFLICT(race_id) DO UPDATE SET
         race_name=excluded.race_name,
         venue_name=excluded.venue_name,
         venue_code=excluded.venue_code,
         grade=excluded.grade,
         start_date=excluded.start_date,
         end_date=excluded.end_date,
         updated_at=datetime('now')`
    ).bind(
      item.raceId,
      item.raceName || '（タイトル未定）',
      item.venueName || '不明',
      item.venueCode || null,
      item.grade || '一般',
      item.startDate,
      item.endDate
    ).run();
  }

  await env.DB.prepare(
    `INSERT INTO sync_history (sync_type, records_count, status, completed_at)
     VALUES ('grade_schedule', ?, 'success', datetime('now'))`
  ).bind(races.length).run();
}

// DB から SG/G1 レース一覧を取得（今日以降・開始日順）
async function getGradeRacesFromDB(env, grades, options = {}) {
  const placeholders = grades.map(() => '?').join(',');
  let sql =
    `SELECT race_id, race_name, venue_name, venue_code, grade, start_date, end_date
       FROM races
      WHERE grade IN (${placeholders})`;
  const binds = [...grades];

  if (options.year) {
    // 指定年度（start_date が YYYY- で始まる）で絞り込み
    sql += ` AND start_date LIKE ?`;
    binds.push(`${options.year}-%`);
  } else if (!options.includePast) {
    // 年度指定が無く、過去を含めない場合は今日以降のみ
    sql += ` AND end_date >= ?`;
    binds.push(new Date().toISOString().slice(0, 10));
  }

  sql += ` ORDER BY start_date ASC`;

  const { results } = await env.DB.prepare(sql).bind(...binds).all();

  return (results || []).map((row) => ({
    raceId: row.race_id,
    raceName: row.race_name,
    venueName: row.venue_name,
    venueCode: row.venue_code,
    grade: row.grade,
    startDate: row.start_date,
    endDate: row.end_date,
  }));
}

// JSON レスポンスのショートカット
function jsonResponse(data, extraHeaders = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

// メインハンドラー
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // OPTIONS リクエスト（CORS プリフライト）
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // 選手情報取得（選手情報 + 出走予定）
    if (path.startsWith('/api/racer/')) {
      const racerId = path.split('/').pop();
      // ?refresh=1 で出走予定を強制再取得
      const forceRefresh = url.searchParams.get('refresh') === '1';

      // まず DB から取得を試みる
      if (hasDB(env)) {
        const row = await dbGetRacer(env, racerId);
        if (row) {
          // 出走予定を DB から取得
          let schedule = await getScheduleFromDB(env, racerId);

          // DBに出走予定が無い、または強制更新時はサイトから取得してDB保存
          if (schedule.length === 0 || forceRefresh) {
            try {
              const scraped = await fetchScheduleFromSite(racerId);
              if (scraped.length > 0) {
                await saveScheduleToDB(env, racerId, scraped);
                schedule = await getScheduleFromDB(env, racerId);
              }
            } catch (e) {
              console.error('出走予定の取得/保存エラー:', e);
              // 失敗してもDBの選手情報は返す
            }
          }

          return jsonResponse(
            { racer: mapRacerRow(row), schedule, source: 'd1' },
            { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' }
          );
        }
      }

      // DB に選手が無ければ boatrace.jp からフォールバック取得
      const response = await fetch(
        `https://www.boatrace.jp/owpc/pc/data/racersearch/season?toban=${racerId}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
      const racerInfo = HTMLParser.parseRacerInfo(html);
      let schedule = [];
      try {
        schedule = await fetchScheduleFromSite(racerId);
      } catch (e) {
        console.error('出走予定取得エラー:', e);
      }

      return jsonResponse({ racer: racerInfo, schedule, source: 'scrape' });
    }

    // 選手成績詳細取得（SG用）
    if (path.startsWith('/api/racer-performance/')) {
      const racerId = path.split('/').pop();

      // DB から取得
      if (hasDB(env)) {
        const row = await dbGetRacer(env, racerId);
        if (row) {
          return jsonResponse(
            mapRacerRow(row),
            { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
          );
        }
      }

      // フォールバック: スクレイピング
      const response = await fetch(
        `https://www.boatrace.jp/owpc/pc/data/racersearch/season?toban=${racerId}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
      const performance = HTMLParser.parseRacerPerformance(html);

      return jsonResponse(performance);
    }

    // 複数選手の成績を一括取得
    if (path === '/api/racer-performances') {
      const racerIds = url.searchParams.get('ids')?.split(',').filter(Boolean) || [];

      if (racerIds.length === 0) {
        return jsonResponse({ error: '選手IDが指定されていません' }, {}, 400);
      }

      // DB から一括取得（高速）
      if (hasDB(env)) {
        const ids = racerIds.map((id) => parseInt(id, 10)).filter((n) => !Number.isNaN(n));
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          const { results } = await env.DB.prepare(
            `SELECT r.racer_id, r.name, r.branch, r.rank, r.win_rate, r.avg_start_timing,
                    p.sg_wins, p.g1_wins, p.g2_wins, p.general_wins,
                    p.total_prize_money, p.prize_ranking,
                    p.fan_vote_count, p.fan_vote_ranking
               FROM racers r
               LEFT JOIN racer_performances p ON r.racer_id = p.racer_id
              WHERE r.racer_id IN (${placeholders})`
          ).bind(...ids).all();

          return jsonResponse(
            { performances: (results || []).map(mapRacerRow), source: 'd1' },
            { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
          );
        }
      }

      // フォールバック: 並列スクレイピング（最大20名）
      const performances = await Promise.all(
        racerIds.slice(0, 20).map(async (racerId) => {
          try {
            const response = await fetch(
              `https://www.boatrace.jp/owpc/pc/data/racersearch/season?toban=${racerId}`,
              {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
              }
            );
            if (!response.ok) return null;
            const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
            return HTMLParser.parseRacerPerformance(html);
          } catch (error) {
            console.error(`選手${racerId}の成績取得エラー:`, error);
            return null;
          }
        })
      );

      return jsonResponse(
        { performances: performances.filter((p) => p !== null), source: 'scrape' },
        { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
      );
    }

    // G1以上のレース一覧取得
    // SG/G1 レース一覧（向こう分の開催予定）
    // 高速化のため D1 を優先。空 or ?refresh=1 のときだけ boatrace.jp から取得しDBに保存
    if (path === '/api/races/g1') {
      const forceRefresh = url.searchParams.get('refresh') === '1';
      const TARGET_GRADES = ['SG', 'G1'];

      try {
        if (hasDB(env)) {
          // 1) まず DB から返す（高速）
          let races = await getGradeRacesFromDB(env, TARGET_GRADES);

          // 2) DBが空 or 強制更新なら boatrace.jp から取得して保存
          if (races.length === 0 || forceRefresh) {
            try {
              const refYear = new Date().getFullYear();
              // hcd=01(SG/PG1) と hcd=02(G1/G2) を取得し、SGとG1だけ抽出
              const [sgList, g1List] = await Promise.all([
                fetchGradeScheduleFromSite('01', refYear),
                fetchGradeScheduleFromSite('02', refYear),
              ]);
              const all = [...sgList, ...g1List].filter((r) => TARGET_GRADES.includes(r.grade));
              if (all.length > 0) {
                await saveRacesToDB(env, all);
                races = await getGradeRacesFromDB(env, TARGET_GRADES);
              }
            } catch (e) {
              console.error('グレードスケジュール同期エラー:', e);
              // 取得に失敗してもDBにある分は返す
            }
          }

          // フロント互換フォーマットに整形（startDate/endDate を ISO 文字列に）
          const formatted = races.map((r) => ({
            raceId: r.raceId,
            raceName: r.raceName,
            venueName: r.venueName,
            venueCode: r.venueCode,
            grade: r.grade,
            startDate: new Date(`${r.startDate}T00:00:00Z`).toISOString(),
            endDate: new Date(`${r.endDate}T00:00:00Z`).toISOString(),
          }));

          return jsonResponse(
            {
              races: formatted,
              source: 'd1',
              message: `SG/G1レース一覧: ${formatted.length}件`,
              updatedAt: new Date().toISOString(),
            },
            { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
          );
        }

        // DBが無い場合はスクレイピングして直接返す
        const refYear = new Date().getFullYear();
        const [sgList, g1List] = await Promise.all([
          fetchGradeScheduleFromSite('01', refYear),
          fetchGradeScheduleFromSite('02', refYear),
        ]);
        const all = [...sgList, ...g1List]
          .filter((r) => TARGET_GRADES.includes(r.grade))
          .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
          .map((r) => ({
            ...r,
            startDate: new Date(`${r.startDate}T00:00:00Z`).toISOString(),
            endDate: new Date(`${r.endDate}T00:00:00Z`).toISOString(),
          }));

        return jsonResponse(
          {
            races: all,
            source: 'boatrace.jp',
            message: `SG/G1レース一覧: ${all.length}件`,
            updatedAt: new Date().toISOString(),
          },
          { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
        );
      } catch (error) {
        console.error('G1レース一覧取得エラー:', error);
        return jsonResponse(
          { races: [], source: 'error', error: error.message },
          {},
          500
        );
      }
    }

    // SG レース一覧（年度指定対応）
    // GET /api/races/sg?year=2026&refresh=1
    //   year 指定でその年度のSGを返す。省略時は今日以降
    if (path === '/api/races/sg') {
      const forceRefresh = url.searchParams.get('refresh') === '1';
      const yearParam = url.searchParams.get('year');
      const year = yearParam ? parseInt(yearParam, 10) : null;
      const TARGET_GRADES = ['SG'];

      try {
        if (hasDB(env)) {
          let races = await getGradeRacesFromDB(env, TARGET_GRADES, { year });

          if (races.length === 0 || forceRefresh) {
            try {
              const refYear = year || new Date().getFullYear();
              // SGは hcd=01 に含まれる
              const sgList = await fetchGradeScheduleFromSite('01', refYear);
              const all = sgList.filter((r) => r.grade === 'SG');
              if (all.length > 0) {
                await saveRacesToDB(env, all);
                races = await getGradeRacesFromDB(env, TARGET_GRADES, { year });
              }
            } catch (e) {
              console.error('SGスケジュール同期エラー:', e);
            }
          }

          const formatted = races.map((r) => ({
            raceId: r.raceId,
            raceName: r.raceName,
            venueName: r.venueName,
            venueCode: r.venueCode,
            grade: r.grade,
            startDate: r.startDate,
            endDate: r.endDate,
          }));

          return jsonResponse(
            {
              races: formatted,
              year: year || null,
              source: 'd1',
              message: `SGレース一覧: ${formatted.length}件`,
              updatedAt: new Date().toISOString(),
            },
            { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
          );
        }

        // DB無し: スクレイピングで直接返す
        const refYear = year || new Date().getFullYear();
        const sgList = await fetchGradeScheduleFromSite('01', refYear);
        const all = sgList
          .filter((r) => r.grade === 'SG')
          .filter((r) => !year || r.startDate.startsWith(`${year}-`))
          .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

        return jsonResponse(
          {
            races: all,
            year: year || null,
            source: 'boatrace.jp',
            message: `SGレース一覧: ${all.length}件`,
            updatedAt: new Date().toISOString(),
          },
          { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
        );
      } catch (error) {
        console.error('SGレース一覧取得エラー:', error);
        return jsonResponse({ races: [], source: 'error', error: error.message }, {}, 500);
      }
    }

    // レース詳細取得
    if (path.startsWith('/api/race/')) {
      const raceId = path.split('/').pop();
      
      // TODO: レース詳細のスクレイピング実装
      return new Response(
        JSON.stringify({
          message: 'レース詳細の取得は実装中です',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 獲得賞金ランキング取得
    if (path === '/api/prize-ranking') {
      // DB から取得（高速・安定）
      if (hasDB(env)) {
        try {
          const { results } = await env.DB.prepare(
            `SELECT r.racer_id, r.name, r.branch, r.rank,
                    p.total_prize_money, p.prize_ranking
               FROM racer_performances p
               JOIN racers r ON r.racer_id = p.racer_id
              WHERE p.prize_ranking IS NOT NULL
              ORDER BY p.prize_ranking ASC`
          ).all();

          const rankings = (results || []).map((row) => ({
            rank: row.prize_ranking,
            racerId: String(row.racer_id),
            name: (row.name || '').replace(/\s+/g, ' ').trim(),
            branch: row.branch || null,
            class: row.rank || null,
            prizeMoney: row.total_prize_money ?? 0,
          }));

          return jsonResponse(
            { rankings, source: 'd1', updatedAt: new Date().toISOString() },
            { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
          );
        } catch (e) {
          console.error('DB賞金ランキング取得エラー:', e);
          // 失敗時はスクレイピングにフォールバック
        }
      }

      try {
        // 公式サイトから獲得賞金ランキングを取得
        const response = await fetch(
          'https://www.boatrace-grandprix.jp/2026/rtg/sp/ranking.php',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
        const rankings = HTMLParser.parsePrizeRanking(html);

        return new Response(
          JSON.stringify({
            rankings,
            source: 'boatrace-grandprix.jp',
            updatedAt: new Date().toISOString(),
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1時間キャッシュ
            },
          }
        );
      } catch (error) {
        console.error('賞金ランキング取得エラー:', error);
        return new Response(
          JSON.stringify({ error: '賞金ランキングの取得に失敗しました', rankings: [] }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // ファン投票ランキング取得
    if (path === '/api/fan-vote-ranking') {
      try {
        // マクールからファン投票ランキングを取得
        const response = await fetch(
          'https://sp.macour.jp/allstars',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
        const rankings = HTMLParser.parseFanVoteRanking(html);

        return new Response(
          JSON.stringify({
            rankings,
            source: 'sp.macour.jp',
            updatedAt: new Date().toISOString(),
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=1800, s-maxage=1800', // 30分キャッシュ（投票は変動が激しいため）
            },
          }
        );
      } catch (error) {
        console.error('ファン投票ランキング取得エラー:', error);
        return new Response(
          JSON.stringify({ error: 'ファン投票ランキングの取得に失敗しました', rankings: [] }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // 選手検索（登録番号 or 氏名）
    if (path === '/api/search') {
      const query = (url.searchParams.get('q') || '').trim();

      if (!query) {
        return jsonResponse({ error: '検索クエリが指定されていません' }, {}, 400);
      }

      // DB から検索（登録番号 or 名前部分一致）
      if (hasDB(env)) {
        try {
          const isNumeric = /^\d+$/.test(query);
          // 名前検索用: スペースを除去した状態でも一致するようにパターン化
          const namePattern = '%' + query.split('').join('%') + '%';

          let stmt;
          if (isNumeric) {
            stmt = env.DB.prepare(
              `SELECT r.racer_id, r.name, r.branch, r.rank, r.win_rate, r.avg_start_timing,
                      p.sg_wins, p.g1_wins, p.g2_wins, p.general_wins,
                      p.total_prize_money, p.prize_ranking,
                      p.fan_vote_count, p.fan_vote_ranking
                 FROM racers r
                 LEFT JOIN racer_performances p ON r.racer_id = p.racer_id
                WHERE r.racer_id = ? OR REPLACE(r.name, ' ', '') LIKE ?
                LIMIT 30`
            ).bind(parseInt(query, 10), namePattern);
          } else {
            stmt = env.DB.prepare(
              `SELECT r.racer_id, r.name, r.branch, r.rank, r.win_rate, r.avg_start_timing,
                      p.sg_wins, p.g1_wins, p.g2_wins, p.general_wins,
                      p.total_prize_money, p.prize_ranking,
                      p.fan_vote_count, p.fan_vote_ranking
                 FROM racers r
                 LEFT JOIN racer_performances p ON r.racer_id = p.racer_id
                WHERE REPLACE(r.name, ' ', '') LIKE ? OR r.name LIKE ?
                LIMIT 30`
            ).bind(namePattern, '%' + query + '%');
          }

          const { results } = await stmt.all();
          if (results && results.length > 0) {
            return jsonResponse(
              { results: results.map(mapRacerRow), source: 'd1' },
              { 'Cache-Control': 'public, max-age=600, s-maxage=600' }
            );
          }
          // DBにヒットなしで数値クエリならスクレイピングへ、それ以外は空で返す
          if (!isNumeric) {
            return jsonResponse({ results: [], source: 'd1' });
          }
        } catch (e) {
          console.error('DB検索エラー:', e);
        }
      }

      // フォールバック: 選手番号でスクレイピング
      const response = await fetch(
        `https://www.boatrace.jp/owpc/pc/data/racersearch/season?toban=${query}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      if (!response.ok) {
        return jsonResponse({ results: [] });
      }

      const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
      const racerInfo = HTMLParser.parseRacerInfo(html);

      return jsonResponse({ results: racerInfo ? [racerInfo] : [], source: 'scrape' });
    }

    // SGレースの出場選手一覧を boatrace.jp から取得
    // GET /api/sg-entries?jcd=14&hd=20260623
    //   jcd: 場コード / hd: 開催初日(YYYYMMDD)
    // 出場選手が発表済みなら実データ、未発表なら entries:[] + announced:false を返す
    if (path === '/api/sg-entries') {
      const jcd = url.searchParams.get('jcd');
      const hd = url.searchParams.get('hd');
      if (!jcd || !hd) {
        return jsonResponse({ error: 'jcd と hd が必要です', entries: [] }, {}, 400);
      }
      try {
        const html = await fetchHtml(
          `https://www.boatrace.jp/owpc/pc/race/raceindex?jcd=${jcd}&hd=${hd}`
        );
        const entries = HTMLParser.parseRaceEntries(html);
        // CDNエッジで1時間キャッシュ（名前付きの完全なレスポンスをそのままキャッシュ）
        // 2回目以降のアクセスはエッジから即返るためスクレイピング待ちが発生しない
        return jsonResponse(
          {
            entries,
            announced: entries.length > 0,
            count: entries.length,
            jcd,
            hd,
            source: 'boatrace.jp',
            updatedAt: new Date().toISOString(),
          },
          { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
        );
      } catch (e) {
        console.error('出場選手取得エラー:', e);
        return jsonResponse({ entries: [], announced: false, error: e.message }, {}, 500);
      }
    }

    // SG選出候補一覧（賞金ランキング順、DBから）
    if (path === '/api/sg-candidates') {
      if (hasDB(env)) {
        try {
          const { results } = await env.DB.prepare(
            `SELECT r.racer_id, r.name, r.branch, r.rank, r.win_rate, r.avg_start_timing,
                    p.sg_wins, p.g1_wins, p.g2_wins, p.general_wins,
                    p.total_prize_money, p.prize_ranking,
                    p.fan_vote_count, p.fan_vote_ranking
               FROM racers r
               LEFT JOIN racer_performances p ON r.racer_id = p.racer_id
              WHERE p.prize_ranking IS NOT NULL
              ORDER BY p.prize_ranking ASC`
          ).all();

          return jsonResponse(
            { candidates: (results || []).map(mapRacerRow), source: 'd1' },
            { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
          );
        } catch (e) {
          console.error('SG候補取得エラー:', e);
          return jsonResponse({ error: 'SG候補の取得に失敗しました', candidates: [] }, {}, 500);
        }
      }
      return jsonResponse({ candidates: [], source: 'none' });
    }

    // 全選手の出走予定を一括取得してDBに保存
    // GET /api/sync-all-schedules?limit=20&offset=0
    //   limit: 1回で処理する選手数（既定20, 最大30）
    //   offset: 開始位置（ページング用）
    // サブリクエスト/CPU時間制限のため分割実行し、next_offset を返す
    if (path === '/api/sync-all-schedules') {
      if (!hasDB(env)) {
        return jsonResponse({ error: 'DBが利用できません' }, {}, 503);
      }
      try {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 30);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);

        // 全選手数を取得
        const totalRow = await env.DB.prepare(
          `SELECT COUNT(*) AS cnt FROM racers`
        ).first();
        const total = totalRow ? totalRow.cnt : 0;

        // 対象選手をページングで取得
        const { results: racers } = await env.DB.prepare(
          `SELECT racer_id FROM racers ORDER BY racer_id ASC LIMIT ? OFFSET ?`
        ).bind(limit, offset).all();

        let processed = 0;
        let savedRaces = 0;
        const errors = [];

        for (const r of racers || []) {
          const rid = String(r.racer_id);
          try {
            const scraped = await fetchScheduleFromSite(rid);
            if (scraped.length > 0) {
              await saveScheduleToDB(env, rid, scraped);
              savedRaces += scraped.length;
            }
            processed++;
          } catch (e) {
            errors.push({ racerId: rid, error: e.message });
          }
        }

        const nextOffset = offset + (racers ? racers.length : 0);
        const done = nextOffset >= total;

        return jsonResponse({
          ok: true,
          total,
          offset,
          limit,
          processed,
          savedRaces,
          nextOffset: done ? null : nextOffset,
          done,
          errors,
        });
      } catch (e) {
        console.error('全選手スケジュール同期エラー:', e);
        return jsonResponse({ error: '同期に失敗しました', message: e.message }, {}, 500);
      }
    }

    // ルートが見つからない
    return jsonResponse({ error: 'エンドポイントが見つかりません' }, {}, 404);
  } catch (error) {
    console.error('エラー:', error);
    return jsonResponse(
      { error: 'サーバーエラーが発生しました', message: error.message },
      {},
      500
    );
  }
}

// Cloudflare Workers のエントリーポイント（ES Modules 形式: env.DB に対応）
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};
