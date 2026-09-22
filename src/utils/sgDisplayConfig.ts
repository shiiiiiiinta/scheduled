// 各SGレースごとの出場選手一覧の表示設定
// - どの指標を主軸に並べるか
// - どの列を表示するか
// - 各選手の「選出区分（なぜ選ばれたか）」をどう推定・表示するか
import type { SGRaceType } from '../types/sg';

// 表示に使う選手行データ（SGDetailPage の EntryRow と対応）
export interface SGEntryInput {
  racerId: string;
  name: string;
  rank?: string;          // 級別（A1など）
  branch?: string;        // 支部
  prizeRank?: number;     // 獲得賞金ランキング順位
  prizeMoney?: number;    // 獲得賞金
  fanVoteRank?: number;   // ファン投票順位
  fanVotes?: number;      // ファン投票数
}

export type PrimaryAxis = 'prize' | 'fanVote';

export interface SGDisplayConfig {
  // 並び替えの主軸
  primaryAxis: PrimaryAxis;
  // 表示する列
  showPrize: boolean;      // 獲得賞金列
  showFanVote: boolean;    // ファン投票列
  showRankClass: boolean;  // 級別列
  showBranch: boolean;     // 支部列
  // 一覧上部の説明
  note: string;
  // 選出区分ラベル（主軸順位＋枠数から推定）
  categoryLabel: (entry: SGEntryInput, indexInSorted: number, totalSlots: number) => string;
}

// 賞金主軸レースの共通「選出区分」推定
const prizeCategory = (entry: SGEntryInput, _i: number, totalSlots: number): string => {
  if (typeof entry.prizeRank !== 'number') return 'ランキング対象外';
  if (entry.prizeRank <= totalSlots) return `獲得賞金 ${entry.prizeRank}位（選出圏内）`;
  return `獲得賞金 ${entry.prizeRank}位（圏外）`;
};

// ファン投票主軸レースの「選出区分」推定
const fanVoteCategory = (entry: SGEntryInput, _i: number, totalSlots: number): string => {
  if (typeof entry.fanVoteRank !== 'number') return 'ファン投票対象外';
  if (entry.fanVoteRank <= totalSlots) return `ファン投票 ${entry.fanVoteRank}位（選出圏内）`;
  return `ファン投票 ${entry.fanVoteRank}位（圏外）`;
};

export const SG_DISPLAY_CONFIG: Record<SGRaceType, SGDisplayConfig> = {
  // グランプリ：獲得賞金ランキング1〜18位。賞金額と順位のみ表示、他列は不要
  GRAND_PRIX: {
    primaryAxis: 'prize',
    showPrize: true,
    showFanVote: false,
    showRankClass: false,
    showBranch: true,
    note: '獲得賞金ランキング上位18名が出場します（賞金順に表示）。',
    categoryLabel: (entry, _i, totalSlots) => {
      if (typeof entry.prizeRank !== 'number') return '—';
      const slot = totalSlots || 18;
      return entry.prizeRank <= slot
        ? `賞金 ${entry.prizeRank}位（本戦出場）`
        : `賞金 ${entry.prizeRank}位（トライアル外）`;
    },
  },

  // チャレンジカップ：獲得賞金ランキング上位
  CHALLENGE_CUP: {
    primaryAxis: 'prize',
    showPrize: true,
    showFanVote: false,
    showRankClass: true,
    showBranch: true,
    note: '獲得賞金ランキング上位者が出場します（賞金順に表示）。',
    categoryLabel: prizeCategory,
  },

  // オールスター：ファン投票上位（A1級）
  ALL_STAR: {
    primaryAxis: 'fanVote',
    showPrize: false,
    showFanVote: true,
    showRankClass: true,
    showBranch: true,
    note: 'ファン投票の上位選手（A1級）が中心に選出されます（ファン投票順に表示）。',
    categoryLabel: fanVoteCategory,
  },

  // クラシック：SG/G1/G2優勝者、地区優勝、一般戦優勝回数上位など（賞金を主軸に補助表示）
  CLASSIC: {
    primaryAxis: 'prize',
    showPrize: true,
    showFanVote: false,
    showRankClass: true,
    showBranch: true,
    note: '前年の各SG・G1・G2優勝者、地区選手権優勝者、一般戦優勝回数上位などから選出されます。',
    categoryLabel: prizeCategory,
  },

  // グランドチャンピオン：SG優出完走・予選得点上位
  GRAND_CHAMPION: {
    primaryAxis: 'prize',
    showPrize: true,
    showFanVote: false,
    showRankClass: true,
    showBranch: true,
    note: '過去1年間のSG優出完走者・予選得点上位者から選出されます。',
    categoryLabel: prizeCategory,
  },

  // オーシャンカップ：G2以上の優勝戦着順点上位
  OCEAN_CUP: {
    primaryAxis: 'prize',
    showPrize: true,
    showFanVote: false,
    showRankClass: true,
    showBranch: true,
    note: 'G2以上の優勝戦着順点上位者から選出されます。',
    categoryLabel: prizeCategory,
  },

  // メモリアル：全24場の推薦選手
  MEMORIAL: {
    primaryAxis: 'prize',
    showPrize: true,
    showFanVote: false,
    showRankClass: true,
    showBranch: true,
    note: '開催地を含む全24場からの推薦選手により構成されます。',
    categoryLabel: prizeCategory,
  },

  // ダービー：選考期間中の勝率上位
  DERBY: {
    primaryAxis: 'prize',
    showPrize: true,
    showFanVote: false,
    showRankClass: true,
    showBranch: true,
    note: '選考期間中の勝率上位者から選出されます。',
    categoryLabel: prizeCategory,
  },
};
