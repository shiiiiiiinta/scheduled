# 🚨 Worker デプロイ確認ガイド

## 現在の状況

エラーメッセージ：
```json
{"error":"エンドポイントが見つかりません"}
```

このエラーは、Workerコードの657行目から返されています。

---

## 🔍 原因

**Cloudflare Dashboardにデプロイされているcoderが古い、または空のWorkerです。**

### なぜこのエラーが出るのか

Workerコードには以下のエンドポイントが実装されています：

1. ✅ `/api/racer/{id}` - 選手情報
2. ✅ `/api/racer-performance/{id}` - 選手成績詳細
3. ✅ `/api/racer-performances?ids=xxx` - 複数選手成績
4. ✅ `/api/races/g1` - G1/SGレース一覧
5. ✅ `/api/prize-ranking` - 賞金ランキング
6. ✅ `/api/fan-vote-ranking` - ファン投票ランキング
7. ✅ `/api/search?q=xxx` - 選手検索

しかし、これらのエンドポイントにアクセスしても「エンドポイントが見つかりません」エラーが返されます。

**結論**: Cloudflareにデプロイされているコードが最新ではありません。

---

## 🛠️ 解決方法：Workerを手動デプロイ

### ステップ1: 最新のWorkerコードを取得

以下のURLから最新のWorkerコードを取得：

**GitHub Raw URL**:
```
https://raw.githubusercontent.com/shiiiiiiinta/scheduled/main/workers/boatrace-api.js
```

### ステップ2: Cloudflare DashboardでWorkerをデプロイ

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン

2. **Workers & Pages** をクリック

3. **Overview** タブであなたのWorkerを探す
   - Worker名を確認（例：`boatrace-api-worker`, `scheduled`, など）

4. Workerをクリック

5. 右上の **Quick Edit** ボタンをクリック

6. エディタが開いたら：
   - **Ctrl+A** (すべて選択)
   - **Delete** (削除)

7. 上記のGitHub Raw URLをブラウザで開く

8. ページ全体のコードをコピー：
   - **Ctrl+A** (すべて選択)
   - **Ctrl+C** (コピー)

9. Cloudflare Workerのエディタに戻る

10. **Ctrl+V** (貼り付け)

11. 右上の **Save and Deploy** ボタンをクリック

12. デプロイ完了を待つ（10〜30秒）

13. ステータスが **Active** になることを確認

### ステップ3: デプロイ確認

ブラウザで以下のURLにアクセスして、JSONデータが返されることを確認：

```bash
# G1レース一覧
https://your-worker-url.workers.dev/api/races/g1

# 賞金ランキング  
https://your-worker-url.workers.dev/api/prize-ranking

# ファン投票
https://your-worker-url.workers.dev/api/fan-vote-ranking

# 選手情報
https://your-worker-url.workers.dev/api/racer/4320

# 選手成績（複数）
https://your-worker-url.workers.dev/api/racer-performances?ids=4320,4444
```

**正常な場合**:
```json
{
  "races": [...],  // または rankings, performances など
  "source": "...",
  "updatedAt": "..."
}
```

**まだエラーの場合**:
```json
{"error":"エンドポイントが見つかりません"}
```
→ Workerコードが正しくデプロイされていません。ステップ2を再実行してください。

---

## 📋 デプロイチェックリスト

以下をすべて確認してください：

- [ ] Cloudflare DashboardでWorkerを開いた
- [ ] Quick Editをクリックした
- [ ] エディタの既存コードをすべて削除した
- [ ] GitHub RawからWorkerコードをコピーした
- [ ] エディタに最新コードを貼り付けた
- [ ] **Save and Deploy** をクリックした
- [ ] デプロイ完了まで待った（10〜30秒）
- [ ] Workerのステータスが **Active** になった
- [ ] Worker URLをブラウザでアクセスしてJSONが返された

---

## 🎯 デプロイ後の動作確認

### 1. Worker APIをブラウザでテスト

5つのエンドポイントすべてにアクセスして、JSONが返されることを確認。

### 2. 診断ページで確認

1. https://scheduled-bvr.pages.dev/diagnostics にアクセス
2. **Ctrl+Shift+R** で強制再読み込み
3. 確認事項：
   - ✅ すべてのAPIエンドポイントが**ステータス200**
   - ✅ `isJSON: true`
   - ✅ `contentType: application/json`
   - ✅ エラーメッセージが表示されない

### 3. 各機能をテスト

- **G1レース一覧**: https://scheduled-bvr.pages.dev/races/g1
- **選手検索**: https://scheduled-bvr.pages.dev/（選手番号4320で検索）
- **SG詳細**: https://scheduled-bvr.pages.dev/sg/classic

すべて実際のデータが表示されることを確認。

---

## 🆘 デプロイがうまくいかない場合

### 問題A: Quick Editボタンが見つからない

**解決策**:
- Workerの詳細ページで、**Edit Code** ボタンを探す
- または、**Code** タブを選択して編集

### 問題B: デプロイ後もエラーが出る

**原因**: コードが正しく貼り付けられていない

**解決策**:
1. Quick Editを再度開く
2. エディタの内容を確認：
   - 最初の行: `/**` または `// CORS`
   - 最後の行: `});`
   - 総行数: 687行
3. もし違っていたら、再度コピー&ペースト

### 問題C: "Worker not found" エラー

**原因**: Worker URLが間違っている

**解決策**:
1. Cloudflare DashboardでWorker URLを再確認
2. Pages環境変数 `VITE_API_BASE_URL` を正しいURLに更新
3. Pagesを再デプロイ

---

## 📚 参考

- **最新Workerコード**: https://raw.githubusercontent.com/shiiiiiiinta/scheduled/main/workers/boatrace-api.js
- **Workerデプロイガイド**: [WORKER_UPDATE_GUIDE.md](./WORKER_UPDATE_GUIDE.md)
- **トラブルシューティング**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## ✅ 成功の確認

デプロイが成功すると：

1. ✅ Worker URLにアクセスして各エンドポイントでJSONが返される
2. ✅ 診断ページですべてステータス200
3. ✅ G1レース一覧に実際のデータが表示される
4. ✅ 選手検索でガントチャートが表示される
5. ✅ SG詳細ページに全75名のデータ、賞金ランキング、ファン投票が表示される

これでWorkerデプロイは完了です！
