// SG競走の型定義

export type SGRaceType =
  | 'CLASSIC'        // ボートレースクラシック（総理大臣杯）
  | 'ALL_STAR'       // ボートレースオールスター（笹川賞）
  | 'GRAND_CHAMPION' // グランドチャンピオン
  | 'OCEAN_CUP'      // オーシャンカップ
  | 'MEMORIAL'       // ボートレースメモリアル
  | 'DERBY'          // ボートレースダービー（全日本選手権）
  | 'CHALLENGE_CUP'  // チャレンジカップ
  | 'GRAND_PRIX';    // グランプリ（賞金王決定戦）

export interface SGRace {
  id: string;
  type: SGRaceType;
  name: string;
  fullName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  venue: string;
  venueCode: string;
  prizeMoney: number; // 優勝賞金（万円）
  qualificationCriteria: string; // 出場資格の概要
}

// 選手の成績データ
export interface RacerPerformance {
  racerId: string;
  name: string;
  branch: string;
  rank: string; // A1, A2, B1, B2
  
  // 基本成績
  winRate: number;           // 勝率
  avgStartTiming: number;    // 平均スタートタイミング
  
  // 優勝回数
  sgWins: number;           // SG優勝回数
  g1Wins: number;           // G1優勝回数
  g2Wins: number;           // G2優勝回数
  generalWins: number;      // 一般戦優勝回数
  
  // 獲得賞金
  totalPrizeMoney: number;  // 獲得賞金（万円）
  prizeRanking: number;     // 賞金ランキング順位
  
  // SG成績
  sgAppearances: number;    // SG出場回数
  sgFinalAppearances: number; // SG優出回数
  sgPoints: number;         // SG得点（グランドチャンピオン用）
  
  // G2以上の成績
  g2PlusPoints: number;     // G2以上の着順点（オーシャンカップ用）
  g2PlusFinalPoints: number; // G2以上の全レース着順点
  
  // ファン投票
  fanVotes?: number;        // ファン投票得票数（オールスター用）
  fanVoteRank?: number;     // ファン投票順位
  
  // 期間別勝率（ダービー用）
  periodWinRate?: number;   // 選考期間中の勝率
  
  // 出場回数（A1級判定用）
  raceAppearances?: number; // 出場回数
}

// SG出場資格判定結果
export interface QualificationResult {
  racerId: string;
  racer: RacerPerformance;
  sgType: SGRaceType;
  qualified: boolean;       // 出場資格あり
  qualificationReason: string; // 選出理由（例: "前年優勝者（シード）", "勝率上位"）
  rank: number;             // 選出順位
  borderlineDistance: number; // ボーダーラインまでの距離（+なら当確、-なら落選）
  stats: {                  // 判定に使用した統計値
    [key: string]: number | string;
  };
}

// SG出場資格基準
export interface QualificationCriteria {
  sgType: SGRaceType;
  name: string;
  selectionPeriod: string;  // 選考期間
  totalSlots: number;       // 総出場枠
  criteria: Array<{
    priority: number;       // 優先度（1が最優先）
    description: string;    // 選出基準の説明
    slots: number | 'remaining'; // 枠数
    method: string;         // 選出方法（例: "勝率順", "得点順", "ファン投票順"）
  }>;
  borderlineHistory: Array<{ // 過去のボーダーライン
    year: number;
    value: string;
  }>;
}

// 2026年SG開催スケジュール
export const SG_SCHEDULE_2026: SGRace[] = [
  {
    id: 'classic-2026',
    type: 'CLASSIC',
    name: 'ボートレースクラシック',
    fullName: '第61回ボートレースクラシック（鳳凰賞・総理大臣杯）',
    startDate: '2026-03-24',
    endDate: '2026-03-29',
    venue: '蒲郡',
    venueCode: '14',
    prizeMoney: 4200,
    qualificationCriteria: '前年のSG・G1・G2優勝者、一般戦優勝回数上位'
  },
  {
    id: 'allstar-2026',
    type: 'ALL_STAR',
    name: 'ボートレースオールスター',
    fullName: '第53回ボートレースオールスター（笹川賞）',
    startDate: '2026-05-26',
    endDate: '2026-05-31',
    venue: '浜名湖',
    venueCode: '15',
    prizeMoney: 4200,
    qualificationCriteria: 'ファン投票上位選手（A1級）'
  },
  {
    id: 'grandchampion-2026',
    type: 'GRAND_CHAMPION',
    name: 'グランドチャンピオン',
    fullName: '第36回グランドチャンピオン決定戦',
    startDate: '2026-06-23',
    endDate: '2026-06-28',
    venue: '鳴門',
    venueCode: '21',
    prizeMoney: 3800,
    qualificationCriteria: '過去1年間のSG優出完走・予選得点上位'
  },
  {
    id: 'oceancup-2026',
    type: 'OCEAN_CUP',
    name: 'オーシャンカップ',
    fullName: '第31回オーシャンカップ',
    startDate: '2026-07-28',
    endDate: '2026-08-02',
    venue: 'びわこ',
    venueCode: '19',
    prizeMoney: 3700,
    qualificationCriteria: 'G2以上の優勝戦着順点上位'
  },
  {
    id: 'memorial-2026',
    type: 'MEMORIAL',
    name: 'ボートレースメモリアル',
    fullName: '第72回ボートレースメモリアル',
    startDate: '2026-08-25',
    endDate: '2026-08-30',
    venue: '桐生',
    venueCode: '01',
    prizeMoney: 4200,
    qualificationCriteria: '開催地を含む全24場の推薦選手'
  },
  {
    id: 'derby-2026',
    type: 'DERBY',
    name: 'ボートレースダービー',
    fullName: '第73回ボートレースダービー（全日本選手権）',
    startDate: '2026-10-27',
    endDate: '2026-11-01',
    venue: '尼崎',
    venueCode: '17',
    prizeMoney: 4200,
    qualificationCriteria: '選考期間中の勝率上位'
  },
  {
    id: 'challenge-2026',
    type: 'CHALLENGE_CUP',
    name: 'チャレンジカップ',
    fullName: '第32回チャレンジカップ',
    startDate: '2026-11-24',
    endDate: '2026-11-29',
    venue: '常滑',
    venueCode: '16',
    prizeMoney: 3700,
    qualificationCriteria: '獲得賞金ランキング上位'
  },
  {
    id: 'grandprix-2026',
    type: 'GRAND_PRIX',
    name: 'グランプリ',
    fullName: '第41回グランプリ（賞金王決定戦）',
    startDate: '2026-12-21',
    endDate: '2026-12-26',
    venue: '大村',
    venueCode: '24',
    prizeMoney: 11000,
    qualificationCriteria: '獲得賞金ランキング1位～18位'
  }
];
