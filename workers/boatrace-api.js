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

      // 獲得賞金（推定）
      performance.totalPrizeMoney = performance.sgWins * 3800 + 
                                    performance.g1Wins * 1200 + 
                                    performance.g2Wins * 600 + 
                                    performance.generalWins * 100;

      // 賞金ランキング（推定）
      performance.prizeRanking = 0; // 実際のランキングは別途取得が必要

      // SG成績
      performance.sgAppearances = performance.sgWins * 5; // 推定
      performance.sgFinalAppearances = performance.sgWins * 3; // 推定
      performance.sgPoints = performance.sgFinalAppearances * 8; // 推定

      // G2以上の成績（推定）
      performance.g2PlusPoints = (performance.sgWins + performance.g1Wins + performance.g2Wins) * 10;
      performance.g2PlusFinalPoints = performance.g2PlusPoints * 10;

      // ファン投票（推定: 人気選手ほど高い）
      if (performance.rank === 'A1' && performance.sgWins > 5) {
        performance.fanVotes = 20000 + performance.sgWins * 3000;
      } else if (performance.rank === 'A1') {
        performance.fanVotes = 5000 + performance.g1Wins * 1000;
      } else {
        performance.fanVotes = 0;
      }

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

// メインハンドラー
async function handleRequest(request) {
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
      
      // boatrace.jpから選手情報を取得
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

      return new Response(
        JSON.stringify({
          racer: racerInfo,
          schedule: schedule,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 選手成績詳細取得（SG用）
    if (path.startsWith('/api/racer-performance/')) {
      const racerId = path.split('/').pop();
      
      // boatrace.jpから選手成績を取得
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

      return new Response(
        JSON.stringify(performance),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 複数選手の成績を一括取得
    if (path === '/api/racer-performances') {
      const racerIds = url.searchParams.get('ids')?.split(',') || [];
      
      if (racerIds.length === 0) {
        return new Response(
          JSON.stringify({ error: '選手IDが指定されていません' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // 並列で複数選手の成績を取得
      const performances = await Promise.all(
        racerIds.slice(0, 20).map(async (racerId) => { // 最大20名まで
          try {
            const response = await fetch(
              `https://www.boatrace.jp/owpc/pc/data/racersearch/season?toban=${racerId}`,
              {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
              }
            );

            if (!response.ok) {
              return null;
            }

            const html = await response.text();
            return HTMLParser.parseRacerPerformance(html);
          } catch (error) {
            console.error(`選手${racerId}の成績取得エラー:`, error);
            return null;
          }
        })
      );

      return new Response(
        JSON.stringify({
          performances: performances.filter(p => p !== null),
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // G1以上のレース一覧取得
    if (path === '/api/races/g1') {
      // boatrace.jpからレース情報を取得
      const response = await fetch(
        `https://www.boatrace.jp/owpc/pc/race/index?jyo=24`,
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
      const races = HTMLParser.parseRaceList(html);

      return new Response(
        JSON.stringify({
          races: races.filter(r => r.grade === 'SG' || r.grade === 'G1'),
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
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

    // 選手検索
    if (path === '/api/search') {
      const query = url.searchParams.get('q');
      
      if (!query) {
        return new Response(
          JSON.stringify({ error: '検索クエリが指定されていません' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // 選手番号で検索
      const response = await fetch(
        `https://www.boatrace.jp/owpc/pc/data/racersearch/season?toban=${query}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ results: [] }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const html = await response.text();
      const racerInfo = HTMLParser.parseRacerInfo(html);

      return new Response(
        JSON.stringify({
          results: racerInfo ? [racerInfo] : [],
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // ルートが見つからない
    return new Response(
      JSON.stringify({ error: 'エンドポイントが見つかりません' }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('エラー:', error);
    return new Response(
      JSON.stringify({
        error: 'サーバーエラーが発生しました',
        message: error.message,
      }),
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

// Cloudflare Workers のエントリーポイント
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
