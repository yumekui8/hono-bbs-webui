# 認証機能

## 概要

- **Turnstileセッション**: 全 POST/PUT/DELETE リクエストで `X-Turnstile-Session` ヘッダーが必要
- **ログインセッション**: ログイン必須エンドポイントで `X-Session-Id` ヘッダーが必要

---

## Turnstile フロー

1. 設定画面 `/settings` → 「Turnstile トークン取得」リンクをクリック
2. 同一タブで `${VITE_API_BASE_URL}/auth/turnstile` へ遷移（Referer ヘッダ自動付与）
3. バックエンドが Turnstile 検証後、Referer URL に `?setTurnstileToken=TOKEN` を付けてリダイレクト
4. アプリ起動時に `TurnstileTokenHandler`（`App.tsx`）がクエリパラメータを検出してトークンを Cookie に保存

### TurnstileTokenHandler

```typescript
// App.tsx 内
function TurnstileTokenHandler() {
  const { setTurnstileSession } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("setTurnstileToken"); // 大文字T に注意
    if (token) {
      setTurnstileSession(token);
      const url = new URL(window.location.href);
      url.searchParams.delete("setTurnstileToken");
      navigate(url.pathname + url.search, { replace: true });
    }
  }, []);
  return null;
}
```

---

## セッション管理

| 種別 | 保存先 | 有効期限 |
|---|---|---|
| Turnstile セッション | Cookie (`ts_session`, 7日) | 24時間（バックエンド側） |
| ログインセッション | localStorage (`auth`) | 24時間（バックエンド側） |

---

## AuthContext API

```typescript
const {
  isLoggedIn,       // boolean
  userId,           // string | null
  sessionId,        // string | null
  identityUser,     // IdentityUser | null
  turnstileSession, // string | null
  signIn,           // (id, password) => Promise<void>
  signUp,           // (id, password, displayName?) => Promise<void>
  logout,           // () => Promise<void>
  updateProfile,    // ({ displayName?, bio?, email?, currentPassword?, newPassword? }) => Promise<void>
  updatePassword,   // ({ currentPassword, newPassword }) => Promise<void>
  refreshIdentityUser, // () => Promise<void>
  setTurnstileSession, // (id: string) => void
  clearTurnstileSession, // () => void
} = useAuth();
```

### パスワード変更について

パスワード変更は `PUT /profile` に `currentPassword`/`newPassword` フィールドを含めて送信する（専用エンドポイントは存在しない）。`updatePassword` は内部で `updateProfile` に委譲する。

---

## APIエンドポイント

| エンドポイント | 用途 |
|---|---|
| `POST /auth/turnstile` | Turnstile セッション発行 |
| `POST /auth/login` | ログイン（`X-Turnstile-Session` 必須） |
| `POST /auth/logout` | ログアウト（`X-Session-Id` 必須） |
| `POST /identity/users` | ユーザ登録 |
| `GET /profile` | プロフィール取得 |
| `PUT /profile` | プロフィール更新・パスワード変更 |
