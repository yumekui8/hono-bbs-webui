# デプロイ手順

hono-bbs-webui は Vite でビルドした静的サイトを **Cloudflare Pages** にホストします。
デプロイには Cloudflare の CLI ツール **Wrangler** を使用します。

---

## 目次

1. [前提条件](#前提条件)
2. [初回セットアップ](#初回セットアップ)
3. [ローカル開発](#ローカル開発)
4. [本番デプロイ](#本番デプロイ)
5. [環境変数](#環境変数)
6. [SPA ルーティングの設定](#spa-ルーティングの設定)
7. [デプロイ履歴・ロールバック](#デプロイ履歴ロールバック)

---

## 前提条件

| 要件 | 確認方法 |
|---|---|
| Node.js 18 以上 | `node -v` |
| npm | `npm -v` |
| Cloudflare アカウント | [dash.cloudflare.com](https://dash.cloudflare.com) |
| Wrangler CLI | `npx wrangler --version` |

Wrangler はプロジェクトローカルにインストールせず `npx` で実行できます。
固定バージョンが必要な場合は devDependencies に追加してください。

```bash
npm install --save-dev wrangler
```

---

## 初回セットアップ

### 1. Cloudflare にログイン

```bash
npx wrangler login
```

ブラウザが開き、Cloudflare アカウントへの認可を求められます。承認するとターミナルに戻ります。

ログイン状態の確認:

```bash
npx wrangler whoami
```

### 2. Cloudflare Pages プロジェクトを作成

**方法 A: wrangler で作成（推奨）**

```bash
# プロジェクト名を指定して作成（production ブランチを main に設定）
npx wrangler pages project create hono-bbs-webui --production-branch main
```

**方法 B: Cloudflare ダッシュボードで作成**

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com) → Workers & Pages → Pages
2. 「Create a project」→「Direct Upload」を選択
3. プロジェクト名（例: `hono-bbs-webui`）を入力して作成

### 3. wrangler.toml を作成

プロジェクトルートに以下の内容で `wrangler.toml` を作成します。

```toml
name = "hono-bbs-webui"
pages_build_output_dir = "dist"
```

---

## ローカル開発

### 通常の開発サーバー（Vite）

バックエンド（hono-bbs）と合わせて起動します。

```bash
# 1. 環境変数を設定（初回のみ）
cp .env.example .env.local
# .env.local の VITE_API_BASE_URL を確認（デフォルト: /api/v1）

# 2. 依存関係インストール（初回のみ）
npm install

# 3. バックエンドを起動（別ターミナル）
cd ../hono-bbs && npm run dev   # http://localhost:8787 で起動

# 4. フロントエンド開発サーバーを起動
npm run dev   # http://localhost:5173 で起動
```

`/api` へのリクエストは Vite の開発プロキシが `http://localhost:8787` に転送します。

### wrangler pages dev（Pages 環境に近い動作確認）

Cloudflare Pages のランタイムを模擬した環境で動作確認できます。
事前にビルドが必要です。

```bash
npm run build
npx wrangler pages dev dist
# http://localhost:8788 で起動
```

> **注意**: `wrangler pages dev` は静的ファイルを配信するだけです。
> API へのリクエストはバックエンドへ別途プロキシされないため、
> `VITE_API_BASE_URL` にバックエンドの完全な URL を指定した上でビルドしてください。

---

## 本番デプロイ

### 手動デプロイ

```bash
# 1. ビルド
npm run build

# 2. Cloudflare Pages にデプロイ
npx wrangler pages deploy dist
```

`wrangler.toml` の `name` が一致するプロジェクトに自動的にデプロイされます。
プロジェクト名を明示する場合:

```bash
npx wrangler pages deploy dist --project-name hono-bbs-webui
```

### ブランチプレビューデプロイ

`--branch` を指定すると、production 以外のプレビュー環境にデプロイできます。

```bash
npx wrangler pages deploy dist --branch feature/my-branch
```

デプロイされた URL は以下の形式になります:
- production: `https://hono-bbs-webui.pages.dev`
- preview: `https://<branch-hash>.hono-bbs-webui.pages.dev`

### package.json にスクリプトを追加する場合

```json
{
  "scripts": {
    "deploy": "npm run build && npx wrangler pages deploy dist",
    "deploy:preview": "npm run build && npx wrangler pages deploy dist --branch preview"
  }
}
```

---

## 環境変数

`VITE_` プレフィックスの変数は **ビルド時に埋め込まれる**静的な値です。
Cloudflare Pages のランタイム環境変数とは異なり、ビルドを実行するタイミングで確定します。

### ローカル環境（.env.local）

```
VITE_API_BASE_URL=/api/v1
```

`.env.local` はバージョン管理対象外（`.gitignore` 推奨）です。
`.env.example` をコピーして使用してください。

### 本番環境（Cloudflare Pages ダッシュボード）

1. Cloudflare ダッシュボード → Workers & Pages → プロジェクト → Settings → Environment variables
2. `VITE_API_BASE_URL` を追加

| 変数名 | production 値の例 | 説明 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.example.com/api/v1` | バックエンド API のベース URL |

設定後は再デプロイが必要です（環境変数はビルド時に適用されます）。

### wrangler CLI で環境変数を設定する場合

Pages の環境変数は `wrangler pages secret` ではなく、ダッシュボードまたは `wrangler.toml` で管理します。
ただし `VITE_` 変数は秘匿情報ではないため `wrangler.toml` に記載して構いません。

```toml
name = "hono-bbs-webui"
pages_build_output_dir = "dist"

[vars]
VITE_API_BASE_URL = "https://api.example.com/api/v1"
```

> **注意**: `wrangler.toml` の `[vars]` は Pages のランタイム変数として設定されますが、
> Vite の `VITE_` 変数はビルド時に参照されるため、実際には `.env.production` または
> ダッシュボードのビルド環境変数として設定する必要があります。
> 本番用の値を固定する場合は `.env.production` を使用してください（要: `.gitignore` で秘匿）。

---

## SPA ルーティングの設定

React Router を使用しているため、`/boards/test` などの URL に直接アクセスすると
Cloudflare Pages がファイルを見つけられず 404 になります。

`public/_redirects` に以下を記述することで、すべてのパスを `index.html` にフォールバックさせます。

```
/*  /index.html  200
```

このファイルはビルド時に `dist/_redirects` としてコピーされ、
Cloudflare Pages が自動的に SPA ルーティング用のリダイレクトとして認識します。

> `public/_redirects` はすでにリポジトリに含まれています。

---

## デプロイ履歴・ロールバック

### デプロイ一覧を確認

```bash
npx wrangler pages deployment list --project-name hono-bbs-webui
```

### 特定バージョンにロールバック

```bash
# デプロイID を指定してロールバック
npx wrangler pages deployment rollback <deployment-id> --project-name hono-bbs-webui
```

### デプロイ詳細を確認

```bash
npx wrangler pages deployment tail --project-name hono-bbs-webui
```

---

## トラブルシューティング

### ページリロードで 404 になる

`public/_redirects` が正しく作成されているか確認してください（[SPA ルーティングの設定](#spa-ルーティングの設定) 参照）。

### API が 404 / CORS エラーになる

- `VITE_API_BASE_URL` がビルド時に正しく設定されているか確認してください
- バックエンドの CORS 設定でフロントエンドのオリジンが許可されているか確認してください

### wrangler login が失敗する

ブラウザで Cloudflare にログイン済みであることを確認し、再試行してください。
CI/CD 環境では `CLOUDFLARE_API_TOKEN` 環境変数を使用します。

```bash
export CLOUDFLARE_API_TOKEN=<your-api-token>
npx wrangler pages deploy dist --project-name hono-bbs-webui
```

API トークンは Cloudflare ダッシュボード → My Profile → API Tokens から作成できます。
必要な権限: `Cloudflare Pages:Edit`
