#!/usr/bin/env node

/**
 * 簡易データ投入スクリプト
 * 賞金ランキングAPIから直接SQLを生成（選手詳細取得なし）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://scheduled.shinta7023.workers.dev';

async function main() {
  console.log('🚀 簡易データ投入スクリプト開始\n');

  // 賞金ランキング取得
  console.log('📊 賞金ランキングを取得中...');
  const response = await fetch(`${BASE_URL}/api/prize-ranking`);
  const data = await response.json();
  const rankings = data.rankings;
  console.log(`✅ 賞金ランキング: ${rankings.length}件取得\n`);

  // SQLファイル生成
  let sql = '-- 選手データ投入スクリプト（自動生成）\n';
  sql += `-- 生成日時: ${new Date().toISOString()}\n`;
  sql += `-- 選手数: ${rankings.length}名\n\n`;

  sql += '-- トランザクション開始\n';
  sql += 'BEGIN TRANSACTION;\n\n';

  sql += '-- 選手マスター投入\n';
  rankings.forEach(r => {
    const racerId = parseInt(r.registrationNumber);
    const name = r.name.replace(/'/g, "''");
    const branch = r.branch || '';
    const rankClass = r.rankClass || '';
    
    sql += `INSERT OR REPLACE INTO racers (racer_id, name, branch, rank) VALUES (${racerId}, '${name}', '${branch}', '${rankClass}');\n`;
  });

  sql += '\n-- 選手成績投入\n';
  rankings.forEach(r => {
    const racerId = parseInt(r.registrationNumber);
    const prizeMoney = parseInt(r.prizeMoney.replace(/[¥,]/g, ''));
    const rank = r.rank;
    
    sql += `INSERT OR REPLACE INTO racer_performances (racer_id, total_prize_money, prize_ranking) VALUES (${racerId}, ${prizeMoney}, ${rank});\n`;
  });

  sql += '\n-- 同期履歴記録\n';
  sql += `INSERT INTO sync_history (sync_type, records_count, status, completed_at) VALUES ('racers', ${rankings.length}, 'success', datetime('now'));\n`;
  sql += `INSERT INTO sync_history (sync_type, records_count, status, completed_at) VALUES ('performances', ${rankings.length}, 'success', datetime('now'));\n`;

  sql += '\n-- トランザクションコミット\n';
  sql += 'COMMIT;\n';

  // ファイル出力
  const outputPath = path.join(__dirname, 'seed_data.sql');
  fs.writeFileSync(outputPath, sql);

  console.log(`📄 SQLファイル生成: ${outputPath}`);
  console.log(`📊 選手マスター: ${rankings.length}件`);
  console.log(`📊 選手成績: ${rankings.length}件\n`);

  // サマリーJSON出力
  const summary = {
    generatedAt: new Date().toISOString(),
    totalRacers: rankings.length,
    racerIds: rankings.map(r => parseInt(r.registrationNumber)).sort((a, b) => a - b),
    topRacers: rankings.slice(0, 10).map(r => ({
      rank: r.rank,
      id: r.registrationNumber,
      name: r.name,
      prizeMoney: r.prizeMoney
    }))
  };

  const summaryPath = path.join(__dirname, 'seed_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`📄 サマリーファイル生成: ${summaryPath}\n`);

  console.log('🎉 データ投入スクリプト完了！\n');
  console.log('次のステップ:');
  console.log('1. wrangler d1 create boatrace-db');
  console.log('2. wrangler.toml にdatabase_idを追加');
  console.log('3. wrangler d1 execute boatrace-db --file=./schema.sql');
  console.log('4. wrangler d1 execute boatrace-db --file=./scripts/seed_data.sql');
}

main().catch(console.error);
