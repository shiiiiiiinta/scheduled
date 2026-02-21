import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SG_SCHEDULE_2026 } from '../types/sg';
import { SG_QUALIFICATION_CRITERIA, evaluateQualification, getQualifiedWithMargin } from '../utils/sgQualification';
import type { SGRaceType, QualificationResult } from '../types/sg';
import { boatraceAPI } from '../api/boatrace';

// モックデータ（フォールバック用）
import { getMockRacerPerformances } from '../api/mockData';

export default function SGDetailPage() {
  const { sgType } = useParams<{ sgType: string }>();
  const [qualificationResults, setQualificationResults] = useState<QualificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [prizeRankingMap, setPrizeRankingMap] = useState<Map<string, { rank: number; prizeMoney: number }>>(new Map());
  const [fanVoteMap, setFanVoteMap] = useState<Map<string, { rank: number; votes: number }>>(new Map());

  const sgTypeUpper = sgType?.toUpperCase() as SGRaceType;
  const race = SG_SCHEDULE_2026.find((r) => r.type === sgTypeUpper);
  const criteria = race ? SG_QUALIFICATION_CRITERIA[race.type] : null;

  // 初回ロード：主要選手のみ
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // 賞金ランキングとファン投票ランキングを取得
        const [prizeRanking, fanVoteRanking] = await Promise.all([
          boatraceAPI.getPrizeRanking(),
          boatraceAPI.getFanVoteRanking(),
        ]);

        // Mapに変換
        const prizeMap = new Map(
          prizeRanking.map((r) => [
            r.racerId,
            { rank: r.rank, prizeMoney: r.prizeMoney },
          ])
        );
        const voteMap = new Map(
          fanVoteRanking.map((r) => [
            r.racerId,
            { rank: r.rank, votes: r.votes },
          ])
        );

        setPrizeRankingMap(prizeMap);
        setFanVoteMap(voteMap);

        // 🎯 初回は主要選手のみ（5名）
        const topRacerIds = ['4320', '4444', '3960', '4166', '4024'];

        // Worker APIから主要選手の成績を取得
        const performances = await boatraceAPI.getRacerPerformances(topRacerIds);
        
        // 公式データで賞金と投票を上書き
        performances.forEach((p) => {
          const prize = prizeMap.get(p.racerId);
          const vote = voteMap.get(p.racerId);
          if (prize) {
            p.totalPrizeMoney = prize.prizeMoney;
            p.prizeRanking = prize.rank;
          }
          if (vote) {
            p.fanVotes = vote.votes;
          }
        });

        // データが取得できなかった場合はモックデータを使用
        let racerPerformances = performances;
        if (racerPerformances.length === 0) {
          console.warn('本番データの取得に失敗したため、モックデータを使用します');
          racerPerformances = getMockRacerPerformances();
        }

        const results = evaluateQualification(racerPerformances, sgTypeUpper);
        setQualificationResults(results);
        setInitialLoadComplete(true);
      } catch (error) {
        console.error('データ取得エラー:', error);
        // エラー時はモックデータを使用
        const racerPerformances = getMockRacerPerformances();
        const results = evaluateQualification(racerPerformances, sgTypeUpper);
        setQualificationResults(results);
        setInitialLoadComplete(true);
      } finally {
        setLoading(false);
      }
    };

    if (race) {
      fetchInitialData();
    }
  }, [race, sgTypeUpper]);

  // 全選手データを読み込む
  const loadAllRacers = async () => {
    setLoadingMore(true);
    try {
      // A1級上位70名を想定
      const racerIds = Array.from({ length: 70 }, (_, i) => `${5000 + i}`);
      const topRacerIds = ['4320', '4444', '3960', '4166', '4024'];
      const allIds = [...topRacerIds, ...racerIds];

      // Worker APIから選手成績を取得（最大20名ずつ）
      const batchSize = 20;
      let racerPerformances = [];
      
      for (let i = 0; i < allIds.length; i += batchSize) {
        const batch = allIds.slice(i, i + batchSize);
        try {
          const performances = await boatraceAPI.getRacerPerformances(batch);
          // 公式データで賞金と投票を上書き
          performances.forEach((p) => {
            const prize = prizeRankingMap.get(p.racerId);
            const vote = fanVoteMap.get(p.racerId);
            if (prize) {
              p.totalPrizeMoney = prize.prizeMoney;
              p.prizeRanking = prize.rank;
            }
            if (vote) {
              p.fanVotes = vote.votes;
            }
          });
          racerPerformances.push(...performances);
        } catch (error) {
          console.error(`バッチ${i / batchSize + 1}の取得に失敗:`, error);
        }
      }

      // データが取得できなかった場合はモックデータを使用
      if (racerPerformances.length === 0) {
        console.warn('本番データの取得に失敗したため、モックデータを使用します');
        racerPerformances = getMockRacerPerformances();
      }

      const results = evaluateQualification(racerPerformances, sgTypeUpper);
      setQualificationResults(results);
      setShowAll(true);
    } catch (error) {
      console.error('全選手データ取得エラー:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!race || !criteria) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">SGレースが見つかりません</h1>
          <Link to="/sg" className="text-blue-600 hover:underline">
            SG一覧へ戻る
          </Link>
        </div>
      </div>
    );
  }

  // ボーダーライン+10位までを取得
  const displayResults = showAll
    ? qualificationResults
    : getQualifiedWithMargin(qualificationResults, 10);

  const qualifiedCount = qualificationResults.filter((r) => r.qualified).length;
  const borderlineCount = displayResults.length - qualifiedCount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{race.fullName}</h1>
              <p className="text-red-100">
                {new Date(race.startDate).toLocaleDateString('ja-JP')} ～{' '}
                {new Date(race.endDate).toLocaleDateString('ja-JP')} @ {race.venue}
              </p>
            </div>
            <Link
              to="/sg"
              className="px-6 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold"
            >
              ← SG一覧
            </Link>
          </div>

          {/* 優勝賞金 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-block">
            <div className="text-red-100 text-sm mb-1">優勝賞金</div>
            <div className="text-3xl font-bold">
              {race.prizeMoney.toLocaleString()}
              <span className="text-xl ml-1">万円</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* 出場資格基準 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            出場資格基準
          </h2>

          <div className="mb-4">
            <div className="text-gray-600 font-semibold mb-2">選考期間</div>
            <div className="text-gray-800">{criteria.selectionPeriod}</div>
          </div>

          <div className="mb-4">
            <div className="text-gray-600 font-semibold mb-2">総出場枠</div>
            <div className="text-2xl font-bold text-red-600">{criteria.totalSlots}名</div>
          </div>

          <div>
            <div className="text-gray-600 font-semibold mb-3">選出基準</div>
            <div className="space-y-2">
              {criteria.criteria.map((c, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                    {c.priority}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{c.description}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      選出方法: {c.method}
                      {typeof c.slots === 'number' && ` / 枠数: ${c.slots}名`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 過去のボーダーライン */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2">過去のボーダーライン</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {criteria.borderlineHistory.map((history) => (
                <div key={history.year} className="text-sm">
                  <span className="font-semibold text-blue-800">{history.year}年:</span>
                  <span className="text-blue-700 ml-1">{history.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 選出順位一覧 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4">
            <h2 className="text-2xl font-bold text-white flex items-center justify-between">
              <span>選出順位一覧</span>
              <span className="text-sm font-normal">
                資格者: {qualifiedCount}名 / ボーダー付近: +{borderlineCount}名
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-red-600"></div>
              <p className="mt-4 text-gray-600">主要選手のデータを読み込み中...</p>
              <p className="mt-2 text-sm text-gray-500">※高速表示のため、まず主要選手のみを表示します</p>
            </div>
          ) : (
            <>
              {/* 初回表示メッセージ */}
              {!showAll && initialLoadComplete && qualificationResults.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        🚀 高速表示モード：現在、主要選手（約5名）のみを表示しています
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        全選手（約70名）のデータを表示するには、下記の「全選手のデータを表示」ボタンをクリックしてください
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">順位</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">選手名</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">級別</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">支部</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">獲得賞金</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">ファン投票</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">選出理由</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">資格</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayResults.map((result, index) => {
                      const isQualified = result.qualified;
                      const isBorderline = !isQualified && index < displayResults.length;
                      const rowClass = isQualified
                        ? index < 3
                          ? 'bg-yellow-50'
                          : 'bg-white hover:bg-gray-50'
                        : 'bg-gray-100 hover:bg-gray-200';

                      return (
                        <tr key={result.racerId} className={rowClass}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {index < 3 && isQualified && (
                                <span className="text-2xl">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              )}
                              <span className="font-bold text-lg text-gray-800">{result.rank}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              to={`/racer/${result.racerId}`}
                              className="text-blue-600 hover:underline font-semibold"
                            >
                              {result.racer.name}
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                              {result.racer.rank}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-700">{result.racer.branch}</td>
                          <td className="px-4 py-4 text-right">
                            {prizeRankingMap.has(result.racerId) ? (
                              <div className="text-sm">
                                <div className="font-bold text-green-700">
                                  ¥{prizeRankingMap.get(result.racerId)?.prizeMoney.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ({prizeRankingMap.get(result.racerId)?.rank}位)
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {fanVoteMap.has(result.racerId) ? (
                              <div className="text-sm">
                                <div className="font-bold text-purple-700">
                                  {fanVoteMap.get(result.racerId)?.votes.toLocaleString()}票
                                </div>
                                <div className="text-xs text-gray-500">
                                  ({fanVoteMap.get(result.racerId)?.rank}位)
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-600">
                            {result.qualificationReason}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {isQualified ? (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                                資格あり
                              </span>
                            ) : isBorderline ? (
                              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                                ボーダー付近
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">
                                圏外
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 全表示ボタン */}
              {!showAll && initialLoadComplete && (
                <div className="p-6 text-center border-t border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                  <p className="text-gray-700 mb-4">
                    現在、主要選手のみを表示しています。全選手のデータを表示するには下記ボタンをクリックしてください。
                  </p>
                  <button
                    onClick={loadAllRacers}
                    disabled={loadingMore}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {loadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>読み込み中...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>全選手のデータを表示（約70名）</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    ※データ取得に数秒かかる場合があります
                  </p>
                </div>
              )}
              {showAll && qualificationResults.length > displayResults.length && (
                <div className="p-6 text-center border-t border-gray-200">
                  <button
                    onClick={() => setShowAll(true)}
                    className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                  >
                    全選手を表示（残り{qualificationResults.length - displayResults.length}名）
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 注意事項 */}
        <div className="mt-8 bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <h4 className="text-yellow-900 font-bold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            注意事項
          </h4>
          <ul className="text-yellow-800 text-sm space-y-1">
            <li>• 上記は選出順位のシミュレーションです（実際の選出とは異なる場合があります）</li>
            <li>• 獲得賞金は公式サイト（boatrace-grandprix.jp）から最新データを取得しています</li>
            <li>• ファン投票は投票サイト（macour.jp）から最新データを取得しています</li>
            <li>• フライング等の事故により出場資格を喪失する場合があります</li>
            <li>• シード権保持者は選出順位に関わらず優先的に出場できます</li>
            <li>• 最新の公式情報は BOAT RACE オフィシャルサイトをご確認ください</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
