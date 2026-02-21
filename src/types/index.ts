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
  // SG選出に必要な統計情報
  generalWins?: number; // 一般戦優勝回数
  g1Wins?: number; // G1優勝回数
  g2Wins?: number; // G2優勝回数
  sgWins?: number; // SG優勝回数
  sgPoints?: number; // SG得点（グランドチャンピオン用）
  g2PlusPoints?: number; // G2以上優勝戦得点（オーシャンカップ用）
  totalWinRate?: number; // 全国勝率（ダービー用）
  prizeAmount?: number; // 賞金額（チャレンジカップ・グランプリ用）
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

// SGレース種別
export type SGRaceType = 
  | 'CLASSIC' // ボートレースクラシック（総理大臣杯）
  | 'ALL_STAR' // ボートレースオールスター（笹川賞）
  | 'GRAND_CHAMPION' // グランドチャンピオン
  | 'OCEAN_CUP' // オーシャンカップ
  | 'MEMORIAL' // ボートレースメモリアル（MB記念）
  | 'DERBY' // ボートレースダービー（全日本選手権）
  | 'CHALLENGE_CUP' // チャレンジカップ
  | 'GRAND_PRIX'; // グランプリ（賞金王決定戦）

// SG出場資格条件
export interface SGQualification {
  sgType: SGRaceType;
  raceName: string; // 正式名称
  scheduledMonth: number; // 開催予定月
  qualificationCriteria: string; // 選出基準の説明
  qualifiedRacers: SGQualifiedRacer[]; // 出場資格を満たす選手一覧
}

// SG選出順位付き選手
export interface SGRankedRacer extends Racer {
  selectionRank: number; // 選出順位
  qualificationReason: string; // 選出理由（例: "一般戦優勝5回", "賞金ランキング3位"）
  isSeeded?: boolean; // シード選手かどうか
}
