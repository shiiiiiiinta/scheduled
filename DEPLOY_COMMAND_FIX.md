# 🚨 Deploy Command エラーの解決方法

## 問題

ビルドログを見ると：
```
✓ built in 2.92s
Success: Build command completed
Executing user deploy command: npx wrangler deploy  ← これが問題！
✘ [ERROR] Missing entry-point to Worker script
```

**ビルドは成功**していますが、その後に`npx wrangler deploy`が実行されてエラーになっています。

---

## ✅ 解決方法

Cloudflare Pagesの **Deploy command** を削除します。

### Step 1: Cloudflare Dashboardにアクセス

1. https://dash.cloudflare.com/ にログイン
2. **Workers & Pages** をクリック
3. プロジェクト **scheduled** をクリック

### Step 2: ビルド設定を開く

1. **Settings** タブをクリック
2. **Builds & deployments** をクリック
3. 下にスクロールして **Build configurations** を見つける

### Step 3: Deploy commandを削除

以下の設定を確認・修正：

#### 現在の設定（問題）
```
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Deploy command: npx wrangler deploy  ← これを削除！
```

#### 正しい設定
```
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Deploy command: echo "Deployment complete"  ← ダミーコマンド（必須の場合）
```

**注意**: もし Deploy command が必須フィールドの場合、`echo "Deployment complete"` や `echo "No additional deployment needed"` など、**何もしないダミーコマンド**を入力してください。

### Step 4: 保存

1. **Edit configuration** をクリック
2. **Deploy command** フィールドを以下のいずれかに設定：
   - **完全に空** にする（可能な場合）
   - または `echo "Deployment complete"` と入力（必須の場合）
3. **Save** をクリック

### Step 5: 再デプロイ

1. **Deployments** タブに移動
2. 最新の失敗したデプロイ → **⋯** → **Retry deployment**

---

## 🎯 正しい設定値

Cloudflare Pagesで設定すべき項目：

| 項目 | 値 |
|------|-----|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (空欄) |
| Deploy command | **（空欄 or `echo "Deployment complete"`）** |
| Node.js version | 18 または auto |

---

## 📋 チェックリスト

設定を確認：

- [ ] Framework preset が `Vite` になっている
- [ ] Build command が `npm run build` になっている
- [ ] Build output directory が `dist` になっている
- [ ] Deploy command が **空欄** になっている
- [ ] Root directory が空欄になっている

---

## 💡 なぜこのエラーが出るのか？

### 問題の流れ

```
1. npm run build を実行
   ↓ 成功 ✓
2. dist/ ディレクトリが生成される
   ↓ 成功 ✓
3. npx wrangler deploy を実行
   ↓ エラー ✗
   Workerのコードがないためエラー
```

### 正しい流れ

```
1. npm run build を実行
   ↓ 成功 ✓
2. dist/ ディレクトリが生成される
   ↓ 成功 ✓
3. dist/ をCloudflare Pagesにデプロイ
   ↓ 完了 ✓
```

---

## 🎉 これで解決！

Deploy commandを削除すれば、デプロイが成功します。

### 次のステップ

1. **Deploy commandを削除**
2. **再デプロイを実行**
3. **成功を確認**
4. **Workerを別途デプロイ**（[WEB_WORKER_DEPLOY.md](https://github.com/shiiiiiiinta/scheduled/blob/main/WEB_WORKER_DEPLOY.md)）

---

## 🔍 設定の確認方法

### Deploy commandが設定されているか確認

Cloudflare Pages → Settings → Builds & deployments → Build configurations

以下のように表示されているか確認：
- **Deploy command**: (空欄)

もし何か入っていたら削除してください。

---

## 🆘 それでもエラーが出る場合

### 確認事項

1. **Deploy commandが完全に空か確認**
   - スペースも入っていないこと

2. **Build commandが正しいか確認**
   - `npm run build` のみ
   - `wrangler`が含まれていないこと

3. **キャッシュをクリア**
   - Deployments → Retry deployment → Clear cache and retry

---

**重要**: Cloudflare PagesではWorkerをデプロイしません。フロントエンドのみです！

Workerは別途、Cloudflare Dashboardから手動でデプロイしてください。
→ [WEB_WORKER_DEPLOY.md](https://github.com/shiiiiiiinta/scheduled/blob/main/WEB_WORKER_DEPLOY.md)
