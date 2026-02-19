import type { Racer, Race, RacerSchedule, RaceEntry, SGQualifiedRacer } from '../types';
import { addDays, addMonths } from 'date-fns';

// 注意: このAPIクライアントはモックデータを返します
// 実際の実装では、boatrace.jpからスクレイピングする必要があります

class BoatraceAPI {
  // 選手情報を取得
  async getRacerInfo(racerId: string): Promise<Racer | null> {
    try {
      // モックデータを返す
      const mockRacers: Record<string, Racer> = {
        '4444': {
          id: '4444',
          name: '桐生順平',
          branch: '埼玉',
          birthDate: '1986-10-07',
          winRate: 7.25,
          rank: 'A1',
        },
        '4320': {
          id: '4320',
          name: '峰竜太',
          branch: '佐賀',
          birthDate: '1984-05-11',
          winRate: 8.46,
          rank: 'A1',
        },
        '3960': {
          id: '3960',
          name: '茅原悠紀',
          branch: '岡山',
          birthDate: '1980-01-01',
          winRate: 6.89,
          rank: 'A1',
        },
      };

      return mockRacers[racerId] || null;
    } catch (error) {
      console.error('選手情報の取得に失敗しました:', error);
      return null;
    }
  }

  // 選手の出走予定を取得
  async getRacerSchedule(racerId: string): Promise<RacerSchedule | null> {
    try {
      const racer = await this.getRacerInfo(racerId);
      if (!racer) return null;

      // モックの出走予定データ
      const today = new Date();
      const upcomingRaces: Race[] = [
        {
          id: 'race-1',
          venueName: '桐生',
          venueCode: '01',
          raceName: '正月特選',
          grade: 'G1',
          startDate: addDays(today, 5).toISOString(),
          endDate: addDays(today, 10).toISOString(),
          days: 6,
        },
        {
          id: 'race-2',
          venueName: '平和島',
          venueCode: '04',
          raceName: 'ウインターカップ',
          grade: 'SG',
          startDate: addDays(today, 20).toISOString(),
          endDate: addDays(today, 25).toISOString(),
          days: 6,
        },
        {
          id: 'race-3',
          venueName: '住之江',
          venueCode: '12',
          raceName: 'グランプリ',
          grade: 'SG',
          startDate: addDays(today, 45).toISOString(),
          endDate: addDays(today, 50).toISOString(),
          days: 6,
        },
      ];

      return { racer, upcomingRaces };
    } catch (error) {
      console.error('出走予定の取得に失敗しました:', error);
      return null;
    }
  }

  // 向こう3ヶ月のG1以上のレースを取得
  async getUpcomingG1Races(): Promise<Race[]> {
    try {
      const today = new Date();
      const threeMonthsLater = addMonths(today, 3);

      // モックデータ
      const mockRaces: Race[] = [
        {
          id: 'race-g1-1',
          venueName: '桐生',
          venueCode: '01',
          raceName: '正月特選',
          grade: 'G1',
          startDate: addDays(today, 5).toISOString(),
          endDate: addDays(today, 10).toISOString(),
          days: 6,
        },
        {
          id: 'race-sg-1',
          venueName: '平和島',
          venueCode: '04',
          raceName: 'ウインターカップ',
          grade: 'SG',
          startDate: addDays(today, 20).toISOString(),
          endDate: addDays(today, 25).toISOString(),
          days: 6,
        },
        {
          id: 'race-g1-2',
          venueName: '蒲郡',
          venueCode: '07',
          raceName: 'オールスター',
          grade: 'G1',
          startDate: addDays(today, 35).toISOString(),
          endDate: addDays(today, 40).toISOString(),
          days: 6,
        },
        {
          id: 'race-sg-2',
          venueName: '住之江',
          venueCode: '12',
          raceName: 'グランプリ',
          grade: 'SG',
          startDate: addDays(today, 45).toISOString(),
          endDate: addDays(today, 50).toISOString(),
          days: 6,
        },
        {
          id: 'race-g1-3',
          venueName: '福岡',
          venueCode: '22',
          raceName: 'クイーンズクライマックス',
          grade: 'G1',
          startDate: addDays(today, 60).toISOString(),
          endDate: addDays(today, 65).toISOString(),
          days: 6,
        },
        {
          id: 'race-g1-4',
          venueName: '大村',
          venueCode: '24',
          raceName: 'ヤングダービー',
          grade: 'G1',
          startDate: addDays(today, 75).toISOString(),
          endDate: addDays(today, 80).toISOString(),
          days: 6,
        },
      ];

      return mockRaces.filter((race) => {
        const raceDate = new Date(race.startDate);
        return raceDate >= today && raceDate <= threeMonthsLater;
      });
    } catch (error) {
      console.error('レース一覧の取得に失敗しました:', error);
      return [];
    }
  }

