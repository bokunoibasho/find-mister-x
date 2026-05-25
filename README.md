# MISTER X を探せ

スコットランドヤード風の鬼ごっこ型ボードゲーム。隠れて逃げる **ミスターX** を、複数の刑事が
タクシー / バス / 地下鉄のチケットを使って追い詰めます。iPhone の Safari で動く **オフライン対応 PWA** です。

公開URL: https://bokunoibasho.github.io/find-mister-x/

## 特徴

- 1人プレイ vs AI（サーバー不要・完全オフライン）
- **刑事チーム** と **ミスターX** のどちらの役割でもプレイ可能
- 〜199 駅・3 層の交通網（タクシー / バス / 地下鉄）＋ 黒チケット専用のフェリー航路を持つ独自マップ
- 本家準拠のルール: 浮上ラウンド（3・8・13・18・24）、移動ログによる推理、ダブルムーブ、黒チケット
- 信念状態（候補地推理）ベースの刑事 AI と、距離・退路を評価するミスターX 逃走 AI
- 途中状態の自動保存・再開（localStorage）
- iPhone の「ホーム画面に追加」でスタンドアロン起動・セーフエリア対応

> 注: 本ゲームは Scotland Yard（Ravensburger 社）の盤面・名称を複製したものではなく、
> ゲーム性を参考にした独自実装です。マップは決定論的に手続き生成しています。

## 遊び方

1. 役割（刑事 / ミスターX）、刑事の人数（3〜5）、難易度を選んで開始。
2. 自分の駒を動かせる駅がハイライトされます。駅をタップして移動（複数の交通手段がある場合は選択）。
3. **刑事側**: ミスターX は浮上ラウンドにだけ姿を現します。移動ログ（使った交通手段）から現在地を推理。
   「推理補助」で候補地を盤面に表示できます。
4. **ミスターX側**: 刑事の包囲をかわし、24 ラウンド逃げ切れば勝利。窮地ではダブルムーブで一気に距離を稼ぎます。
5. 刑事がミスターX と同じ駅に入れば刑事の勝ち。24 ラウンド逃げ切ればミスターX の勝ち。

地図は二本指ピンチでズーム、ドラッグでパンできます。

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm run test       # ルール / AI / UI のテスト（vitest）
npm run build      # 本番ビルド（PWA 生成）
npm run preview    # 本番ビルドのプレビュー
npm run gen:board  # 盤面 (src/data/board.json) を再生成
npm run gen:icons  # アイコン (public/) を再生成
```

### 技術スタック

React + TypeScript + Vite / vite-plugin-pwa (Workbox) / zustand / SVG 描画。
盤面生成は d3-delaunay（開発時のみ）。

## デプロイ（GitHub Pages）

`.github/workflows/deploy.yml` が `main` への push（および本ブランチ）で自動ビルド・公開します。
初回のみ、リポジトリの **Settings → Pages → Build and deployment → Source** を
**GitHub Actions** に設定してください。

サブパス配信のため `vite.config.ts` の `base` は `/find-mister-x/` に設定しています。
