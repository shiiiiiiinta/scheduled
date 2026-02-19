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

    // G1以上のレース一覧取得
    if (path === '/api/races/g1') {
      // 現在の年月を取得
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

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
          JSON.stringify({ error: '検索クエリが必要です' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // TODO: 選手検索のスクレイピング実装
      return new Response(
        JSON.stringify({
          message: '選手検索は実装中です',
          query: query,
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

// イベントリスナー
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
