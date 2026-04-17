# 🎉 G1/SGレース一覧ページ - 動作確認ガイド

## ✅ デプロイ状況

### Cloudflare Pages（フロントエンド）
- **URL**: https://scheduled-bvr.pages.dev
- **状態**: 自動デプロイ済み（GitHubプッシュから1〜2分で完了）
- **最新コミット**: 384e262 (fix: G1/SGレーススクレイピングのバグ修正)

### Cloudflare Worker（バックエンドAPI）
- **URL**: https://scheduled.shinta7023.workers.dev
- **状態**: 手動デプロイ済み（ユーザーが実施）
- **動作**: スクレイピング成功（実データ取得中）

---

## 🌐 確認URL

### 1. G1/SGレース一覧ページ

**URL**: https://scheduled-bvr.pages.dev/races/g1

**期待される表示**:
- 向こう3ヶ月のSG/G1レースが一覧表示
- 各レースカード:
  - グレードバッジ（SG: 赤色、G1: 黄色）
  - レース名
  - 開催場所（桐生、平和島、住之江など）
  - 開催期間（例: 2026/02/24 - 2026/03/01）
  - 開催日数（6日間など）

### 2. 診断ページ

**URL**: https://scheduled-bvr.pages.dev/diagnostics

**確認項目**:
- `USE_MOCK_DATA: false` ✅
- `/api/races/g1` のステータス: **200** ✅
- `isJSON: true` ✅
- `source: "boatrace.jp"` ✅（モックではない）

### 3. トップページ

**URL**: https://scheduled-bvr.pages.dev/

**操作**:
- 「G1以上のレース一覧を見る」ボタンをクリック
- G1レース一覧ページに遷移

---

## 📊 表示されるレースの例

### SGレース（赤色バッジ）
- **スピードクイーンメモリアル**（鳴門）2026/02/24 - 2026/03/01
- **第32回グランドチャンピオン決定戦**（福岡）2026/03/01 - 2026/03/06
- **第71回ボートレースクラシック**（平和島）2026/03/24 - 2026/03/29
- **オールスター**（住之江）2026/05/26 - 2026/05/31
- など

### G1レース（黄色バッジ）
- **全日本王座決定戦**（芦屋）
- **中国地区選手権**（下関）
- **九州地区選手権**（唐津）
- **四国地区選手権**（鳴門）
- など

---

## 🔄 キャッシュのクリア方法

もし古いデータが表示される場合：

### A. ブラウザの強制再読み込み
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### B. シークレットモードで確認
- ブラウザのシークレット/プライベートモードで開く
- キャッシュの影響を受けない

### C. Cloudflare Pagesのデプロイ確認
1. [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages** → **scheduled-bvr**
3. **Deployments** タブ
4. 最新のデプロイが **Success** になっているか確認

---

## ✅ 正常動作の確認ポイント

### 1. レース件数
- **モックデータ**: 2〜3件のみ
- **実データ**: 10〜20件（向こう3ヶ月分）

### 2. source フィールド
- **診断ページで確認**
- `"source": "boatrace.jp"` → ✅ 実データ
- `"source": "mock"` → ❌ モックデータ

### 3. レース名
- **実データ**: 「スピードクイーンメモリアル」「全日本王座決定戦」など
- **モックデータ**: 「第32回グランドチャンピオン決定戦」のみ

### 4. 開催期間
- **実データ**: 実際の公式スケジュールと一致
- **モックデータ**: 固定の日付

---

## 🎯 トラブルシューティング

### 問題A: 「該当するレースがありません」と表示される

**原因**: APIから空の配列が返されている

**解決策**:
1. Worker APIを直接確認: https://scheduled.shinta7023.workers.dev/api/races/g1
2. `source: "boatrace.jp"` かつ `races: []` の場合 → スクレイピングエラー
3. `source: "mock"` の場合 → Workerのデプロイが古い

### 問題B: モックデータが表示される

**原因**: Workerが更新されていない

**解決策**:
1. Cloudflare Dashboard → Workers → 対象Workerを確認
2. Quick Editで最新コードを再デプロイ
3. https://raw.githubusercontent.com/shiiiiiiinta/scheduled/main/workers/boatrace-api.js

### 問題C: ページが表示されない

**原因**: Pagesのデプロイが完了していない

**解決策**:
1. Cloudflare Dashboard → Workers & Pages → scheduled-bvr → Deployments
2. 最新のデプロイが完了するまで待つ（1〜2分）
3. 完了後、ブラウザで Ctrl+Shift+R

---

## 📱 モバイルでの確認

同じURLでスマートフォンからもアクセス可能：
- https://scheduled-bvr.pages.dev/races/g1

レスポンシブデザインで最適化されています。

---

## 🎉 完成！

以下のURLにアクセスして、実際のG1/SGレースが表示されることを確認してください：

**🏁 G1レース一覧ページ**:
https://scheduled-bvr.pages.dev/races/g1

向こう3ヶ月のSG/G1レースが実データで表示されるはずです！
