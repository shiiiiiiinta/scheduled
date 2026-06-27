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
  // 開始基準日 = 今日 と 最初のレース開始日 の早い方（過去開催中レースも入るため）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstStart =
    ganttItems.length > 0
      ? ganttItems.reduce((min, it) => (it.startDate < min ? it.startDate : min), ganttItems[0].startDate)
      : today;
  const chartStart = firstStart < today ? firstStart : today;
  const lastEnd =
    ganttItems.length > 0
      ? ganttItems.reduce((max, it) => (it.endDate > max ? it.endDate : max), ganttItems[0].endDate)
      : addDays(today, 90);
  const totalDays = Math.max(differenceInDays(lastEnd, chartStart) + 7, 30);
  // 1日あたりの横幅(px)。期間をはっきり見せるため固定px方式にする
  const DAY_WIDTH = 14;
  const chartWidth = totalDays * DAY_WIDTH;
  const LABEL_WIDTH = 200;

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
          {/* ガントチャート（1日 = 固定px方式） */}
          <div style={{ width: `${LABEL_WIDTH + chartWidth}px`, minWidth: '100%' }}>
            {/* ヘッダー（週単位の目盛り） */}
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <div style={{ width: `${LABEL_WIDTH}px`, flexShrink: 0 }} />
              <div style={{ position: 'relative', width: `${chartWidth}px`, height: '28px' }}>
                {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, weekIndex) => {
                  const weekStart = addDays(chartStart, weekIndex * 7);
                  const left = weekIndex * 7 * DAY_WIDTH;
                  return (
                    <div
                      key={weekIndex}
                      style={{
                        position: 'absolute',
                        left: `${left}px`,
                        top: 0,
                        height: '100%',
                        borderLeft: '1px solid #ddd',
                        paddingLeft: '4px',
                        fontSize: '11px',
                        color: '#666',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {format(weekStart, 'M/d', { locale: ja })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ガントチャート本体 */}
            {ganttItems.map((item, index) => {
              const daysFromStart = differenceInDays(item.startDate, chartStart);
              const duration = differenceInDays(item.endDate, item.startDate) + 1;
              const left = daysFromStart * DAY_WIDTH;
              const barWidth = Math.max(duration * DAY_WIDTH, 8);

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  {/* レース情報（左側） */}
                  <div
                    style={{
                      width: `${LABEL_WIDTH}px`,
                      flexShrink: 0,
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
                      width: `${chartWidth}px`,
                      flexShrink: 0,
                      height: '36px',
                      backgroundColor: '#f8f9fa',
                      position: 'relative',
                      border: '1px solid #eee',
                      borderRadius: '4px',
                    }}
                  >
                    {/* 週ごとの薄いグリッド線 */}
                    {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, w) => (
                      <div
                        key={w}
                        style={{
                          position: 'absolute',
                          left: `${w * 7 * DAY_WIDTH}px`,
                          top: 0,
                          bottom: 0,
                          borderLeft: '1px solid #eee',
                        }}
                      />
                    ))}
                    {/* バー（開催期間の幅） */}
                    <div
                      title={`${format(item.startDate, 'M/d', { locale: ja })} 〜 ${format(item.endDate, 'M/d', { locale: ja })}（${duration}日間）`}
                      style={{
                        position: 'absolute',
                        left: `${left}px`,
                        top: '4px',
                        width: `${barWidth}px`,
                        height: '28px',
                        backgroundColor: getGradeColor(item.grade),
                        borderRadius: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      }}
                    />
                    {/* 期間ラベル（バーの右隣に表示） */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${left + barWidth + 6}px`,
                        top: '4px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#333',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {format(item.startDate, 'M/d', { locale: ja })}–{format(item.endDate, 'M/d', { locale: ja })}
                      <span style={{ color: '#999', fontWeight: 'normal', marginLeft: '4px' }}>
                        ({duration}日)
                      </span>
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
