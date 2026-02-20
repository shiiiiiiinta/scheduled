# 🌐 Web上でWorkerをデプロイする方法

ローカル環境でコマンドを実行する必要はありません！Cloudflare Dashboardから直接Workerをデプロイできます。

---

## 📋 手順（5分で完了）

### Step 1: Cloudflare Dashboardにアクセス

1. https://dash.cloudflare.com/ にログイン
2. 左メニューから **Workers & Pages** をクリック
3. 右上の **Create** ボタンをクリック
4. **Create Worker** を選択

### Step 2: Workerの基本設定

1. **Worker name** を入力:
   ```
   boatrace-api-worker
   ```
   （または任意の名前）

2. **Deploy** ボタンをクリック
   - これで空のWorkerが作成されます

### Step 3: Workerのコードを編集

1. デプロイ後、自動的にエディタ画面が開きます
   - または、Worker一覧から **boatrace-api-worker** をクリック → **Edit code** をクリック

2. 左側のエディタに以下のコードを貼り付けます：

<details>
<summary>📄 Workerコード（クリックして展開）</summary>

```javascript
/**
 * Cloudflare Worker for Boatrace API Proxy
 */

// CORS ヘッダーを設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// HTMLをパースしてJSONに変換するヘルパー関数
class HTMLParser {
  static parseRacerInfo(html) {
    try {
      const nameMatch = html.match(/<div[^>]*class="[^"]*racer_name[^"]*"[^>]*>([^<]+)<\/div>/);
      const name = nameMatch ? nameMatch[1].trim() : null;

      const numberMatch = html.match(/登録番号[：:]?\s*(\d{4})/);
      const id = numberMatch ? numberMatch[1] : null;

      const branchMatch = html.match(/支部[：:]?\s*([^\s<]+)/);
      const branch = branchMatch ? branchMatch[1] : null;

      const rankMatch = html.match(/級別[：:]?\s*([AB][12])/);
      const rank = rankMatch ? rankMatch[1] : null;

      const winRateMatch = html.match(/勝率[：:]?\s*([\d.]+)/);
      const winRate = winRateMatch ? parseFloat(winRateMatch[1]) : null;

      return { id, name, branch, rank, winRate };
    } catch (error) {
      console.error('選手情報のパースエラー:', error);
      return null;
    }
  }

  static parseSchedule(html) {
    try {
      const races = [];
      const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      let match;

      while ((match = tableRowRegex.exec(html)) !== null) {
        const rowHtml = match[1];
        const dateMatch = rowHtml.match(/(\d{1,2})月(\d{1,2})日/);
        if (!dateMatch) continue;

        const venueMatch = rowHtml.match(/>(桐生|戸田|江戸川|平和島|多摩川|浜名湖|蒲郡|常滑|津|三国|びわこ|住之江|尼崎|鳴門|丸亀|児島|宮島|徳山|下関|若松|芦屋|福岡|唐津|大村)</);
        const venueName = venueMatch ? venueMatch[1] : null;

        const gradeMatch = rowHtml.match(/>(SG|G1|G2|G3|一般)</);
        const grade = gradeMatch ? gradeMatch[1] : '一般';

        if (venueName) {
          races.push({
            date: `${dateMatch[1]}/${dateMatch[2]}`,
            venueName,
            grade,
          });
        }
      }
      return races;
    } catch (error) {
      console.error('出走予定のパースエラー:', error);
      return [];
    }
  }

  static parseRaceList(html) {
    try {
      const races = [];
      const raceCardRegex = /<div[^>]*class="[^"]*race[-_]?card[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
      let match;

      while ((match = raceCardRegex.exec(html)) !== null) {
        const cardHtml = match[1];
        const nameMatch = cardHtml.match(/class="[^"]*race[-_]?name[^"]*">([^<]+)</);
        const raceName = nameMatch ? nameMatch[1].trim() : null;

        const venueMatch = cardHtml.match(/>(桐生|戸田|江戸川|平和島|多摩川|浜名湖|蒲郡|常滑|津|三国|びわこ|住之江|尼崎|鳴門|丸亀|児島|宮島|徳山|下関|若松|芦屋|福岡|唐津|大村)</);
        const venueName = venueMatch ? venueMatch[1] : null;

        const gradeMatch = cardHtml.match(/>(SG|G1|G2|G3)/);
        const grade = gradeMatch ? gradeMatch[1] : null;

        const dateMatch = cardHtml.match(/(\d{1,2})月(\d{1,2})日/g);
        
        if (raceName && venueName && grade) {
          races.push({ raceName, venueName, grade, dates: dateMatch || [] });
        }
      }
      return races;
    } catch (error) {
      console.error('レース一覧のパースエラー:', error);
      return [];
    }
  }
}

// メインハンドラー
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 選手情報取得
    if (path.startsWith('/api/racer/')) {
      const racerId = path.split('/').pop();
      const response = await fetch(
        `https://www.boatrace.jp/owpc/pc/data/racersearch/season?toban=${racerId}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const racerInfo = HTMLParser.parseRacerInfo(html);
      const schedule = HTMLParser.parseSchedule(html);

      return new Response(
        JSON.stringify({ racer: racerInfo, schedule: schedule }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // G1以上のレース一覧取得
    if (path === '/api/races/g1') {
      const response = await fetch(
        `https://www.boatrace.jp/owpc/pc/race/index?jyo=24`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const races = HTMLParser.parseRaceList(html);

      return new Response(
        JSON.stringify({ races: races.filter(r => r.grade === 'SG' || r.grade === 'G1') }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ルートが見つからない
    return new Response(
      JSON.stringify({ error: 'エンドポイントが見つかりません' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('エラー:', error);
    return new Response(
      JSON.stringify({ error: 'サーバーエラーが発生しました', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// イベントリスナー
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
```

</details>

3. 上記のコード全体をコピー

4. Cloudflare Dashboardのエディタに貼り付け
   - 既存のコードを全て削除して、新しいコードを貼り付け

5. 右上の **Save and Deploy** をクリック

### Step 4: WorkerのURLを取得

デプロイが完了すると、以下のようなURLが表示されます：

```
https://boatrace-api-worker.your-subdomain.workers.dev
```

**このURLをコピーしてください！**

### Step 5: テストする

ブラウザで以下のURLにアクセスして動作確認：

```
https://boatrace-api-worker.your-subdomain.workers.dev/api/racer/4444
```

JSONレスポンスが返れば成功です！

---

## 🔗 フロントエンドと連携

### Step 6: Cloudflare Pagesの環境変数を設定

1. Cloudflare Dashboard → **Workers & Pages**
2. プロジェクト **scheduled** をクリック
3. **Settings** → **Environment variables**
4. **Add variable** をクリック
5. 以下を入力：
   ```
   Variable name: VITE_API_BASE_URL
   Value: https://boatrace-api-worker.your-subdomain.workers.dev
   ```
   ※Step 4でコピーしたURLを貼り付け

6. **Production** と **Preview** の両方にチェック
7. **Save** をクリック

### Step 7: フロントエンドを再デプロイ

1. **Deployments** タブに移動
2. 最新のデプロイ → **⋯** → **Retry deployment**

---

## ✅ 完了！

これでWeb上だけでWorkerのデプロイが完了しました！

---

## 📝 補足情報

### Workerの編集方法

後でWorkerのコードを編集したい場合：

1. Cloudflare Dashboard → **Workers & Pages**
2. **boatrace-api-worker** をクリック
3. **Edit code** をクリック
4. コードを編集
5. **Save and Deploy** をクリック

### Workerの設定

Worker名やルートなどの設定を変更したい場合：

1. Worker → **Settings**
2. 各種設定を変更可能

### ログの確認

Workerのエラーログを確認する場合：

1. Worker → **Logs**
2. **Begin log stream** をクリック
3. リアルタイムでログが表示されます

---

## 🎉 メリット

### Web上でデプロイする利点

- ✅ ローカル環境不要
- ✅ Wranglerのインストール不要
- ✅ ブラウザだけで完結
- ✅ すぐに編集・再デプロイ可能
- ✅ リアルタイムでテスト可能

---

## 🆘 トラブルシューティング

### デプロイボタンが見つからない

**Workers & Pages** → 右上の **Create** ボタン → **Create Worker**

### コードが長すぎてエラー

エディタの制限はありません。全コードを貼り付けてください。

### WorkerのURLがわからない

Worker → **Settings** → **Domains & Routes** で確認できます。

---

**これでWeb上だけでWorkerのデプロイが完了です！🎊**
