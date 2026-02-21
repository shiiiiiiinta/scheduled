import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SG_SCHEDULE_2026 } from '../types/sg';
import { SG_QUALIFICATION_CRITERIA, evaluateQualification, getQualifiedWithMargin } from '../utils/sgQualification';
import type { SGRaceType, QualificationResult } from '../types/sg';
import { boatraceAPI } from '../api/boatrace';

// モックデータ（フォールバック用）
import { getMockRacerPerformances } from '../api/mockData';

export default function SGDetailPage() {
  const { sgType } = useParams<{ sgType: string }>();
  const navigate = useNavigate();
  const [qualificationResults, setQualificationResults] = useState<QualificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [prizeRankingMap, setPrizeRankingMap] = useState<Map<string, { rank: number; prizeMoney: number }>>(new Map());
  const [fanVoteMap, setFanVoteMap] = useState<Map<string, { rank: number; votes: number }>>(new Map());

  const sgTypeUpper = sgType?.toUpperCase() as SGRaceType;
  const race = SG_SCHEDULE_2026.find((r) => r.type === sgTypeUpper);
  const criteria = race ? SG_QUALIFICATION_CRITERIA[race.type] : null;

  // 初回ロード：全選手データを一括取得
  useEffect(() => {
    const fetchAllData = async () => {
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

        // 🎯 賞金ランキングとファン投票から実際のID取得
        const prizeRankerIds = prizeRanking.slice(0, 50).map((r) => r.racerId);
        const fanVoteIds = fanVoteRanking.slice(0, 30).map((r) => r.racerId);
        
        // 重複を除去して結合
        const uniqueIds = Array.from(new Set([...prizeRankerIds, ...fanVoteIds]));
        
        console.log(`実際の選手ID取得: 賞金ランキング${prizeRankerIds.length}名、ファン投票${fanVoteIds.length}名、ユニーク${uniqueIds.length}名`);

        // Worker APIから選手成績を取得（最大20名ずつバッチ処理）
        const batchSize = 20;
        let racerPerformances = [];
        
        console.log(`全選手データ取得開始: ${uniqueIds.length}名を${Math.ceil(uniqueIds.length / batchSize)}バッチで処理`);
        
        for (let i = 0; i < uniqueIds.length; i += batchSize) {
          const batch = uniqueIds.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(uniqueIds.length / batchSize);
          
          console.log(`バッチ${batchNumber}/${totalBatches} 処理中...`);
          
          try {
            const performances = await boatraceAPI.getRacerPerformances(batch);
            
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
            
            racerPerformances.push(...performances);
            console.log(`バッチ${batchNumber}完了: ${performances.length}名取得（合計: ${racerPerformances.length}名）`);
          } catch (error) {
            console.error(`バッチ${batchNumber}の取得に失敗:`, error);
          }
        }

        // データが取得できなかった場合はモックデータを使用
        if (racerPerformances.length === 0) {
          console.warn('本番データの取得に失敗したため、モックデータを使用します');
          racerPerformances = getMockRacerPerformances();
        }

        console.log(`全選手データ取得完了: ${racerPerformances.length}名`);
        
        const results = evaluateQualification(racerPerformances, sgTypeUpper);
        setQualificationResults(results);
      } catch (error) {
        console.error('データ取得エラー:', error);
        // エラー時はモックデータを使用
        const racerPerformances = getMockRacerPerformances();
        const results = evaluateQualification(racerPerformances, sgTypeUpper);
        setQualificationResults(results);
      } finally {
        setLoading(false);
      }
    };

    if (race) {
      fetchAllData();
    }
  }, [race, sgTypeUpper]);

  if (!race || !criteria) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#666', marginBottom: '16px' }}>
          SGレースが見つかりません
        </h1>
        <button
          onClick={() => navigate('/sg')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          SG一覧へ戻る
        </button>
      </div>
    );
  }

  // ボーダーライン+10位までを取得
  const displayResults = getQualifiedWithMargin(qualificationResults, 10);

  const qualifiedCount = qualificationResults.filter((r) => r.qualified).length;
  const borderlineCount = displayResults.length - qualifiedCount;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* ヘッダー */}
      <div style={{ backgroundColor: '#dc3545', color: 'white', padding: '24px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <button
            onClick={() => navigate('/sg')}
            style={{
              marginBottom: '16px',
              padding: '8px 16px',
              backgroundColor: 'white',
              color: '#dc3545',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ← SG一覧へ戻る
          </button>

          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>{race.fullName}</h1>
          <p style={{ opacity: 0.9, fontSize: '16px' }}>
            {new Date(race.startDate).toLocaleDateString('ja-JP')} ～{' '}
            {new Date(race.endDate).toLocaleDateString('ja-JP')} @ {race.venue}
          </p>

          {/* 優勝賞金 */}
          <div
            style={{
              marginTop: '16px',
              display: 'inline-block',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>優勝賞金</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {race.prizeMoney.toLocaleString()}
              <span style={{ fontSize: '20px', marginLeft: '4px' }}>万円</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        {/* 出場資格基準 */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 出場資格基準
          </h2>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: '#666', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>選考期間</div>
            <div style={{ color: '#333', fontSize: '16px' }}>{criteria.selectionPeriod}</div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: '#666', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>総出場枠</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc3545' }}>{criteria.totalSlots}名</div>
          </div>

          <div>
            <div style={{ color: '#666', fontWeight: 'bold', marginBottom: '16px', fontSize: '14px' }}>選出基準</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {criteria.criteria.map((c, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'start',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}
                  >
                    {c.priority}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>{c.description}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      選出方法: {c.method}
                      {typeof c.slots === 'number' && ` / 枠数: ${c.slots}名`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 過去のボーダーライン */}
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
            <h3 style={{ fontWeight: 'bold', color: '#1565c0', marginBottom: '12px', fontSize: '16px' }}>過去のボーダーライン</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
              {criteria.borderlineHistory.map((history) => (
                <div key={history.year} style={{ fontSize: '14px' }}>
                  <span style={{ fontWeight: 'bold', color: '#1976d2' }}>{history.year}年:</span>
                  <span style={{ color: '#1565c0', marginLeft: '4px' }}>{history.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 選出順位一覧 */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#495057', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>選出順位一覧</span>
              <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
                資格者: {qualifiedCount}名 / ボーダー付近: +{borderlineCount}名
              </span>
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-block',
                  width: '48px',
                  height: '48px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #dc3545',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
              <p style={{ marginTop: '16px', color: '#666', fontSize: '16px', fontWeight: 'bold' }}>全選手データを読み込み中...</p>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#999' }}>約75名の選手データを取得しています</p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>順位</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>選手名</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>級別</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>支部</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>獲得賞金</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>ファン投票</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>選出理由</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>資格</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayResults.map((result, index) => {
                      const isQualified = result.qualified;
                      const isBorderline = !isQualified && index < displayResults.length;
                      const rowBg = isQualified
                        ? (index < 3 ? '#fffbf0' : 'white')
                        : '#f8f9fa';

                      return (
                        <tr
                          key={result.racerId}
                          style={{
                            backgroundColor: rowBg,
                            borderBottom: '1px solid #e0e0e0',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isQualified ? '#ffeaa7' : '#e9ecef')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = rowBg)}
                        >
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {index < 3 && isQualified && (
                                <span style={{ fontSize: '24px' }}>
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              )}
                              <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#333' }}>{result.rank}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/racer/${result.racerId}`);
                              }}
                              style={{ color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {result.racer.name}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span
                              style={{
                                padding: '4px 12px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                              }}
                            >
                              {result.racer.rank}
                            </span>
                          </td>
                          <td style={{ padding: '16px', color: '#495057' }}>{result.racer.branch}</td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            {prizeRankingMap.has(result.racerId) ? (
                              <div style={{ fontSize: '14px' }}>
                                <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                                  ¥{prizeRankingMap.get(result.racerId)?.prizeMoney.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                  ({prizeRankingMap.get(result.racerId)?.rank}位)
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#adb5bd', fontSize: '14px' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            {fanVoteMap.has(result.racerId) ? (
                              <div style={{ fontSize: '14px' }}>
                                <div style={{ fontWeight: 'bold', color: '#6f42c1' }}>
                                  {fanVoteMap.get(result.racerId)?.votes.toLocaleString()}票
                                </div>
                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                  ({fanVoteMap.get(result.racerId)?.rank}位)
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#adb5bd', fontSize: '14px' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: '#666' }}>
                            {result.qualificationReason}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            {isQualified ? (
                              <span
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#d4edda',
                                  color: '#155724',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                }}
                              >
                                資格あり
                              </span>
                            ) : isBorderline ? (
                              <span
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#fff3cd',
                                  color: '#856404',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                }}
                              >
                                ボーダー付近
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#e2e3e5',
                                  color: '#6c757d',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                }}
                              >
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
            </>
          )}
        </div>

        {/* 注意事項 */}
        <div style={{ marginTop: '32px', backgroundColor: '#fff3cd', borderRadius: '8px', padding: '24px', border: '1px solid #ffc107' }}>
          <h4 style={{ color: '#856404', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            ⚠️ 注意事項
          </h4>
          <ul style={{ color: '#856404', fontSize: '14px', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
            <li>上記は選出順位のシミュレーションです（実際の選出とは異なる場合があります）</li>
            <li>獲得賞金は公式サイト（boatrace-grandprix.jp）から最新データを取得しています</li>
            <li>ファン投票は投票サイト（macour.jp）から最新データを取得しています</li>
            <li>フライング等の事故により出場資格を喪失する場合があります</li>
            <li>シード権保持者は選出順位に関わらず優先的に出場できます</li>
            <li>最新の公式情報は BOAT RACE オフィシャルサイトをご確認ください</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
