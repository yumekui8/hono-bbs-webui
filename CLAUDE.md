# hono-bbs-webui

## プロジェクト概要

`hono-bbs` バックエンドAPIに対するWebGUIを提供する静的コンテンツプロジェクト。
JAMスタックで開発し、Cloudflare Pages にデプロイする。

## 技術スタック

| 項目 | 採用技術 |
|---|---|
| フレームワーク | React |
| ビルドツール | Vite |
| スタイリング | Tailwind CSS |
| パッケージマネージャー | npm |
| デプロイ | Cloudflare Pages |

## API仕様

バックエンドAPIの仕様は `docs/api.md` を参照。

主なエンドポイント:
- `POST /auth/turnstile` — Turnstile セッション取得
- `POST /auth/signin` / `POST /auth/signup` / `POST /auth/logout` — 認証
- `GET /boards/` — 板一覧
- `GET /boards/:boardId/threads/` — スレッド一覧
- `GET /boards/:boardId/threads/:threadId` — スレッド詳細 + 投稿一覧
- `POST /boards/:boardId/threads/` — スレッド作成
- `POST /boards/:boardId/threads/:threadId/posts/` — 投稿

## 認証・セッション仕様

- **Turnstile セッション**: 全 POST/PUT/DELETE で `X-Turnstile-Session` ヘッダーが必須
- **ログインセッション**: ログイン必須エンドポイントで `X-Session-Id` ヘッダーが必須
- セッションは両方ともブラウザ側で保持する（localStorage / sessionStorage）
- 開発環境では `DISABLE_TURNSTILE=true` のバックエンドを使用し、Turnstileセッションに `"dev-turnstile-disabled"` を使う

## ルーティング

| パス | ページ |
|---|---|
| `/` | トップページ（板一覧抜粋） |
| `/boards` | 板一覧 |
| `/boards/:boardId` | スレッド一覧 |
| `/boards/:boardId/threads/new` | スレッド作成 |
| `/boards/:boardId/threads/:threadId` | スレッド閲覧・投稿 |
| `/login` | ログイン |

## ディレクトリ構成

```
src/
  api/
    client.ts       # ベースAPIクライアント（ApiRequestErrorクラス含む）
    auth.ts         # 認証関連API
    boards.ts       # 板・スレッド・投稿関連API
  components/
    layout/
      Header.tsx    # ヘッダー（ナビ・テーマ切替・ログイン状態）
      Layout.tsx    # 共通レイアウト
    ui/
      Button.tsx    # ボタンコンポーネント
      Loading.tsx   # ローディングスピナー
      ErrorMessage.tsx  # エラー表示
  contexts/
    ThemeContext.tsx # light/dark/system テーマ管理
    AuthContext.tsx  # ログイン状態・Turnstileセッション管理
  pages/
    TopPage.tsx         # /
    BoardListPage.tsx   # /boards
    ThreadListPage.tsx  # /boards/:boardId
    ThreadPage.tsx      # /boards/:boardId/threads/:threadId
    NewThreadPage.tsx   # /boards/:boardId/threads/new
    LoginPage.tsx       # /login
  types/
    api.ts          # APIレスポンスの型定義
```

## 開発方針

- `docs/api.md` の仕様に忠実に実装する
- コンポーネントは機能単位で分割する
- API通信は `src/api/` 配下のモジュールにまとめる
- 環境変数 `VITE_API_BASE_URL` でAPIのベースURLを切り替え可能
- テーマは `localStorage` に保存、Turnstileセッションは `sessionStorage` に保存

## 開発コマンド

```bash
cp .env.example .env.local   # 環境変数設定
npm install                  # 依存関係インストール
npm run dev                  # 開発サーバー起動
npm run build                # 本番ビルド
npm run preview              # ビルド結果のプレビュー
```

## 注意事項

- Cloudflare Turnstile の検証が必要なため、開発環境では `DISABLE_TURNSTILE=true` のバックエンドを使用すること
- APIのベースパスはデフォルト `/api/v1`（`VITE_API_BASE_URL` 環境変数で上書き可能）
- `ApiRequestError` は `src/api/client.ts` にエクスポートされており、エラーコードで分岐可能
