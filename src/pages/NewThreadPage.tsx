import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { boardsApi } from "../api/boards";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { Button } from "../components/ui/Button";
import { ApiRequestError } from "../api/client";

export function NewThreadPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { turnstileSession, sessionId } = useAuth();
  const { defaultPosterName, defaultPosterSubInfo } = useSettings();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posterName, setPosterName] = useState(defaultPosterName);
  const [posterSubInfo, setPosterSubInfo] = useState(defaultPosterSubInfo);
  const [showOptions, setShowOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTurnstileHint, setShowTurnstileHint] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors";

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "タイトルは必須です";
    else if (title.trim().length < 1) errors.title = "タイトルを入力してください";
    else if (title.trim().length > 200) errors.title = "タイトルは200文字以内で入力してください";
    if (!content.trim()) errors.content = "本文は必須です";
    else if (content.trim().length > 5000) errors.content = "本文は5000文字以内で入力してください";
    return errors;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId) return;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    if (!turnstileSession) {
      setShowTurnstileHint(true);
      setError("Turnstile トークンが設定されていません");
      return;
    }

    setSubmitting(true);
    setError(null);
    setShowTurnstileHint(false);

    try {
      const res = await boardsApi.createThread(
        boardId,
        {
          title: title.trim(),
          content: content.trim(),
          posterName: posterName.trim() || undefined,
          posterSubInfo: posterSubInfo.trim() || undefined,
        },
        turnstileSession,
        sessionId ?? undefined,
      );
      navigate(`/boards/${boardId}/threads/${res.thread.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(`エラー: ${err.message}`);
        if (err.code.toUpperCase().includes("TURNSTILE") || err.status === 401) {
          setShowTurnstileHint(true);
        }
      } else {
        setError("スレッドの作成に失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <nav className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-100">トップ</Link>
        <span>/</span>
        <Link to="/boards" className="hover:text-gray-900 dark:hover:text-gray-100">板一覧</Link>
        <span>/</span>
        <Link to={`/boards/${boardId}`} className="hover:text-gray-900 dark:hover:text-gray-100">{boardId}</Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300">スレッド作成</span>
      </nav>

      <h1 className="text-xl font-semibold">スレッド作成</h1>

      {!turnstileSession && (
        <div className="px-3 py-2 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
          書き込みには Turnstile トークンが必要です。
          <Link to="/settings" className="underline font-medium ml-1">設定ページ</Link>
          で設定してください。
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setFieldErrors((p) => ({ ...p, title: "" })); }}
            required
            maxLength={200}
            className={inputClass}
            aria-invalid={!!fieldErrors.title}
          />
          {fieldErrors.title && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.title}</p>}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">投稿者名（省略可）</label>
            <input
              type="text"
              value={posterName}
              onChange={(e) => setPosterName(e.target.value)}
              maxLength={50}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pb-2 shrink-0"
          >
            {showOptions ? "▲ 閉じる" : "▼ オプション"}
          </button>
        </div>

        {showOptions && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">メール（sage など）</label>
            <input
              type="text"
              value={posterSubInfo}
              onChange={(e) => setPosterSubInfo(e.target.value)}
              maxLength={100}
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            本文 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setFieldErrors((p) => ({ ...p, content: "" })); }}
            required
            maxLength={5000}
            rows={8}
            className={`${inputClass} resize-y`}
            aria-invalid={!!fieldErrors.content}
          />
          {fieldErrors.content && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.content}</p>}
        </div>

        {error && (
          <div className="space-y-1">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            {showTurnstileHint && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <Link to="/settings" className="underline font-medium">設定ページ</Link>
                で Turnstile トークンを設定・更新してください。
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            キャンセル
          </Button>
          <Button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim() || !turnstileSession}
          >
            {submitting ? "作成中..." : "スレッドを作成"}
          </Button>
        </div>
      </form>
    </div>
  );
}
