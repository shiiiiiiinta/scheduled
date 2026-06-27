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
   * 出走予定をパース
   */
  static parseSchedule(html) {
    try {
      const races = [];
      
      // テーブル行を抽出
      const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      let match;

      while ((match = tableRowRegex.exec(html)) !== null) {
        const rowHtml = match[1];
        
        // 日付を抽出
        const dateMatch = rowHtml.match(/(\d{1,2})月(\d{1,2})日/);
        if (!dateMatch) continue;

        // 場名を抽出
        const venueMatch = rowHtml.match(/>(桐生|戸田|江戸川|平和島|多摩川|浜名湖|蒲郡|常滑|津|三国|びわこ|住之江|尼崎|鳴門|丸亀|児島|宮島|徳山|下関|若松|芦屋|福岡|唐津|大村)</);
        const venueName = venueMatch ? venueMatch[1] : null;

        // グレードを抽出
        const gradeMatch = rowHtml.match(/>(SG|G1|G2|G3|一般)</);
        const grade = gradeMatch ? gradeMatch[1] : '一般';

        if (venueName) {
          races.push({
            date: `${dateMatch[1]}/${dateMatch[2]}`,
            venueName,
            grade,
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
    // 選手情報取得
    if (path.startsWith('/api/racer/')) {
      const racerId = path.split('/').pop();

      // まず DB から取得を試みる
      if (hasDB(env)) {
        const row = await dbGetRacer(env, racerId);
        if (row) {
          return jsonResponse(
            { racer: mapRacerRow(row), schedule: [], source: 'd1' },
            { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }
          );
        }
      }

      // DB に無ければ boatrace.jp からフォールバック取得
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

      const html = await response.text();
      const racerInfo = HTMLParser.parseRacerInfo(html);
      const schedule = HTMLParser.parseSchedule(html);

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

      const html = await response.text();
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
            const html = await response.text();
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
    if (path === '/api/races/g1') {
      try {
        const races = [];
        const now = new Date();
        const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
        
        // SG・PG1スケジュール取得
        const sgResponse = await fetch(
          'https://www.boatrace.jp/owpc/pc/race/gradesch?hcd=01',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          }
        );
        
        if (sgResponse.ok) {
          const sgHtml = await sgResponse.text();
          
          // テーブル行ごとに処理
          const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
          const rows = [...sgHtml.matchAll(rowRegex)];
          
          for (const row of rows) {
            const rowHtml = row[1];
            
            // 日付を抽出
            const dateMatch = rowHtml.match(/<td class="td_date">(\d{2})\/(\d{2})-(\d{2})\/(\d{2})<\/td>/);
            if (!dateMatch) continue;
            
            const [_, startMonth, startDay, endMonth, endDay] = dateMatch;
            
            // 場所を抽出
            const venueMatch = rowHtml.match(/<img[^>]*alt="([^"]+)"[^>]*src="\/static_extra\/pc\/images\/text_place/);
            if (!venueMatch) continue;
            const venueName = venueMatch[1];
            
            // レース名を抽出
            const nameMatch = rowHtml.match(/<td class="is-p10-10 is-alignL"><a[^>]*>([^<]+)<\/a>/);
            if (!nameMatch) continue;
            const raceName = nameMatch[1];
            
            // SGかチェック（is-G1aがある）
            if (!rowHtml.includes('is-G1a')) continue;
            
            const year = now.getFullYear();
            const startDate = new Date(year, parseInt(startMonth) - 1, parseInt(startDay));
            const endDate = new Date(year, parseInt(endMonth) - 1, parseInt(endDay));
            
            // 向こう3ヶ月以内のみ
            if (startDate >= now && startDate <= threeMonthsLater) {
              races.push({
                raceName: raceName.trim(),
                venueName: venueName.trim(),
                grade: 'SG',
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
              });
            }
          }
        }
        
        // G1スケジュール取得
        const g1Response = await fetch(
          'https://www.boatrace.jp/owpc/pc/race/gradesch?hcd=02',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          }
        );
        
        if (g1Response.ok) {
          const g1Html = await g1Response.text();
          
          // テーブル行ごとに処理
          const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
          const rows = [...g1Html.matchAll(rowRegex)];
          
          for (const row of rows) {
            const rowHtml = row[1];
            
            // 日付を抽出
            const dateMatch = rowHtml.match(/<td class="td_date">(\d{2})\/(\d{2})-(\d{2})\/(\d{2})<\/td>/);
            if (!dateMatch) continue;
            
            const [_, startMonth, startDay, endMonth, endDay] = dateMatch;
            
            // 場所を抽出
            const venueMatch = rowHtml.match(/<img[^>]*alt="([^"]+)"[^>]*src="\/static_extra\/pc\/images\/text_place/);
            if (!venueMatch) continue;
            const venueName = venueMatch[1];
            
            // レース名を抽出
            const nameMatch = rowHtml.match(/<td class="is-p10-10 is-alignL"><a[^>]*>([^<]+)<\/a>/);
            if (!nameMatch) continue;
            const raceName = nameMatch[1];
            
            // G1かチェック（is-G1bがある）
            if (!rowHtml.includes('is-G1b')) continue;
            
            const year = now.getFullYear();
            const startDate = new Date(year, parseInt(startMonth) - 1, parseInt(startDay));
            const endDate = new Date(year, parseInt(endMonth) - 1, parseInt(endDay));
            
            // 向こう3ヶ月以内のみ
            if (startDate >= now && startDate <= threeMonthsLater) {
              races.push({
                raceName: raceName.trim(),
                venueName: venueName.trim(),
                grade: 'G1',
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
              });
            }
          }
        }
        
        // 開始日でソート
        races.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        return new Response(
          JSON.stringify({
            races,
            source: 'boatrace.jp',
            message: `SG/G1レース一覧（向こう3ヶ月）: ${races.length}件`,
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
        console.error('G1レース一覧取得エラー:', error);
        // エラー時はモックデータを返す
        const mockRaces = [
          {
            raceName: '第32回グランドチャンピオン決定戦',
            venueName: '福岡',
            grade: 'SG',
            startDate: new Date(2026, 2, 1).toISOString(),
            endDate: new Date(2026, 2, 6).toISOString(),
          },
          {
            raceName: '第71回ボートレースクラシック',
            venueName: '平和島',
            grade: 'SG',
            startDate: new Date(2026, 2, 20).toISOString(),
            endDate: new Date(2026, 2, 25).toISOString(),
          },
        ];
        
        return new Response(
          JSON.stringify({
            races: mockRaces,
            source: 'mock',
            message: 'スクレイピングに失敗したためモックデータを返しています',
            error: error.message,
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
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

        const html = await response.text();
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

        const html = await response.text();
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

      const html = await response.text();
      const racerInfo = HTMLParser.parseRacerInfo(html);

      return jsonResponse({ results: racerInfo ? [racerInfo] : [], source: 'scrape' });
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
