#!/usr/bin/env node

/**
 * データ投入スクリプト
 * 賞金ランキングとファン投票から選手データを取得してD1に格納
 */

const BASE_URL = 'https://scheduled.shinta7023.workers.dev';

async function fetchPrizeRanking() {
  console.log('📊 賞金ランキングを取得中...');
  const response = await fetch(`${BASE_URL}/api/prize-ranking`);
  const data = await response.json();
  console.log(`✅ 賞金ランキング: ${data.rankings.length}件取得`);
  return data.rankings;
}

async function fetchFanVoteRanking() {
  console.log('💜 ファン投票ランキングを取得中...');
  const response = await fetch(`${BASE_URL}/api/fan-vote-ranking`);
  const data = await response.json();
  console.log(`✅ ファン投票: ${data.rankings.length}件取得`);
  return data.rankings;
}

async function fetchRacerInfo(racerId) {
  const response = await fetch(`${BASE_URL}/api/racer/${racerId}`);
  const data = await response.json();
  return data.racer;
}

async function fetchRacerPerformance(racerId) {
  const response = await fetch(`${BASE_URL}/api/racer-performance/${racerId}`);
  return response.json();
}

async function main() {
  console.log('🚀 データ投入スクリプト開始\n');

  // Step 1: ランキングデータ取得
  const prizeRankings = await fetchPrizeRanking();
  const fanVoteRankings = await fetchFanVoteRanking();

  // Step 2: ユニークな選手IDリストを作成
  const racerIds = new Set();
  
  prizeRankings.forEach(r => {
    if (r.registrationNumber) {
      racerIds.add(parseInt(r.registrationNumber));
    }
  });
  
  fanVoteRankings.forEach(r => {
    if (r.registrationNumber) {
      racerIds.add(parseInt(r.registrationNumber));
    }
  });

  console.log(`\n📝 ユニークな選手: ${racerIds.size}名\n`);

  // Step 3: 選手データを取得
  const racers = [];
  const performances = [];
  let count = 0;

  for (const racerId of Array.from(racerIds).slice(0, 150)) { // 最初の150名
    try {
      count++;
      process.stdout.write(`\r選手データ取得中... ${count}/${Math.min(150, racerIds.size)}`);

      const [racer, performance] = await Promise.all([
        fetchRacerInfo(racerId),
        fetchRacerPerformance(racerId)
      ]);

      if (racer && racer.id) {
        // 賞金ランキング情報を追加
        const prizeInfo = prizeRankings.find(p => 
          parseInt(p.registrationNumber) === racerId
        );
        
        // ファン投票情報を追加
        const voteInfo = fanVoteRankings.find(v => 
          parseInt(v.registrationNumber) === racerId
        );

        racers.push({
          racer_id: racer.id,
          name: racer.name,
          branch: racer.branch,
          rank: racer.rank,
          win_rate: racer.winRate
        });

        if (performance) {
          performances.push({
            racer_id: racerId,
            sg_wins: performance.sgWins || 0,
            g1_wins: performance.g1Wins || 0,
            g2_wins: performance.g2Wins || 0,
            general_wins: performance.generalWins || 0,
            total_prize_money: prizeInfo ? 
              parseInt(prizeInfo.prizeMoney.replace(/[¥,]/g, '')) : 0,
            prize_ranking: prizeInfo ? prizeInfo.rank : null,
            fan_vote_count: voteInfo ? voteInfo.voteCount : 0,
            fan_vote_ranking: voteInfo ? voteInfo.rank : null
          });
        }
      }

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`\n❌ 選手${racerId}の取得に失敗:`, error.message);
    }
  }

  console.log('\n\n✅ データ取得完了\n');

  // Step 4: SQLファイルを生成
  let sql = '-- 選手データ投入スクリプト（自動生成）\n';
  sql += `-- 生成日時: ${new Date().toISOString()}\n`;
  sql += `-- 選手数: ${racers.length}名\n\n`;

  sql += '-- トランザクション開始\n';
  sql += 'BEGIN TRANSACTION;\n\n';

  sql += '-- 選手マスター投入\n';
  racers.forEach(r => {
    sql += `INSERT OR REPLACE INTO racers (racer_id, name, branch, rank, win_rate) VALUES (${r.racer_id}, '${r.name.replace(/'/g, "''")}', '${r.branch || ''}', '${r.rank || ''}', ${r.win_rate || 0});\n`;
  });

  sql += '\n-- 選手成績投入\n';
  performances.forEach(p => {
    sql += `INSERT OR REPLACE INTO racer_performances (racer_id, sg_wins, g1_wins, g2_wins, general_wins, total_prize_money, prize_ranking, fan_vote_count, fan_vote_ranking) VALUES (${p.racer_id}, ${p.sg_wins}, ${p.g1_wins}, ${p.g2_wins}, ${p.general_wins}, ${p.total_prize_money}, ${p.prize_ranking || 'NULL'}, ${p.fan_vote_count}, ${p.fan_vote_ranking || 'NULL'});\n`;
  });

  sql += '\n-- 同期履歴記録\n';
  sql += `INSERT INTO sync_history (sync_type, records_count, status, completed_at) VALUES ('racers', ${racers.length}, 'success', datetime('now'));\n`;
  sql += `INSERT INTO sync_history (sync_type, records_count, status, completed_at) VALUES ('performances', ${performances.length}, 'success', datetime('now'));\n`;

  sql += '\n-- トランザクションコミット\n';
  sql += 'COMMIT;\n';

  // ファイルに書き込み
  const fs = require('fs');
  const outputPath = './scripts/seed_data.sql';
  fs.writeFileSync(outputPath, sql);

  console.log(`📄 SQLファイル生成: ${outputPath}`);
  console.log(`📊 選手マスター: ${racers.length}件`);
  console.log(`📊 選手成績: ${performances.length}件\n`);

  // サマリーJSON出力
  const summary = {
    generatedAt: new Date().toISOString(),
    totalRacers: racers.length,
    totalPerformances: performances.length,
    racerIds: racers.map(r => r.racer_id).sort((a, b) => a - b)
  };

  fs.writeFileSync('./scripts/seed_summary.json', JSON.stringify(summary, null, 2));
  console.log('📄 サマリーファイル生成: ./scripts/seed_summary.json\n');

  console.log('🎉 データ投入スクリプト完了！\n');
  console.log('次のステップ:');
  console.log('1. wrangler d1 create boatrace-db');
  console.log('2. wrangler d1 execute boatrace-db --file=./schema.sql');
  console.log('3. wrangler d1 execute boatrace-db --file=./scripts/seed_data.sql');
}

main().catch(console.error);
