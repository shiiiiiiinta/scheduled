import type {
  SGRaceType,
  RacerPerformance,
  QualificationResult,
  QualificationCriteria
} from '../types/sg';

// 各SGの出場資格基準定義
export const SG_QUALIFICATION_CRITERIA: Record<SGRaceType, QualificationCriteria> = {
  CLASSIC: {
    sgType: 'CLASSIC',
    name: 'ボートレースクラシック',
    selectionPeriod: '前年1月1日～12月31日',
    totalSlots: 52,
    criteria: [
      { priority: 1, description: '前年優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 2, description: '前年グランプリ優勝戦出場者（シード）', slots: 6, method: 'シード' },
      { priority: 3, description: '前年各SG優勝者', slots: 'remaining', method: 'SG優勝' },
      { priority: 4, description: 'G1・G2優勝者', slots: 'remaining', method: '優勝回数' },
      { priority: 5, description: '地区選手権優勝者', slots: 6, method: '地区優勝' },
      { priority: 6, description: '一般戦優勝回数上位', slots: 'remaining', method: '優勝回数・勝率順' }
    ],
    borderlineHistory: [
      { year: 2024, value: '一般戦V5 / 勝率7.24' },
      { year: 2023, value: '一般戦V4 / 勝率7.39' },
      { year: 2022, value: '一般戦V6 / 勝率7.30' },
      { year: 2021, value: '一般戦V5 / 勝率7.07' }
    ]
  },
  ALL_STAR: {
    sgType: 'ALL_STAR',
    name: 'ボートレースオールスター',
    selectionPeriod: '前年12月～当年2月（ファン投票）',
    totalSlots: 52,
    criteria: [
      { priority: 1, description: '前年優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 2, description: '前年グランプリ優勝戦出場者（シード）', slots: 6, method: 'シード' },
      { priority: 3, description: '当年クラシック優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 4, description: 'ファン投票上位（A1級）', slots: 'remaining', method: 'ファン投票順' },
      { priority: 5, description: '選考委員会推薦', slots: 'remaining', method: '推薦' }
    ],
    borderlineHistory: [
      { year: 2024, value: 'ファン投票1位: 峰竜太（22,497票）' },
      { year: 2023, value: 'ファン投票1位: 池田浩二（23,071票）' },
      { year: 2022, value: 'ファン投票1位: 毒島誠（26,575票）' },
      { year: 2021, value: 'ファン投票1位: 峰竜太（34,968票）' }
    ]
  },
  GRAND_CHAMPION: {
    sgType: 'GRAND_CHAMPION',
    name: 'グランドチャンピオン',
    selectionPeriod: '前年オールスター～当年クラシック',
    totalSlots: 52,
    criteria: [
      { priority: 1, description: '前年優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 2, description: '前年グランプリ優勝戦出場者（シード）', slots: 6, method: 'シード' },
      { priority: 3, description: '当年オールスター優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 4, description: 'SG優出完走者', slots: 'remaining', method: 'SG優出回数' },
      { priority: 5, description: '予選得点合計上位', slots: 'remaining', method: '得点順' }
    ],
    borderlineHistory: [
      { year: 2024, value: '90点' },
      { year: 2023, value: '82点' },
      { year: 2022, value: '77点' },
      { year: 2021, value: '83点' }
    ]
  },
  OCEAN_CUP: {
    sgType: 'OCEAN_CUP',
    name: 'オーシャンカップ',
    selectionPeriod: '前年5月1日～当年4月30日',
    totalSlots: 52,
    criteria: [
      { priority: 1, description: '前年優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 2, description: '前年グランプリ優勝戦出場者（シード）', slots: 6, method: 'シード' },
      { priority: 3, description: '当年グランドチャンピオン優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 4, description: 'G2以上優勝戦着順点上位', slots: 'remaining', method: '着順点順' }
    ],
    borderlineHistory: [
      { year: 2024, value: '20点 / 着順点632点' },
      { year: 2023, value: '20点 / 着順点782点' },
      { year: 2022, value: '20点 / 着順点490点' },
      { year: 2021, value: '18点 / 着順点471点' }
    ]
  },
  MEMORIAL: {
    sgType: 'MEMORIAL',
    name: 'ボートレースメモリアル',
    selectionPeriod: '随時（各競艇場推薦）',
    totalSlots: 52,
    criteria: [
      { priority: 1, description: '前年優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 2, description: '前年グランプリ優勝戦出場者（シード）', slots: 6, method: 'シード' },
      { priority: 3, description: '当年オーシャンカップ優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 4, description: '各競艇場推薦（23場×2名）', slots: 46, method: '競艇場推薦' },
      { priority: 5, description: '開催場推薦', slots: 'remaining', method: '開催場推薦' }
    ],
    borderlineHistory: [
      { year: 2024, value: '各場2名推薦' },
      { year: 2023, value: '各場2名推薦' }
    ]
  },
  DERBY: {
    sgType: 'DERBY',
    name: 'ボートレースダービー',
    selectionPeriod: '前年8月1日～当年7月31日',
    totalSlots: 52,
    criteria: [
      { priority: 1, description: '前年優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 2, description: '前年グランプリ優勝戦出場者（シード）', slots: 6, method: 'シード' },
      { priority: 3, description: '当年メモリアル優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 4, description: '選考期間中の勝率上位（A1級160回以上出場）', slots: 'remaining', method: '勝率順' }
    ],
    borderlineHistory: [
      { year: 2024, value: '勝率7.50（A1級）' },
      { year: 2023, value: '勝率7.45（A1級）' },
      { year: 2022, value: '勝率7.42（A1級）' }
    ]
  },
  CHALLENGE_CUP: {
    sgType: 'CHALLENGE_CUP',
    name: 'チャレンジカップ',
    selectionPeriod: '当年1月1日～10月31日',
    totalSlots: 52,
    criteria: [
      { priority: 1, description: '前年グランプリ優勝戦出場者（シード）', slots: 6, method: 'シード' },
      { priority: 2, description: '当年ダービー優勝者（シード）', slots: 1, method: 'シード' },
      { priority: 3, description: '獲得賞金ランキング上位', slots: 'remaining', method: '賞金順' }
    ],
    borderlineHistory: [
      { year: 2024, value: '賞金ランキング60位前後' },
      { year: 2023, value: '賞金ランキング58位前後' }
    ]
  },
  GRAND_PRIX: {
    sgType: 'GRAND_PRIX',
    name: 'グランプリ',
    selectionPeriod: '当年1月1日～12月31日',
    totalSlots: 18,
    criteria: [
      { priority: 1, description: '獲得賞金ランキング1位～18位', slots: 18, method: '賞金順' }
    ],
    borderlineHistory: [
      { year: 2024, value: '賞金ランキング18位' },
      { year: 2023, value: '賞金ランキング18位' }
    ]
  }
};

// SG出場資格判定関数
export function evaluateQualification(
  racers: RacerPerformance[],
  sgType: SGRaceType
): QualificationResult[] {
  const criteria = SG_QUALIFICATION_CRITERIA[sgType];

  switch (sgType) {
    case 'CLASSIC':
      return evaluateClassicQualification(racers, criteria);
    case 'ALL_STAR':
      return evaluateAllStarQualification(racers, criteria);
    case 'GRAND_CHAMPION':
      return evaluateGrandChampionQualification(racers, criteria);
    case 'OCEAN_CUP':
      return evaluateOceanCupQualification(racers, criteria);
    case 'MEMORIAL':
      return evaluateMemorialQualification(racers, criteria);
    case 'DERBY':
      return evaluateDerbyQualification(racers, criteria);
    case 'CHALLENGE_CUP':
      return evaluateChallengeCupQualification(racers, criteria);
    case 'GRAND_PRIX':
      return evaluateGrandPrixQualification(racers, criteria);
    default:
      return [];
  }
}

// クラシック出場資格判定
function evaluateClassicQualification(
  racers: RacerPerformance[],
  criteria: QualificationCriteria
): QualificationResult[] {
  let rank = 1;

  // 一般戦優勝回数と勝率でソート
  const sortedRacers = [...racers].sort((a, b) => {
    if (b.generalWins !== a.generalWins) {
      return b.generalWins - a.generalWins;
    }
    return b.winRate - a.winRate;
  });

  // ボーダーライン計算（上位52名）
  const borderlineIndex = Math.min(51, sortedRacers.length - 1);
  const borderlineRacer = sortedRacers[borderlineIndex];

  const results: QualificationResult[] = sortedRacers.map((racer, index) => {
    const qualified = index < criteria.totalSlots;
    const distance = qualified
      ? (racer.generalWins - borderlineRacer.generalWins) * 10 +
        (racer.winRate - borderlineRacer.winRate)
      : (racer.generalWins - borderlineRacer.generalWins) * 10 +
        (racer.winRate - borderlineRacer.winRate);

    return {
      racerId: racer.racerId,
      racer,
      sgType: 'CLASSIC',
      qualified,
      qualificationReason: qualified
        ? `一般戦優勝${racer.generalWins}回 / 勝率${racer.winRate.toFixed(2)}`
        : `ボーダー外（一般戦V${racer.generalWins} / 勝率${racer.winRate.toFixed(2)}）`,
      rank: rank++,
      borderlineDistance: distance,
      stats: {
        generalWins: racer.generalWins,
        winRate: racer.winRate,
        borderline: `V${borderlineRacer.generalWins} / ${borderlineRacer.winRate.toFixed(2)}`
      }
    };
  });

  return results;
}

// オールスター出場資格判定
function evaluateAllStarQualification(
  racers: RacerPerformance[],
  criteria: QualificationCriteria
): QualificationResult[] {
  let rank = 1;

  // A1級のみをフィルタ
  const a1Racers = racers.filter((r) => r.rank === 'A1');

  // ファン投票順でソート
  const sortedRacers = [...a1Racers].sort((a, b) => {
    return (b.fanVotes || 0) - (a.fanVotes || 0);
  });

  // ボーダーライン計算
  const borderlineIndex = Math.min(51, sortedRacers.length - 1);
  const borderlineRacer = sortedRacers[borderlineIndex];
  const borderlineVotes = borderlineRacer.fanVotes || 0;

  const results: QualificationResult[] = sortedRacers.map((racer, index) => {
    const qualified = index < criteria.totalSlots;
    const distance = (racer.fanVotes || 0) - borderlineVotes;

    return {
      racerId: racer.racerId,
      racer,
      sgType: 'ALL_STAR',
      qualified,
      qualificationReason: qualified
        ? `ファン投票${index + 1}位（${racer.fanVotes || 0}票）`
        : `ファン投票${index + 1}位（ボーダー外）`,
      rank: rank++,
      borderlineDistance: distance,
      stats: {
        fanVotes: racer.fanVotes || 0,
        fanVoteRank: index + 1,
        rank: racer.rank,
        borderline: `${borderlineVotes}票`
      }
    };
  });

  return results;
}

// グランドチャンピオン出場資格判定
function evaluateGrandChampionQualification(
  racers: RacerPerformance[],
  criteria: QualificationCriteria
): QualificationResult[] {
  let rank = 1;

  // SG得点でソート
  const sortedRacers = [...racers].sort((a, b) => {
    return b.sgPoints - a.sgPoints;
  });

  // ボーダーライン計算
  const borderlineIndex = Math.min(51, sortedRacers.length - 1);
  const borderlineRacer = sortedRacers[borderlineIndex];
  const borderlinePoints = borderlineRacer.sgPoints;

  const results: QualificationResult[] = sortedRacers.map((racer, index) => {
    const qualified = index < criteria.totalSlots;
    const distance = racer.sgPoints - borderlinePoints;

    return {
      racerId: racer.racerId,
      racer,
      sgType: 'GRAND_CHAMPION',
      qualified,
      qualificationReason: qualified
        ? `SG得点${racer.sgPoints}点（優出${racer.sgFinalAppearances}回）`
        : `SG得点${racer.sgPoints}点（ボーダー外）`,
      rank: rank++,
      borderlineDistance: distance,
      stats: {
        sgPoints: racer.sgPoints,
        sgFinalAppearances: racer.sgFinalAppearances,
        borderline: `${borderlinePoints}点`
      }
    };
  });

  return results;
}

// オーシャンカップ出場資格判定
function evaluateOceanCupQualification(
  racers: RacerPerformance[],
  criteria: QualificationCriteria
): QualificationResult[] {
  let rank = 1;

  // G2以上の着順点でソート
  const sortedRacers = [...racers].sort((a, b) => {
    if (b.g2PlusPoints !== a.g2PlusPoints) {
      return b.g2PlusPoints - a.g2PlusPoints;
    }
    return b.g2PlusFinalPoints - a.g2PlusFinalPoints;
  });

  // ボーダーライン計算
  const borderlineIndex = Math.min(51, sortedRacers.length - 1);
  const borderlineRacer = sortedRacers[borderlineIndex];

  const results: QualificationResult[] = sortedRacers.map((racer, index) => {
    const qualified = index < criteria.totalSlots;
    const distance = racer.g2PlusPoints - borderlineRacer.g2PlusPoints;

    return {
      racerId: racer.racerId,
      racer,
      sgType: 'OCEAN_CUP',
      qualified,
      qualificationReason: qualified
        ? `G2+着順点${racer.g2PlusPoints}点 / 全着順点${racer.g2PlusFinalPoints}点`
        : `着順点${racer.g2PlusPoints}点（ボーダー外）`,
      rank: rank++,
      borderlineDistance: distance,
      stats: {
        g2PlusPoints: racer.g2PlusPoints,
        g2PlusFinalPoints: racer.g2PlusFinalPoints,
        borderline: `${borderlineRacer.g2PlusPoints}点`
      }
    };
  });

  return results;
}

// メモリアル出場資格判定（推薦制）
function evaluateMemorialQualification(
  racers: RacerPerformance[],
  criteria: QualificationCriteria
): QualificationResult[] {
  let rank = 1;

  // 勝率順でソート（推薦基準の参考として）
  const sortedRacers = [...racers].sort((a, b) => b.winRate - a.winRate);

  const results: QualificationResult[] = sortedRacers.map((racer, index) => {
    const qualified = index < criteria.totalSlots;

    return {
      racerId: racer.racerId,
      racer,
      sgType: 'MEMORIAL',
      qualified,
      qualificationReason: qualified
        ? '競艇場推薦（想定）'
        : '推薦枠外（想定）',
      rank: rank++,
      borderlineDistance: 0,
      stats: {
        winRate: racer.winRate,
        sgWins: racer.sgWins,
        totalPrizeMoney: racer.totalPrizeMoney
      }
    };
  });

  return results;
}

// ダービー出場資格判定
function evaluateDerbyQualification(
  racers: RacerPerformance[],
  criteria: QualificationCriteria
): QualificationResult[] {
  let rank = 1;

  // A1級で160回以上出場の選手をフィルタ
  const eligibleRacers = racers.filter(
    (r) => r.rank === 'A1' && (r.raceAppearances || 0) >= 160
  );

  // 勝率順でソート
  const sortedRacers = [...eligibleRacers].sort((a, b) => {
    return b.periodWinRate! - a.periodWinRate!;
  });

  // ボーダーライン計算
  const borderlineIndex = Math.min(51, sortedRacers.length - 1);
  const borderlineRacer = sortedRacers[borderlineIndex];
  const borderlineWinRate = borderlineRacer.periodWinRate || 0;

  const results: QualificationResult[] = sortedRacers.map((racer, index) => {
    const qualified = index < criteria.totalSlots;
    const distance = (racer.periodWinRate || 0) - borderlineWinRate;

    return {
      racerId: racer.racerId,
      racer,
      sgType: 'DERBY',
      qualified,
      qualificationReason: qualified
        ? `勝率${racer.periodWinRate?.toFixed(2)}（A1級・160回以上出場）`
        : `勝率${racer.periodWinRate?.toFixed(2)}（ボーダー外）`,
      rank: rank++,
      borderlineDistance: distance,
      stats: {
        periodWinRate: racer.periodWinRate || 0,
        raceAppearances: racer.raceAppearances || 0,
        rank: racer.rank,
        borderline: borderlineWinRate.toFixed(2)
      }
    };
  });

  return results;
}

// チャレンジカップ出場資格判定
function evaluateChallengeCupQualification(
  racers: RacerPerformance[],
  criteria: QualificationCriteria
): QualificationResult[] {
  let rank = 1;

  // 賞金順でソート
  const sortedRacers = [...racers].sort((a, b) => {
    return b.totalPrizeMoney - a.totalPrizeMoney;
  });

  // ボーダーライン計算
  const borderlineIndex = Math.min(51, sortedRacers.length - 1);
  const borderlineRacer = sortedRacers[borderlineIndex];

  const results: QualificationResult[] = sortedRacers.map((racer, index) => {
    const qualified = index < criteria.totalSlots;
    const distance = racer.totalPrizeMoney - borderlineRacer.totalPrizeMoney;

    return {
      racerId: racer.racerId,
      racer,
      sgType: 'CHALLENGE_CUP',
      qualified,
      qualificationReason: qualified
        ? `賞金ランキング${index + 1}位（${racer.totalPrizeMoney}万円）`
        : `賞金ランキング${index + 1}位（ボーダー外）`,
      rank: rank++,
      borderlineDistance: distance,
      stats: {
        prizeRanking: index + 1,
        totalPrizeMoney: racer.totalPrizeMoney,
        borderline: `${borderlineRacer.totalPrizeMoney}万円`
      }
    };
  });

  return results;
}

// グランプリ出場資格判定
function evaluateGrandPrixQualification(
  racers: RacerPerformance[],
  criteria: QualificationCriteria
): QualificationResult[] {
  let rank = 1;

  // 賞金順でソート
  const sortedRacers = [...racers].sort((a, b) => {
    return b.totalPrizeMoney - a.totalPrizeMoney;
  });

  // ボーダーライン（18位）
  const borderlineIndex = 17;
  const borderlineRacer = sortedRacers[borderlineIndex] || sortedRacers[sortedRacers.length - 1];

  const results: QualificationResult[] = sortedRacers.map((racer, index) => {
    const qualified = index < criteria.totalSlots;
    const distance = racer.totalPrizeMoney - borderlineRacer.totalPrizeMoney;

    return {
      racerId: racer.racerId,
      racer,
      sgType: 'GRAND_PRIX',
      qualified,
      qualificationReason: qualified
        ? `賞金王${index + 1}位（${racer.totalPrizeMoney}万円）`
        : `賞金ランキング${index + 1}位（グランプリシリーズ圏内）`,
      rank: rank++,
      borderlineDistance: distance,
      stats: {
        prizeRanking: index + 1,
        totalPrizeMoney: racer.totalPrizeMoney,
        borderline: `${borderlineRacer.totalPrizeMoney}万円`
      }
    };
  });

  return results;
}

// ボーダーライン+10位までの選手を取得
export function getQualifiedWithMargin(
  results: QualificationResult[],
  margin: number = 10
): QualificationResult[] {
  const lastQualifiedIndex = results.findIndex((r) => !r.qualified);
  if (lastQualifiedIndex === -1) {
    // 全員資格あり
    return results;
  }

  const cutoffIndex = lastQualifiedIndex + margin;
  return results.slice(0, Math.min(cutoffIndex, results.length));
}
