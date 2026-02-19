import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { boatraceAPI } from '../api/boatrace';
import type { RaceEntry } from '../types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export const RaceEntryPage: React.FC = () => {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const [raceEntry, setRaceEntry] = useState<RaceEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!raceId) return;

      setLoading(true);
      try {
        const data = await boatraceAPI.getRaceEntries(raceId);
        setRaceEntry(data);
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [raceId]);

  const handleRacerClick = (racerId: string) => {
    navigate(`/racer/${racerId}`);
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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>;
  }

  if (!raceEntry) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>レース情報が見つかりませんでした</p>
        <button
          onClick={() => navigate('/races/g1')}
          style={{ marginTop: '16px', padding: '8px 16px' }}
        >
          レース一覧に戻る
        </button>
      </div>
    );
  }

  const { race, racers } = raceEntry;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <button
        onClick={() => navigate('/races/g1')}
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
        ← レース一覧に戻る
      </button>

      {/* レース情報 */}
      <div style={{ marginBottom: '32px', padding: '24px', border: '2px solid #ddd', borderRadius: '8px' }}>
        <div style={{ marginBottom: '12px' }}>
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
        <h1 style={{ marginBottom: '8px' }}>{race.raceName}</h1>
        <div style={{ marginBottom: '8px', color: '#666', fontSize: '18px' }}>📍 {race.venueName}</div>
        <div style={{ color: '#666' }}>
          {format(parseISO(race.startDate), 'yyyy年M月d日(E)', { locale: ja })} ~{' '}
          {format(parseISO(race.endDate), 'M月d日(E)', { locale: ja })} ({race.days}日間)
        </div>
      </div>

      {/* 出場選手一覧 */}
      <h2 style={{ marginBottom: '16px' }}>出場選手一覧</h2>
      <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
        選手をタップすると出走予定の詳細が表示されます
      </p>

      {racers.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
          出場選手情報がまだ公開されていません
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {racers.map((racer, index) => (
            <div
              key={`${racer.id}-${index}`}
              onClick={() => handleRacerClick(racer.id)}
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#f8f9fa',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ fontSize: '18px' }}>{racer.name}</strong>
                    <span style={{ marginLeft: '8px', color: '#666' }}>({racer.id})</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>支部: {racer.branch}</div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: '#007bff',
                        color: 'white',
                        borderRadius: '4px',
                        marginBottom: '4px',
                      }}
                    >
                      {racer.rank}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>勝率: {racer.winRate}</div>
                  </div>
                  <div style={{ fontSize: '20px', color: '#999' }}>→</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 級別の説明 */}
      <div
        style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>級別について</h3>
        <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>A1級</strong> - 上位20%の選手（最高クラス）
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>A2級</strong> - 次の20%の選手
          </p>
          <p style={{ margin: '0' }}>
            <strong>B1級・B2級</strong> - 残りの選手
          </p>
        </div>
      </div>
    </div>
  );
};
