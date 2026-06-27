import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { boatraceAPI } from '../api/boatrace';
import type { RacerSchedule, GanttItem } from '../types';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';

export const RacerPage: React.FC = () => {
  const { racerId } = useParams<{ racerId: string }>();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<RacerSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!racerId) return;

      setLoading(true);
      try {
        const data = await boatraceAPI.getRacerSchedule(racerId);
        setSchedule(data);
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [racerId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>;
  }

  if (!schedule) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>選手情報が見つかりませんでした</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '16px', padding: '8px 16px' }}>
          トップに戻る
        </button>
      </div>
    );
  }

  const { racer, upcomingRaces } = schedule;

  // ガントチャート用のデータを準備
  const ganttItems: GanttItem[] = upcomingRaces.map((race) => ({
    raceName: race.raceName,
    venueName: race.venueName,
    startDate: parseISO(race.startDate),
    endDate: parseISO(race.endDate),
    grade: race.grade,
  }));

  // 全体の期間を計算
  const today = new Date();
  const endDate = ganttItems.length > 0 ? ganttItems[ganttItems.length - 1].endDate : addDays(today, 90);
  const totalDays = differenceInDays(endDate, today);
  const daysToShow = Math.max(totalDays + 10, 90); // 最低90日分表示

  // グレードに応じた色
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'SG':
        return '#dc3545'; // 赤
      case 'G1':
        return '#ffc107'; // 黄色
      case 'G2':
        return '#28a745'; // 緑
      case 'G3':
        return '#17a2b8'; // 青
      default:
        return '#6c757d'; // グレー
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
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

      {/* 選手情報 */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '8px' }}>{racer.name}</h1>
        <div style={{ display: 'flex', gap: '16px', color: '#666' }}>
          <span>登録番号: {racer.id}</span>
          <span>支部: {racer.branch}</span>
          <span>級別: {racer.rank}</span>
          <span>勝率: {racer.winRate}</span>
        </div>
      </div>

      {/* 出走予定 */}
      <h2 style={{ marginBottom: '16px' }}>出走予定（ガントチャート）</h2>

      {ganttItems.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>現在、出走予定はありません</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* ガントチャート */}
          <div style={{ minWidth: '800px' }}>
            {/* ヘッダー（日付） */}
            <div style={{ display: 'flex', marginBottom: '8px', paddingLeft: '200px' }}>
              {Array.from({ length: Math.ceil(daysToShow / 7) }).map((_, weekIndex) => {
                const weekStart = addDays(today, weekIndex * 7);
                return (
                  <div
                    key={weekIndex}
                    style={{
                      flex: 1,
                      minWidth: '100px',
                      padding: '8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      borderLeft: '1px solid #ddd',
                      backgroundColor: '#f8f9fa',
                    }}
                  >
                    {format(weekStart, 'M/d', { locale: ja })}
                  </div>
                );
              })}
            </div>

            {/* ガントチャート本体 */}
            {ganttItems.map((item, index) => {
              const daysFromToday = differenceInDays(item.startDate, today);
              const duration = differenceInDays(item.endDate, item.startDate) + 1;
              const leftPercent = (daysFromToday / daysToShow) * 100;
              const widthPercent = (duration / daysToShow) * 100;

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                    position: 'relative',
                  }}
                >
                  {/* レース情報（左側） */}
                  <div
                    style={{
                      width: '200px',
                      paddingRight: '16px',
                      fontSize: '14px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          fontSize: '12px',
                          backgroundColor: getGradeColor(item.grade),
                          color: 'white',
                          borderRadius: '4px',
                          marginRight: '8px',
                        }}
                      >
                        {item.grade}
                      </span>
                      {item.venueName}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>{item.raceName}</div>
                  </div>

                  {/* タイムライン */}
                  <div
                    style={{
                      flex: 1,
                      height: '40px',
                      backgroundColor: '#f8f9fa',
                      position: 'relative',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                    }}
                  >
                    {/* バー */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${Math.max(0, leftPercent)}%`,
                        width: `${Math.min(100 - Math.max(0, leftPercent), widthPercent)}%`,
                        height: '100%',
                        backgroundColor: getGradeColor(item.grade),
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {format(item.startDate, 'M/d', { locale: ja })} -{' '}
                      {format(item.endDate, 'M/d', { locale: ja })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 凡例 */}
          <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#dc3545', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '12px' }}>SG</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#ffc107', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '12px' }}>G1</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#28a745', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '12px' }}>G2</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#17a2b8', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '12px' }}>G3</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
