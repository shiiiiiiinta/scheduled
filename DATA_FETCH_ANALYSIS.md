# データ取得の詳細分析

## 🔢 現在のWorkerリクエスト数（1ユーザー・1ページ表示）

### ページロード時のAPIコール

1. **賞金ランキング取得**: 1リクエスト
   - エンドポイント: `/api/prize-ranking`
   - 外部アクセス: `boatrace-grandprix.jp` → 1回
   - 処理時間: 約500-1000ms

2. **ファン投票ランキング取得**: 1リクエスト
   - エンドポイント: `/api/fan-vote-ranking`
   - 外部アクセス: `sp.macour.jp` → 1回
   - 処理時間: 約500-1000ms

3. **選手成績取得（バッチ処理）**: 4リクエスト
   - エンドポイント: `/api/racer-performances?ids=xxx`
   - 75名分を20名ずつ → 4バッチ
   - 各バッチで20名分の個別ページにアクセス
   - 外部アクセス: `boatrace.jp` → 80回（20名×4バッチ）
   - 処理時間: 約2000-4000ms/バッチ

### 合計

```
リクエスト数:
- Workerへのリクエスト: 6回
- 外部サイトへのアクセス: 82回
  - boatrace-grandprix.jp: 1回
  - sp.macour.jp: 1回
  - boatrace.jp: 80回

処理時間:
- 賞金ランキング: 0.5-1秒
- ファン投票: 0.5-1秒
- 選手成績（4バッチ並列）: 2-4秒（最大）
- 合計: 約3-6秒
```

## ⚠️ 現在の問題点

### 1. **毎回リアルタイムで取得**
- キャッシュなし
- 同じデータを何度もスクレイピング
- 外部サイトに負荷をかける
- 応答が遅い

### 2. **Cloudflare Workersの制限**
- 無料プラン: 100,000リクエスト/日
- CPU時間: 10ms/リクエスト（無料）、50ms/リクエスト（有料）
- ※現在の実装は制限を超える可能性あり

### 3. **外部サイトへの負荷**
- 80リクエスト/ページ表示 → 外部サイトに迷惑

## 🚀 推奨される改善策

### **オプション1: Cloudflare KVでキャッシュ（推奨）**

```javascript
// Worker内でキャッシュを実装
const CACHE_TTL = 3600; // 1時間

async function getCachedPrizeRanking() {
  // KVから取得を試みる
  const cached = await PRIZE_RANKING_KV.get('rankings', 'json');
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
    return cached.data;
  }
  
  // キャッシュがない、または古い場合は新規取得
  const fresh = await fetchPrizeRanking();
  await PRIZE_RANKING_KV.put('rankings', JSON.stringify({
    data: fresh,
    timestamp: Date.now()
  }));
  
  return fresh;
}
```

**効果:**
- リクエスト数: 6 → 4（初回のみ6）
- 外部アクセス: 82 → 80（初回のみ82、以降80）
- 処理時間: 3-6秒 → 2-4秒
- キャッシュヒット時: 0.1秒以下

### **オプション2: 定期的なバッチ更新（最適）**

```javascript
// Cloudflare Workers Cron Triggersで定期実行
export default {
  // 1時間ごとに実行
  async scheduled(event, env, ctx) {
    const prizeRanking = await fetchPrizeRanking();
    await env.PRIZE_RANKING_KV.put('rankings', JSON.stringify(prizeRanking));
    
    const fanVoteRanking = await fetchFanVoteRanking();
    await env.FAN_VOTE_KV.put('rankings', JSON.stringify(fanVoteRanking));
  },
  
  // ユーザーリクエスト時はKVから取得のみ
  async fetch(request, env) {
    const prizeRanking = await env.PRIZE_RANKING_KV.get('rankings', 'json');
    return new Response(JSON.stringify(prizeRanking));
  }
}
```

**効果:**
- リクエスト数: 6 → 4
- 外部アクセス: 82 → 80（ユーザー側は0、バックグラウンドで処理）
- 処理時間: 3-6秒 → 2-4秒（賞金・投票は即座）
- ユーザー体感速度: 非常に高速

### **オプション3: 選手成績の効率化**

```javascript
// 主要選手のみ取得、その他は表示時にオンデマンド
const TOP_RACERS = ['4320', '4444', '3960', '4166', '4024']; // 5名

// 初回は上位5名のみ
const performances = await getRacerPerformances(TOP_RACERS);

// 「全表示」クリック時に残りを取得
```

**効果:**
- リクエスト数: 6 → 3
- 外部アクセス: 82 → 7
- 処理時間: 3-6秒 → 1-2秒

## 📊 改善策の比較

| 項目 | 現在 | KVキャッシュ | 定期更新 | 段階的取得 |
|------|------|-------------|----------|-----------|
| Workerリクエスト | 6 | 4-6 | 4 | 3-6 |
| 外部アクセス | 82 | 0-82 | 80 | 7-82 |
| 初回表示時間 | 3-6秒 | 0.1-6秒 | 2-4秒 | 1-2秒 |
| キャッシュ後 | - | 0.1秒 | 0.1秒 | - |
| 実装難易度 | - | 中 | 高 | 低 |
| 月間コスト | $0 | $0-5 | $0-5 | $0 |

## 🎯 推奨実装戦略

### **フェーズ1: 段階的取得（即座に実装可能）**
- 上位5名のみ初回表示
- 「全表示」クリックで残りを取得
- 実装時間: 30分

### **フェーズ2: KVキャッシュ（中期）**
- 賞金・投票ランキングをKVにキャッシュ（1時間）
- 実装時間: 1-2時間
- 追加コスト: ほぼ無料（月間1GB未満）

### **フェーズ3: 定期更新（長期）**
- Cron Triggersで1時間ごとに更新
- 実装時間: 2-3時間
- 追加コスト: $0-5/月

## 🔧 すぐできる改善

### **1. レスポンスヘッダーにキャッシュを追加**

```javascript
return new Response(JSON.stringify(rankings), {
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ
  },
});
```

### **2. ブラウザキャッシュを活用**

```typescript
// フロントエンド側でlocalStorageにキャッシュ
const getCachedRanking = (key: string, ttl: number = 3600000) => {
  const cached = localStorage.getItem(key);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ttl) {
      return data;
    }
  }
  return null;
};
```

## 📈 現在のコスト試算

### Cloudflare無料プランでの制限

```
月間リクエスト: 100,000回/月
1ページ表示: 6リクエスト

月間ページビュー上限: 16,666回
1日あたり上限: 約555回
```

### 改善後（KVキャッシュ使用）

```
月間リクエスト: 100,000回/月
1ページ表示: 4リクエスト（キャッシュヒット時）

月間ページビュー上限: 25,000回
1日あたり上限: 約833回（+50%）
```

## 🚀 次のアクションプラン

1. **今すぐ**: Cache-Controlヘッダー追加（5分で完了）
2. **今日中**: 段階的取得の実装（30分）
3. **今週中**: KVキャッシュの実装（1-2時間）
4. **来週**: Cron Triggersで定期更新（2-3時間）

どれを実装しますか？
