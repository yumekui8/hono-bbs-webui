# アーキテクチャ概要

## 技術スタック

| レイヤー | 技術 |
|---|---|
| UI フレームワーク | React 19 + TypeScript |
| ビルド | Vite |
| スタイリング | Tailwind CSS v4 |
| ルーティング | React Router v7 |
| デプロイ | Cloudflare Pages (静的ホスティング) |

---

## ディレクトリ構成

```
src/
  api/            # API 通信層（疎結合）
    client.ts     # ベース HTTP クライアント
    boards.ts     # 掲示板・スレッド・投稿 API
    auth.ts       # 認証 API
  components/
    layout/       # 共通レイアウト（Header, Layout）
    ui/           # 汎用 UI コンポーネント
  contexts/       # React Context（グローバル状態）
    ThemeContext  # テーマ (light/dark/gray/light-gray/system)
    AuthContext   # 認証・Turnstile セッション管理
    SettingsContext # ユーザ設定（NG ワード、デフォルト投稿者名など）
  hooks/          # カスタム React フック
    useSwipeGesture.ts # タッチスワイプジェスチャー検出
  pages/          # ページコンポーネント
  types/
    api.ts        # API レスポンスの型定義
  utils/          # ユーティリティ関数
    cookies.ts    # Cookie 操作
    history.ts    # 閲覧履歴（localStorage）
    ngFilter.ts   # NG フィルタリング
    threadCache.ts # スレッド一覧キャッシュ（localStorage）
```

---

## API 疎結合設計

### 現在の実装

API 通信は `src/api/` 配下に集約し、UI コンポーネントから直接 `fetch` を呼ばない構造。

```
UI コンポーネント
    ↓ 呼び出し
src/api/boards.ts  (boardsApi)
    ↓ 委譲
src/api/client.ts  (apiClient)
    ↓
fetch() → hono-bbs バックエンド
```

### 将来の API 差し替え方針

異なる掲示板 API（例：2ch 互換 API）に対応する場合：

1. `src/types/api.ts` の型定義はそのまま維持（内部データモデル）
2. `src/api/boards.ts` と同じインターフェイスを実装した `src/api/boards2ch.ts` を作成
3. 環境変数 `VITE_API_ADAPTER` で切り替えるか、プラグイン的に注入する

```typescript
// 将来の抽象インターフェイス（必要に応じて追加）
interface BoardsApiAdapter {
  listBoards(): Promise<Board[]>;
  listThreads(boardId: string): Promise<ThreadListResponse>;
  getThread(boardId: string, threadId: string): Promise<ThreadDetailResponse>;
  createPost(boardId: string, threadId: string, data: PostData, ...): Promise<Post>;
}
```

---

## 状態管理

### グローバル状態（Context）

| Context | 永続化先 | 内容 |
|---|---|---|
| `ThemeContext` | localStorage (`theme`) | テーマ設定 |
| `AuthContext` | localStorage (`auth`) + Cookie (`ts_session`) | ログイン状態・Turnstile セッション |
| `SettingsContext` | localStorage (`app_settings`) | NG ワード・デフォルト投稿者名など |

### ローカルキャッシュ（localStorage）

| キー | 内容 |
|---|---|
| `read_history` | 閲覧履歴（最大 `historyMaxCount` 件） |
| `thread_cache_{boardId}` | 板ごとのスレッド一覧キャッシュ（1 世代） |

---

## Turnstile フロー

Cloudflare Turnstile トークンの取得フロー:

1. 設定画面 `/settings` → 「Turnstile トークン取得」リンクをクリック
2. 同一タブで `${VITE_API_BASE_URL}/auth/turnstile` へ遷移（Referer ヘッダ自動付与）
3. バックエンドが Turnstile 検証後、Referer URL に `?setturnstiletoken=TOKEN` を付けてリダイレクト
4. アプリ起動時に `TurnstileTokenHandler` がクエリパラメータを検出してトークンを Cookie に保存

---

## CSS 変数とテーマ

```css
/* ライトテーマ */
:root {
  --bg-surface: #ffffff;  /* ヘッダ・フッタ・カード背景 */
  --bg-page:    #f3f4f6;  /* ページ背景（少し暗め） */
  --link-color: #1e40af;  /* リンク色 */
}
```

テーマクラスは `document.documentElement` に付与される:
- `light`: デフォルト
- `dark`: ダークグレー
- `dark gray`: グレー（`dark` + `gray` クラス両方付与）
- `light-gray`: ライトグレー
