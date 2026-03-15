# hono-bbs-webui

[hono-bbs](https://github.com/yumekui8/hono-bbs) バックエンド向けの Web フロントエンドです。
Cloudflare Pages にデプロイする静的サイトとして動作します。

## スクリーンショット

> 準備中

## 特徴

- スマホ・PC 両対応のレスポンシブデザイン
- ライト / ダーク / グレー / ライトグレー テーマ対応
- スワイプジェスチャーによるページ遷移（モバイル）
- 板・スレッド・投稿の閲覧・書き込み
- 閲覧履歴・未読管理
- NG ワード / NG ID フィルター
- Cloudflare Turnstile による書き込みスパム対策

## 技術スタック

| 項目 | 採用技術 |
|---|---|
| UI ライブラリ | React 19 |
| ビルドツール | Vite 7 |
| スタイリング | Tailwind CSS v4 |
| ルーティング | React Router v7 |
| デプロイ | Cloudflare Pages |

## セットアップ

### 前提条件

- Node.js 20 以上
- [hono-bbs](https://github.com/yumekui8/hono-bbs) バックエンドが起動していること

### インストール

```bash
git clone https://github.com/yumekui8/hono-bbs-webui.git
cd hono-bbs-webui
npm install
```

### 環境変数

```bash
cp .env.example .env.local
```

`.env.local` を編集します。

| 変数名 | 説明 | デフォルト |
|---|---|---|
| `VITE_API_BASE_URL` | バックエンド API のベース URL | `/api/v1` |

**開発環境での注意**: Vite の開発サーバーはデフォルトで `/api` へのリクエストを `http://localhost:8787` にプロキシします（`vite.config.ts` 参照）。バックエンドをローカルで起動している場合は `VITE_API_BASE_URL=/api/v1` のまま使用できます。

**本番環境**: `VITE_API_BASE_URL` にバックエンドの URL を指定します（例: `https://your-api.workers.dev/api/v1`）。本番用の環境変数は `.env.production` に記載しますが、**リポジトリにはコミットしないでください**。

### 開発サーバーの起動

```bash
npm run dev
```

`http://localhost:5173` でアクセスできます。

## ビルド・デプロイ

### ビルド

```bash
npm run build
```

`dist/` ディレクトリにビルド成果物が出力されます。

### Cloudflare Pages へのデプロイ

Cloudflare Pages のダッシュボードから Git リポジトリを連携し、以下を設定します。

| 設定項目 | 値 |
|---|---|
| ビルドコマンド | `npm run build` |
| 出力ディレクトリ | `dist` |
| 環境変数 | `VITE_API_BASE_URL` = バックエンドの URL |

SPA のルーティングのため、`public/_redirects` に以下の内容を配置してください（すでに含まれています）。

```
/* /index.html 200
```

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動（HMR あり）
npm run build    # 本番ビルド（TypeScript チェック込み）
npm run preview  # ビルド成果物のプレビュー
npm run lint     # ESLint によるコードチェック
```

## プロジェクト構成

```
src/
  api/              # APIクライアント（boards, auth）
  components/
    layout/         # レイアウト（Header, Layout, Sidebar）
    ui/             # 共通UIコンポーネント
  contexts/         # React Context（Auth, Theme, Settings, Layout）
  hooks/            # カスタムフック（スワイプジェスチャーなど）
  pages/            # ページコンポーネント
  types/            # API レスポンスの型定義
  utils/            # ユーティリティ（履歴管理, NG フィルター等）
docs/
  endpoints/        # バックエンド API 仕様（Markdown）
```

## 関連リポジトリ

- **バックエンド**: [yumekui8/hono-bbs](https://github.com/yumekui8/hono-bbs) — Hono + Cloudflare Workers + D1

## ライセンス

MIT License — 詳細は [LICENSE](./LICENSE) を参照してください。
