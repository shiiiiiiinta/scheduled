import axios from 'axios';
import type { Racer, Race, RacerSchedule, RaceEntry, SGQualifiedRacer } from '../types';
import { addDays } from 'date-fns';

// 環境変数から設定を取得
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || !API_BASE_URL;

class BoatraceAPI {
  private apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  // 選手情報を取得
  async getRacerInfo(racerId: string): Promise<Racer | null> {
    if (USE_MOCK_DATA) {
      return this.getMockRacerInfo(racerId);
    }

    try {
      const response = await this.apiClient.get(`/api/racer/${racerId}`);
      return response.data.racer;
    } catch (error) {
      console.error('選手情報の取得に失敗しました:', error);
      return this.getMockRacerInfo(racerId); // フォールバック
    }
  }

  // 選手の出走予定を取得
  async getRacerSchedule(racerId: string): Promise<RacerSchedule | null> {
    if (USE_MOCK_DATA) {
      return this.getMockRacerSchedule(racerId);
    }

    try {
      const response = await this.apiClient.get(`/api/racer/${racerId}`);
      const racer = response.data.racer;
      const scheduleData = response.data.schedule || [];

      // スケジュールデータを変換
      const upcomingRaces: Race[] = scheduleData.map((item: any, index: number) => ({
        id: `race-${index}`,
        venueName: item.venueName,
        venueCode: this.getVenueCodeByName(item.venueName),
        raceName: `${item.venueName}${item.grade}`,
        grade: item.grade,
        startDate: this.parseScheduleDate(item.date),
        endDate: this.parseScheduleDate(item.date, 5),
        days: 6,
      }));

      return { racer, upcomingRaces };
    } catch (error) {
      console.error('出走予定の取得に失敗しました:', error);
      return this.getMockRacerSchedule(racerId); // フォールバック
    }
  }

  // 向こう3ヶ月のG1以上のレースを取得
  async getUpcomingG1Races(): Promise<Race[]> {
    if (USE_MOCK_DATA) {
      return this.getMockUpcomingG1Races();
    }

    try {
      const response = await this.apiClient.get('/api/races/g1');
      const racesData = response.data.races || [];

      return racesData.map((item: any, index: number) => ({
        id: `race-${index}`,
        venueName: item.venueName,
        venueCode: this.getVenueCodeByName(item.venueName),
        raceName: item.raceName,
        grade: item.grade,
        startDate: new Date().toISOString(),
        endDate: addDays(new Date(), 6).toISOString(),
        days: 6,
      }));
    } catch (error) {
      console.error('レース一覧の取得に失敗しました:', error);
      return this.getMockUpcomingG1Races(); // フォールバック
    }
  }

  // レース出場選手を取得
  async getRaceEntries(raceId: string): Promise<RaceEntry | null> {
    if (USE_MOCK_DATA) {
      return this.getMockRaceEntries(raceId);
    }

    try {
      const response = await this.apiClient.get(`/api/race/${raceId}`);
      return response.data;
    } catch (error) {
      console.error('レース出場選手の取得に失敗しました:', error);
      return this.getMockRaceEntries(raceId); // フォールバック
    }
  }

  // SG出場資格選手を取得
  async getSGQualifiedRacers(): Promise<SGQualifiedRacer[]> {
    if (USE_MOCK_DATA) {
      return this.getMockSGQualifiedRacers();
    }

    try {
      const response = await this.apiClient.get('/api/sg/qualified');
      return response.data.racers || [];
    } catch (error) {
      console.error('SG出場資格選手の取得に失敗しました:', error);
      return this.getMockSGQualifiedRacers(); // フォールバック
    }
  }

  // 選手番号で検索
  async searchRacers(query: string): Promise<Racer[]> {
    if (USE_MOCK_DATA) {
      return this.getMockSearchRacers(query);
    }

    try {
      const response = await this.apiClient.get('/api/search', {
        params: { q: query },
      });
      return response.data.racers || [];
    } catch (error) {
      console.error('選手検索に失敗しました:', error);
      return this.getMockSearchRacers(query); // フォールバック
    }
  }

  // ===== ユーティリティ関数 =====

  private getVenueCodeByName(name: string): string {
    const venueMap: Record<string, string> = {
      '桐生': '01', '戸田': '02', '江戸川': '03', '平和島': '04',
      '多摩川': '05', '浜名湖': '06', '蒲郡': '07', '常滑': '08',
      '津': '09', '三国': '10', 'びわこ': '11', '住之江': '12',
      '尼崎': '13', '鳴門': '14', '丸亀': '15', '児島': '16',
      '宮島': '17', '徳山': '18', '下関': '19', '若松': '20',
      '芦屋': '21', '福岡': '22', '唐津': '23', '大村': '24',
    };
    return venueMap[name] || '00';
  }

  private parseScheduleDate(dateStr: string, addDaysCount = 0): string {
    // "2/25" 形式の日付を解析
    const [month, day] = dateStr.split('/').map(Number);
    const now = new Date();
    const year = now.getFullYear();
    const date = new Date(year, month - 1, day);
    
    if (addDaysCount > 0) {
      date.setDate(date.getDate() + addDaysCount);
    }
    
    return date.toISOString();
  }

  // ===== モックデータ関数 =====

  private getMockRacerInfo(racerId: string): Racer | null {
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
  }

  private getMockRacerSchedule(racerId: string): RacerSchedule | null {
    const racer = this.getMockRacerInfo(racerId);
    if (!racer) return null;

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
  }

  private getMockUpcomingG1Races(): Race[] {
    const today = new Date();

    return [
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
    ];
  }

  private getMockRaceEntries(raceId: string): RaceEntry | null {
    const allRaces = this.getMockUpcomingG1Races();
    const race = allRaces.find((r) => r.id === raceId);

    if (!race) return null;

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
    ];

    return { race, racers };
  }

  private getMockSGQualifiedRacers(): SGQualifiedRacer[] {
    return [
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
  }

  private getMockSearchRacers(query: string): Racer[] {
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
  }
}

export const boatraceAPI = new BoatraceAPI();