  // レース出場選手を取得
  async getRaceEntries(raceId: string): Promise<RaceEntry | null> {
    try {
      // まずレース情報を取得
      const allRaces = await this.getUpcomingG1Races();
      const race = allRaces.find((r) => r.id === raceId);

      if (!race) return null;

      // モックの出場選手データ
      const racers: Racer[] = [
        {
          id: '4444',
          name: '桐生順平',
          branch: '埼玉',
          winRate: 7.25,
          rank: 'A1',
        },
        {
          id: '4320',
          name: '峰竜太',
          branch: '佐賀',
          winRate: 8.46,
          rank: 'A1',
        },
        {
          id: '3960',
          name: '茅原悠紀',
          branch: '岡山',
          winRate: 6.89,
          rank: 'A1',
        },
        {
          id: '4444',
          name: '毒島誠',
          branch: '群馬',
          winRate: 7.89,
          rank: 'A1',
        },
        {
          id: '4501',
          name: '瓜生正義',
          branch: '福岡',
          winRate: 8.12,
          rank: 'A1',
        },
        {
          id: '4320',
          name: '井口佳典',
          branch: '三重',
          winRate: 7.45,
          rank: 'A1',
        },
      ];

      return { race, racers };
    } catch (error) {
      console.error('レース出場選手の取得に失敗しました:', error);
      return null;
    }
  }

  // SG出場資格選手を取得
  async getSGQualifiedRacers(): Promise<SGQualifiedRacer[]> {
    try {
      // モックのSG出場資格選手データ
      const racers: SGQualifiedRacer[] = [
        {
          id: '4320',
          name: '峰竜太',
          branch: '佐賀',
          winRate: 8.46,
          classRank: 'A1',
          rank: 1,
          points: 2850,
          winCount: 15,
        },
        {
          id: '4501',
          name: '瓜生正義',
          branch: '福岡',
          winRate: 8.12,
          classRank: 'A1',
          rank: 2,
          points: 2720,
          winCount: 12,
        },
        {
          id: '4444',
          name: '毒島誠',
          branch: '群馬',
          winRate: 7.89,
          classRank: 'A1',
          rank: 3,
          points: 2650,
          winCount: 10,
        },
        {
          id: '4321',
          name: '井口佳典',
          branch: '三重',
          winRate: 7.45,
          classRank: 'A1',
          rank: 4,
          points: 2580,
          winCount: 8,
        },
        {
          id: '4445',
          name: '桐生順平',
          branch: '埼玉',
          winRate: 7.25,
          classRank: 'A1',
          rank: 5,
          points: 2500,
          winCount: 7,
        },
      ];

      return racers;
    } catch (error) {
      console.error('SG出場資格選手の取得に失敗しました:', error);
      return [];
    }
  }

  // 選手番号で検索
  async searchRacers(query: string): Promise<Racer[]> {
    try {
      // モックの検索結果
      const allRacers: Racer[] = [
        {
          id: '4444',
          name: '桐生順平',
          branch: '埼玉',
          winRate: 7.25,
          rank: 'A1',
        },
        {
          id: '4320',
          name: '峰竜太',
          branch: '佐賀',
          winRate: 8.46,
          rank: 'A1',
        },
        {
          id: '3960',
          name: '茅原悠紀',
          branch: '岡山',
          winRate: 6.89,
          rank: 'A1',
        },
        {
          id: '4501',
          name: '瓜生正義',
          branch: '福岡',
          winRate: 8.12,
          rank: 'A1',
        },
      ];

      return allRacers.filter((racer) => racer.id.includes(query));
    } catch (error) {
      console.error('選手検索に失敗しました:', error);
      return [];
    }
  }
}

export const boatraceAPI = new BoatraceAPI();
