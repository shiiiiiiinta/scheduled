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
      
      // テーブル行を抽出（登録番号、氏名、支部、獲得賞金を含む行）
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      let match;

      while ((match = rowRegex.exec(html)) !== null) {
        const rowHtml = match[1];
        
        // 登録番号を抽出
        const numberMatch = rowHtml.match(/登録番号[：:]?\s*(\d{4})/);
        if (!numberMatch) continue;
        
        const racerId = numberMatch[1];

        // 氏名を抽出
        const nameMatch = rowHtml.match(/氏名[：:]?\s*([^<\s]+)/);
        const name = nameMatch ? nameMatch[1].trim() : null;

        // 獲得賞金を抽出（¥記号や,を除去）
        const prizeMatch = rowHtml.match(/([\d,]+)\s*円/);
        const prizeMoney = prizeMatch ? parseInt(prizeMatch[1].replace(/,/g, '')) : 0;

        // 順位を抽出
        const rankMatch = rowHtml.match(/>\s*(\d+)\s*</);
        const rank = rankMatch ? parseInt(rankMatch[1]) : 0;

        if (racerId && name && prizeMoney > 0) {
          rankings.push({
            rank,
            racerId,
            name,
            prizeMoney,
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
            'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1時間キャッシュ
          },
        }
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
          // 日付、場所、レース名を抽出
          const dateRegex = /<td class="td_date">(\d{2})\/(\d{2})-(\d{2})\/(\d{2})<\/td>/g;
          const venueRegex = /<img[^>]*alt="([^"]+)"[^>]*src="\/static_extra\/pc\/images\/text_place/g;
          const nameRegex = /<td class="is-p10-10 is-alignL"><a[^>]*>([^<]+)<\/a>/g;
          const gradeRegex = /<td class="is-p10-0\s+is-G1a"><\/td>/g;
          
          const dates = [...sgHtml.matchAll(dateRegex)];
          const venues = [...sgHtml.matchAll(venueRegex)];
          const names = [...sgHtml.matchAll(nameRegex)];
          
          for (let i = 0; i < Math.min(dates.length, venues.length, names.length); i++) {
            const [_, startMonth, startDay, endMonth, endDay] = dates[i];
            const venueName = venues[i][1];
            const raceName = names[i][1];
            
            const year = now.getFullYear();
            const startDate = new Date(year, parseInt(startMonth) - 1, parseInt(startDay));
            const endDate = new Date(year, parseInt(endMonth) - 1, parseInt(endDay));
            
            // 向こう3ヶ月以内のみ
            if (startDate >= now && startDate <= threeMonthsLater) {
              races.push({
                raceName,
                venueName,
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
          const dateRegex = /<td class="td_date">(\d{2})\/(\d{2})-(\d{2})\/(\d{2})<\/td>/g;
          const venueRegex = /<img[^>]*alt="([^"]+)"[^>]*src="\/static_extra\/pc\/images\/text_place/g;
          const nameRegex = /<td class="is-p10-10 is-alignL"><a[^>]*>([^<]+)<\/a>/g;
          const gradeRegex = /<td class="is-p10-0\s+is-G1b"><\/td>/g;
          
          const dates = [...g1Html.matchAll(dateRegex)];
          const venues = [...g1Html.matchAll(venueRegex)];
          const names = [...g1Html.matchAll(nameRegex)];
          const grades = [...g1Html.matchAll(gradeRegex)];
          
          let g1Count = 0;
          for (let i = 0; i < dates.length && g1Count < grades.length; i++) {
            const [_, startMonth, startDay, endMonth, endDay] = dates[i];
            const venueName = venues[i][1];
            const raceName = names[i][1];
            
            const year = now.getFullYear();
            const startDate = new Date(year, parseInt(startMonth) - 1, parseInt(startDay));
            const endDate = new Date(year, parseInt(endMonth) - 1, parseInt(endDay));
            
            // G1かどうかチェック（is-G1bがある行）
            const rowStartIndex = g1Html.indexOf(dates[i][0]);
            const nextRowIndex = g1Html.indexOf('<tr>', rowStartIndex + 1);
            const rowHtml = g1Html.substring(rowStartIndex, nextRowIndex > rowStartIndex ? nextRowIndex : rowStartIndex + 500);
            
            if (rowHtml.includes('is-G1b')) {
              // 向こう3ヶ月以内のみ
              if (startDate >= now && startDate <= threeMonthsLater) {
                races.push({
                  raceName,
                  venueName,
                  grade: 'G1',
                  startDate: startDate.toISOString(),
                  endDate: endDate.toISOString(),
                });
              }
              g1Count++;
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
