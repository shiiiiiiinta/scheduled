import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { boatraceAPI } from '../api/boatrace';
import type { SGQualifiedRacer } from '../types';

export const SGRankingPage: React.FC = () => {
  const navigate = useNavigate();
  const [racers, setRacers] = useState<SGQualifiedRacer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await boatraceAPI.getSGQualifiedRacers();
        setRacers(data);
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRacerClick = (racerId: string) => {
    navigate(`/racer/${racerId}`);
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return '#ffd700'; // 金
    if (rank === 2) return '#c0c0c0'; // 銀
    if (rank === 3) return '#cd7f32'; // 銅
    return '#e9ecef';
  };

  const getRankTextColor = (rank: number) => {
    if (rank <= 3) return '#000';
    return '#666';
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          marginBottom: '16px',
          padding: '8px 16px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        ← 戻る
      </button>

      <h1 style={{ marginBottom: '8px' }}>SG出場資格選手</h1>
      <p style={{ marginBottom: '32px', color: '#666' }}>
        SG（スペシャルグレード）レースに出場資格を持つ選手の順位とポイントです
      </p>

      {racers.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>データがありません</p>
      ) : (
        <>
          {/* テーブルヘッダー */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 120px 120px 100px 100px',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px 8px 0 0',
              fontWeight: 'bold',
              fontSize: '14px',
              borderBottom: '2px solid #ddd',
            }}
          >
            <div style={{ textAlign: 'center' }}>順位</div>
            <div>選手名</div>
            <div style={{ textAlign: 'center' }}>支部</div>
            <div style={{ textAlign: 'center' }}>級別</div>
            <div style={{ textAlign: 'right' }}>ポイント</div>
            <div style={{ textAlign: 'right' }}>優勝回数</div>
          </div>

          {/* テーブルボディ */}
          <div style={{ border: '1px solid #ddd', borderRadius: '0 0 8px 8px' }}>
            {racers.map((racer, index) => (
              <div
                key={racer.id}
                onClick={() => handleRacerClick(racer.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 120px 120px 100px 100px',
                  gap: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                  borderBottom: index === racers.length - 1 ? 'none' : '1px solid #e9ecef',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e3f2fd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa';
                }}
              >
                {/* 順位 */}
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      backgroundColor: getRankBadgeColor(racer.rank),
                      color: getRankTextColor(racer.rank),
                      borderRadius: '50%',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      border: racer.rank <= 3 ? '2px solid #000' : '1px solid #ddd',
                    }}
                  >
                    {racer.rank}
                  </span>
                </div>

                {/* 選手名 */}
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{racer.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>登録番号: {racer.id}</div>
                </div>

                {/* 支部 */}
                <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {racer.branch}
                </div>

                {/* 級別 */}
                <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  >
                    {racer.classRank || 'A1'}
                  </span>
                </div>

                {/* ポイント */}
                <div
                  style={{
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    fontWeight: 'bold',
                    color: '#007bff',
                  }}
                >
                  {racer.points?.toLocaleString()}
                </div>

                {/* 優勝回数 */}
                <div
                  style={{
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    fontWeight: 'bold',
                  }}
                >
                  {racer.winCount}回
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 説明 */}
      <div
        style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>SG出場資格について</h3>
        <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
          <p style={{ margin: '0 0 12px 0' }}>
            SG（スペシャルグレード）レースは、競艇における最高峰のレースです。
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            出場するには、前年度の獲得ポイントや優勝回数などの実績に基づく厳しい出場資格があります。
          </p>
          <p style={{ margin: '0' }}>
            年間を通じて安定した成績を残しているトップレーサーのみが出場できる権威あるレースです。
          </p>
        </div>
      </div>

      {/* メダルの説明 */}
      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>順位バッジ</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#ffd700',
                border: '2px solid #000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              1
            </div>
            <span style={{ fontSize: '14px' }}>1位（金メダル）</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#c0c0c0',
                border: '2px solid #000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              2
            </div>
            <span style={{ fontSize: '14px' }}>2位（銀メダル）</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#cd7f32',
                border: '2px solid #000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              3
            </div>
            <span style={{ fontSize: '14px' }}>3位（銅メダル）</span>
          </div>
        </div>
      </div>
    </div>
  );
};
