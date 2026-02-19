import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { boatraceAPI } from '../api/boatrace';
import type { Race } from '../types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export const G1RacesPage: React.FC = () => {
  const navigate = useNavigate();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await boatraceAPI.getUpcomingG1Races();
        setRaces(data);
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRaceClick = (raceId: string) => {
    navigate(`/race/${raceId}`);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'SG':
        return '#dc3545';
      case 'G1':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const getGradeBgColor = (grade: string) => {
    switch (grade) {
      case 'SG':
        return '#fff5f5';
      case 'G1':
        return '#fffbf0';
      default:
        return '#f8f9fa';
    }
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

      <h1 style={{ marginBottom: '8px' }}>向こう3ヶ月のG1以上のレース</h1>
      <p style={{ marginBottom: '32px', color: '#666' }}>レースをタップすると出場選手一覧が表示されます</p>

      {races.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>該当するレースがありません</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {races.map((race) => (
            <div
              key={race.id}
              onClick={() => handleRaceClick(race.id)}
              style={{
                padding: '20px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: getGradeBgColor(race.grade),
                transition: 'all 0.2s',
                borderColor: getGradeColor(race.grade),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  {/* グレードバッジ */}
                  <div style={{ marginBottom: '8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        backgroundColor: getGradeColor(race.grade),
                        color: 'white',
                        borderRadius: '4px',
                      }}
                    >
                      {race.grade}
                    </span>
                  </div>

                  {/* レース名 */}
                  <h2 style={{ marginBottom: '8px', fontSize: '20px' }}>{race.raceName}</h2>

                  {/* 場名 */}
                  <div style={{ marginBottom: '12px', color: '#666', fontSize: '16px' }}>
                    📍 {race.venueName}
                  </div>

                  {/* 開催日程 */}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#666' }}>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>開催期間:</span>{' '}
                      {format(parseISO(race.startDate), 'yyyy年M月d日(E)', { locale: ja })} ~{' '}
                      {format(parseISO(race.endDate), 'M月d日(E)', { locale: ja })}
                    </div>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>日数:</span> {race.days}日間
                    </div>
                  </div>
                </div>

                {/* 矢印アイコン */}
                <div
                  style={{
                    fontSize: '24px',
                    color: getGradeColor(race.grade),
                    marginLeft: '16px',
                  }}
                >
                  →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 凡例 */}
      <div
        style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>グレードについて</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: '#dc3545',
                borderRadius: '4px',
              }}
            ></div>
            <span>
              <strong>SG</strong> - スペシャルグレード（最高峰のレース）
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: '#ffc107',
                borderRadius: '4px',
              }}
            ></div>
            <span>
              <strong>G1</strong> - グレード1（トップクラスのレース）
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
