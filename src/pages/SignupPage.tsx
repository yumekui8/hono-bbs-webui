import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { ApiRequestError } from "../api/client";

export function SignupPage() {
  const { signUp, signIn, turnstileSession } = useAuth();
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors";

  const validate = () => {
    const errors: Record<string, string> = {};
    const id = userId.trim();
    if (!id) {
      errors.userId = "ユーザIDは必須です";
    } else if (id.length < 7) {
      errors.userId = "ユーザIDは7文字以上で入力してください";
    } else if (id.length > 128) {
      errors.userId = "ユーザIDは128文字以内で入力してください";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      errors.userId = "ユーザIDは英数字・アンダースコア・ハイフンのみ使用できます";
    }
    if (displayName.length > 128) {
      errors.displayName = "表示名は128文字以内で入力してください";
    }
    if (!password) {
      errors.password = "パスワードは必須です";
    } else if (password.length < 8) {
      errors.password = "パスワードは8文字以上で入力してください";
    } else if (password.length > 128) {
      errors.password = "パスワードは128文字以内で入力してください";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "パスワードの確認を入力してください";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "パスワードが一致しません";
    }
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
      const id = userId.trim();
      const dn = displayName.trim() || undefined;
      await signUp(id, password, dn);
      await signIn(id, password);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "USER_ID_TAKEN") {
          setFieldErrors({ userId: "このユーザIDはすでに使用されています" });
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("登録に失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-8 space-y-6">
      <h1 className="text-xl font-semibold">新規登録</h1>

      {!turnstileSession && (
        <div className="px-3 py-2 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
          登録には Turnstile トークンが必要です。
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
            pattern="[a-zA-Z0-9_-]+"
            autoComplete="username"
            className={inputClass}
            aria-invalid={!!fieldErrors.userId}
          />
          {fieldErrors.userId
            ? <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.userId}</p>
            : <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">英数字・アンダースコア・ハイフン、7〜128文字。ログインに使用し変更不可</p>
          }
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            表示名
            <span className="ml-1 text-gray-400 dark:text-gray-600">（省略時はユーザIDと同じ）</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setFieldErrors((p) => ({ ...p, displayName: "" })); }}
            maxLength={128}
            placeholder={userId || "表示名を入力（省略可）"}
            autoComplete="nickname"
            className={inputClass}
            aria-invalid={!!fieldErrors.displayName}
          />
          {fieldErrors.displayName && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.displayName}</p>}
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "", confirmPassword: "" })); }}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className={inputClass}
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password
            ? <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.password}</p>
            : <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">8〜128文字</p>
          }
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">パスワード（確認）</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirmPassword: "" })); }}
            required
            autoComplete="new-password"
            className={inputClass}
            aria-invalid={!!fieldErrors.confirmPassword}
          />
          {fieldErrors.confirmPassword && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.confirmPassword}</p>}
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" disabled={submitting || !turnstileSession} className="w-full justify-center">
          {submitting ? "登録中..." : "アカウントを作成"}
        </Button>
      </form>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        すでにアカウントをお持ちの方は
        <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">ログイン</Link>
      </p>
    </div>
  );
}
