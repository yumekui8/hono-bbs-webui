import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { ApiRequestError } from "../api/client";

export function LoginPage() {
  const { signIn, turnstileSession } = useAuth();
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors";

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!userId.trim()) errors.userId = "ユーザIDは必須です";
    if (!password) errors.password = "パスワードは必須です";
    return errors;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});

    if (!turnstileSession) {
      setError("Turnstile トークンが設定されていません。設定ページで設定してください。");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signIn(userId.trim(), password);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "INVALID_CREDENTIALS") {
          setError("ユーザIDまたはパスワードが間違っています");
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("ログインに失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-8 space-y-6">
      <h1 className="text-xl font-semibold">ログイン</h1>

      {!turnstileSession && (
        <div className="px-3 py-2 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
          ログインには Turnstile トークンが必要です。
          <Link to="/settings" className="underline font-medium ml-1">設定ページ</Link>
          で設定してください。
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ユーザID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setFieldErrors((p) => ({ ...p, userId: "" })); }}
            required
            minLength={7}
            maxLength={128}
            autoComplete="username"
            className={inputClass}
            aria-invalid={!!fieldErrors.userId}
          />
          {fieldErrors.userId && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.userId}</p>}
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); }}
            required
            autoComplete="current-password"
            className={inputClass}
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.password}</p>}
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" disabled={submitting || !turnstileSession} className="w-full justify-center">
          {submitting ? "ログイン中..." : "ログイン"}
        </Button>
      </form>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        アカウントをお持ちでない方は
        <Link to="/signup" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">新規登録</Link>
      </p>
    </div>
  );
}
