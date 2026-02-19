// 競艇場コード
export type VenueCode = string;

// レースグレード
export type RaceGrade = 'SG' | 'G1' | 'G2' | 'G3' | '一般';

// 選手情報
export interface Racer {
  id: string; // 選手登録番号
  name: string;
  branch?: string; // 支部
  birthDate?: string;
  winRate?: number; // 勝率
  rank?: string; // 級別
}

// レース情報
export interface Race {
  id: string;
  venueName: string; // 場名
  venueCode: VenueCode;
  raceName: string; // レース名
  grade: RaceGrade;
  startDate: string;
  endDate: string;
  days: number; // 開催日数
}

// 選手の出走予定
export interface RacerSchedule {
  racer: Racer;
  upcomingRaces: Race[];
}

// レース出場選手
export interface RaceEntry {
  race: Race;
  racers: Racer[];
}

// SG出場資格選手
export interface SGQualifiedRacer {
  id: string; // 選手登録番号
  name: string;
  branch?: string; // 支部
  birthDate?: string;
  winRate?: number; // 勝率
  classRank?: string; // 級別（A1, A2など）
  rank: number; // SG順位
  points?: number; // ポイント
  winCount?: number; // 優勝回数
}

// 競艇場マスタ
export interface Venue {
  code: VenueCode;
  name: string;
  prefecture: string;
}

// ガントチャート用データ
export interface GanttItem {
  raceName: string;
  venueName: string;
  startDate: Date;
  endDate: Date;
  grade: RaceGrade;
}
