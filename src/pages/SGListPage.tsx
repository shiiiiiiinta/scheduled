import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SG_SCHEDULE_2026 } from '../types/sg';
import type { SGRace } from '../types/sg';

export default function SGListPage() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // 開催日順にソート
  const sortedRaces = [...SG_SCHEDULE_2026].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // 開催状態
  const getRaceStatus = (race: SGRace): 'upcoming' | 'ongoing' | 'finished' => {
    const now = new Date();
    const start = new Date(race.startDate);
    const end = new Date(race.endDate);

    if (now < start) return 'upcoming';
    if (now > end) return 'finished';
    return 'ongoing';
  };

  // ステータスバッジのスタイル
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ongoing':
        return {
          backgroundColor: '#ffc107',
          color: '#000',
        };
      case 'finished':
        return {
          backgroundColor: '#6c757d',
          color: 'white',
        };
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '32px' }}>
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

        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          🚤 SG競走スケジュール 2026
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          最高峰のレースカレンダー - 全8大会の開催情報と出場資格
        </p>
      </div>

      {/* 年度選択 */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ fontWeight: 'bold', color: '#333' }}>開催年度:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          style={{
            padding: '8px 16px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: 'white',
          }}
        >
          <option value={2025}>2025年</option>
          <option value={2026}>2026年</option>
          <option value={2027}>2027年</option>
        </select>
      </div>

      {/* GRANDE5の説明 */}
      <div
        style={{
          marginBottom: '32px',
          padding: '20px',
          backgroundColor: '#fff5f5',
          border: '2px solid #dc3545',
          borderRadius: '8px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#dc3545' }}>
          ⭐ GRANDE5（グランデファイブ）とは
        </h2>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>
          伝統と格式を持つ5つのSG競走の総称。これら全てを制覇した選手には「三億円金塊」が贈呈されます。
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['ボートレースクラシック', 'ボートレースオールスター', 'グランドチャンピオン', 'ボートレースメモリアル', 'チャレンジカップ'].map((name) => (
            <span
              key={name}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 'bold',
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* SG一覧 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
        }}
      >
        {sortedRaces.map((race) => {
          const status = getRaceStatus(race);
          const statusBadgeStyle = getStatusBadgeStyle(status);

          return (
            <div
              key={race.id}
              onClick={() => navigate(`/sg/${race.type.toLowerCase()}`)}
              style={{
                padding: '24px',
                border: '2px solid #dc3545',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: 'white',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 53, 69, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* ステータスバッジ */}
              {statusBadgeStyle && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    ...statusBadgeStyle,
                  }}
                >
                  {status === 'ongoing' ? '開催中' : '終了'}
                </div>
              )}

              {/* グレードバッジ */}
              <div style={{ marginBottom: '12px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backgroundColor: race.type === 'GRAND_PRIX' ? '#6f42c1' : '#dc3545',
                    color: 'white',
                    borderRadius: '4px',
                  }}
                >
                  SG
                </span>
                {['CLASSIC', 'ALL_STAR', 'GRAND_CHAMPION', 'MEMORIAL', 'CHALLENGE_CUP'].includes(race.type) && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginLeft: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: '#ffd700',
                      color: '#000',
                      borderRadius: '4px',
                    }}
                  >
                    GRANDE5
                  </span>
                )}
              </div>

              {/* レース名 */}
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                {race.fullName}
              </h2>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>{race.name}</p>

              {/* 開催情報 */}
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>📅</span>
                  <span style={{ color: '#666' }}>
                    {new Date(race.startDate).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} ~{' '}
                    {new Date(race.endDate).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>📍</span>
                  <span style={{ color: '#666' }}>{race.venue}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>💰</span>
                  <span style={{ color: '#666', fontWeight: 'bold' }}>優勝賞金 {race.prizeMoney}万円</span>
                </div>
              </div>

              {/* 出場資格概要 */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#555',
                  lineHeight: '1.5',
                }}
              >
                <strong>出場資格:</strong> {race.qualificationCriteria}
              </div>

              {/* 矢印 */}
              <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '20px', color: '#dc3545' }}>→</div>
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div
        style={{
          marginTop: '48px',
          padding: '24px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>📖 SG競走について</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#666' }}>
          <p>
            <strong>SG（スペシャルグレード）</strong>は、ボートレースにおける最高峰のレースグレードです。年間8大会が開催され、約1,600名の選手の中から約3%のトップ選手のみが出場できます。
          </p>
          <p>
            各レースには独自の出場資格が設定されており、勝率、優勝回数、賞金ランキング、ファン投票など、様々な基準で選手が選出されます。
          </p>
          <p style={{ marginTop: '8px', padding: '12px', backgroundColor: 'white', borderRadius: '4px' }}>
            💡 <strong>ヒント:</strong> 各レースをクリックすると、詳細な出場資格基準と選出順位一覧を確認できます
          </p>
        </div>
      </div>
    </div>
  );
}
