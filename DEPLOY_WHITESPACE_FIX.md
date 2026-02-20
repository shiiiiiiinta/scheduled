# 🚨 Deploy Command の全角スペースエラーを解決

## 問題

```
Executing user deploy command: 　
/bin/sh: 1: 　: not found
Failed: error occurred while running deploy command
```

**Deploy command に全角スペース（　）が入っています！** これが原因でエラーになっています。

---

## ✅ 解決方法（手順）

### Step 1: Cloudflare Dashboard にアクセス

1. https://dash.cloudflare.com/ にログイン
2. **Workers & Pages** をクリック
3. プロジェクト **scheduled** をクリック

### Step 2: 設定を開く

1. **Settings** タブをクリック
2. **Builds & deployments** をクリック
3. **Build configurations** セクションを見つける
4. **Edit configuration** をクリック

### Step 3: Deploy command を完全にクリア

**重要**: 以下の手順を正確に実行してください

1. **Deploy command** フィールドをクリック
2. **Ctrl+A**（Macの場合は **Command+A**）で全選択
3. **Delete** キーまたは **Backspace** キーで削除
4. フィールドが**完全に空**であることを確認
   - カーソルが見えるだけで、スペースも何も入っていないこと
   - 全角スペースや半角スペースも含めて**何も入力しない**

### Step 4: ダミーコマンドを入力（Deploy command が必須の場合のみ）

もし Deploy command が必須フィールドの場合：

1. **英数字モードに切り替え**（全角入力モードをOFF）
2. 以下を**コピー&ペースト**：
   ```
   echo "Deployment complete"
   ```
3. 入力後、**余計なスペースが入っていないか確認**

### Step 5: 保存して再デプロイ

1. **Save** をクリック
2. **Deployments** タブに移動
3. 最新の失敗したデプロイ → **⋯** → **Retry deployment**

---

## 🎯 正しい設定値

| 項目 | 値 |
|------|-----|
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (空欄) |
| Deploy command | `echo "Deployment complete"` または 空欄 |

---

## ⚠️ 注意事項

### やってはいけないこと

❌ 全角スペース（　）を入力
❌ 半角スペースだけを入力
❌ 改行だけを入力
❌ タブだけを入力

### 正しい入力方法

✅ **完全に空**（何も入力しない）
✅ または `echo "Deployment complete"`（コピー&ペースト推奨）

---

## 🔍 確認方法

Deploy command が正しく設定されているか確認：

### パターン1: 空欄の場合
```
Deploy command: 
```
カーソルが見えるだけで、何も表示されていない

### パターン2: ダミーコマンドの場合
```
Deploy command: echo "Deployment complete"
```
正確にこの文字列が表示されている

---

## 💡 なぜこのエラーが出るのか？

全角スペース（　）は**コマンドではない**ため、シェルが実行しようとしてエラーになります。

```
/bin/sh: 1: 　: not found
```

これは「`　`というコマンドが見つかりません」というエラーです。

---

## 🎉 これで解決！

Deploy command を正しく設定すれば、デプロイが成功します。

### 成功時のログ

```
✓ built in 2.85s
Success: Build command completed
Executing user deploy command: echo "Deployment complete"
Deployment complete
✓ Deployment complete
```

または

```
✓ built in 2.85s
Success: Build command completed
✓ Deployment complete
```

---

## 📋 チェックリスト

設定を確認：

- [ ] Deploy command フィールドを**Ctrl+A → Delete**で完全に削除した
- [ ] 全角スペースが入っていない
- [ ] 半角スペースだけが入っていない
- [ ] `echo "Deployment complete"` を**コピー&ペースト**で入力した（必須の場合）
- [ ] 入力後に余計なスペースがないか確認した

---

## 🆘 それでもエラーが出る場合

### トラブルシューティング

1. **ブラウザのキャッシュをクリア**
   - Ctrl+Shift+R（Macは Command+Shift+R）でページをリロード

2. **別のブラウザで試す**
   - Chrome、Firefox、Safariなど

3. **Deploy command を完全に削除してから再入力**
   - フィールドをクリック → Ctrl+A → Delete → 再入力

4. **Cloudflare サポートに問い合わせ**
   - 設定が保存されない場合は技術的な問題の可能性

---

**重要**: 全角入力モードをOFFにしてから、コピー&ペーストで入力することを強く推奨します。

次のステップ → [WEB_WORKER_DEPLOY.md](https://github.com/shiiiiiiinta/scheduled/blob/main/WEB_WORKER_DEPLOY.md)
