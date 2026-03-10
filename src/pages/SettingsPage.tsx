import { useEffect, useState } from "react";
import { useTheme, type Theme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { ApiRequestError } from "../api/client";

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 pb-2 mb-4">
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">{children}</h2>
    </div>
  );
}

function ReadonlyField({ label, value, empty = "未設定" }: { label: string; value?: string | null; empty?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 min-h-[2.25rem]">
        {value || <span className="text-gray-400 dark:text-gray-600">{empty}</span>}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    turnstileSession, setTurnstileSession, clearTurnstileSession,
    isLoggedIn, userId, identityUser, updateProfile, updatePassword, refreshIdentityUser,
  } = useAuth();

  // Turnstile
  const [tsInput, setTsInput] = useState(turnstileSession ?? "");
  const [tsSaved, setTsSaved] = useState(false);

  // プロフィール編集モード
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);

  // パスワード変更モード
  const [passwordEditMode, setPasswordEditMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // ページロード時にユーザ情報を最新化
  useEffect(() => {
    if (isLoggedIn) refreshIdentityUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const openProfileEdit = () => {
    setEditDisplayName(identityUser?.displayName ?? "");
    setEditBio(identityUser?.bio ?? "");
    setEditEmail(identityUser?.email ?? "");
    setProfileError(null);
    setProfileEditMode(true);
  };

  const cancelProfileEdit = () => {
    setProfileEditMode(false);
    setProfileError(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (editDisplayName.length > 128) { setProfileError("表示名は128文字以内で入力してください"); return; }
    if (editBio.length > 500) { setProfileError("自己紹介は500文字以内で入力してください"); return; }
    if (!turnstileSession) { setProfileError("Turnstile トークンが設定されていません"); return; }

    setSubmittingProfile(true);
    try {
      await updateProfile({
        displayName: editDisplayName || undefined,
        bio: editBio || null,
        email: editEmail || null,
      });
      setProfileSuccess(true);
      setProfileEditMode(false);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setProfileError(err.message);
      } else if (err instanceof Error) {
        setProfileError(err.message);
      } else {
        setProfileError("プロフィールの更新に失敗しました");
      }
    } finally {
      setSubmittingProfile(false);
    }
  };

  const cancelPasswordEdit = () => {
    setPasswordEditMode(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!currentPassword) { setPasswordError("現在のパスワードを入力してください"); return; }
    if (!newPassword) { setPasswordError("新しいパスワードを入力してください"); return; }
    if (newPassword.length < 8) { setPasswordError("パスワードは8文字以上で入力してください"); return; }
    if (newPassword.length > 128) { setPasswordError("パスワードは128文字以内で入力してください"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("パスワードが一致しません"); return; }
    if (!turnstileSession) { setPasswordError("Turnstile トークンが設定されていません"); return; }

    setSubmittingPassword(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      cancelPasswordEdit();
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setPasswordError(err.message);
      } else if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError("パスワードの変更に失敗しました");
      }
    } finally {
      setSubmittingPassword(false);
    }
  };

  const saveToken = (e: React.FormEvent) => {
    e.preventDefault();
    const val = tsInput.trim();
    if (!val) return;
    setTurnstileSession(val);
    setTsSaved(true);
    setTimeout(() => setTsSaved(false), 2000);
  };

  const themes: { value: Theme; label: string; desc: string }[] = [
    { value: "light",      label: "ライト",         desc: "常に明るいテーマを使用" },
    { value: "light-gray", label: "ライトグレー",   desc: "明るいテーマ（ソフトなグレー）" },
    { value: "dark",       label: "ダーク",         desc: "暗いテーマ（深みのある黒）" },
    { value: "dark-gray",  label: "ダークグレー",   desc: "暗いテーマ（ソフトなグレー）" },
    { value: "system",     label: "システム",       desc: "OS の設定に従う" },
  ];

  return (
    <div className="max-w-lg space-y-10">
      <h1 className="text-xl font-semibold">設定</h1>

      {/* ユーザ情報（ログイン時のみ） */}
      {isLoggedIn && (
        <section>
          <SectionHeading>ユーザ情報</SectionHeading>

          {/* ユーザID（変更不可） */}
          <div className="mb-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              ユーザID
              <span className="ml-1 text-gray-400 dark:text-gray-600">（ログインID・変更不可）</span>
            </p>
            <div className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 select-all font-mono">
              {userId ?? ""}
            </div>
          </div>

          {/* プロフィール編集 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">プロフィール</p>
              {!profileEditMode && (
                <button
                  type="button"
                  onClick={openProfileEdit}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  編集
                </button>
              )}
            </div>

            {profileEditMode ? (
              <form onSubmit={handleUpdateProfile} noValidate className="space-y-3 p-3 border border-blue-200 dark:border-blue-900">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    表示名
                    <span className="ml-1 text-gray-400 dark:text-gray-600">（0〜128文字）</span>
                  </label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => { setEditDisplayName(e.target.value); setProfileError(null); }}
                    maxLength={128}
                    placeholder="表示名を入力"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    自己紹介
                    <span className="ml-1 text-gray-400 dark:text-gray-600">（0〜500文字、空欄で削除）</span>
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => { setEditBio(e.target.value); setProfileError(null); }}
                    maxLength={500}
                    rows={3}
                    placeholder="自己紹介を入力"
                    className={`${inputClass} resize-y`}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 text-right">
                    {editBio.length} / 500
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    メールアドレス
                    <span className="ml-1 text-gray-400 dark:text-gray-600">（空欄で削除）</span>
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => { setEditEmail(e.target.value); setProfileError(null); }}
                    placeholder="email@example.com"
                    className={inputClass}
                  />
                </div>
                {profileError && <p className="text-xs text-red-600 dark:text-red-400">{profileError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={cancelProfileEdit}>
                    キャンセル
                  </Button>
                  <Button type="submit" size="sm" disabled={submittingProfile}>
                    {submittingProfile ? "保存中..." : "保存"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <ReadonlyField label="表示名" value={identityUser?.displayName} empty="未設定" />
                <ReadonlyField label="自己紹介" value={identityUser?.bio} empty="未設定" />
                <ReadonlyField label="メールアドレス" value={identityUser?.email} empty="未設定" />
              </div>
            )}

            {profileSuccess && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">プロフィールを更新しました</p>
            )}
          </div>

          {/* パスワード変更 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">パスワード</p>
              {!passwordEditMode && (
                <button
                  type="button"
                  onClick={() => setPasswordEditMode(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  変更
                </button>
              )}
            </div>

            {passwordEditMode ? (
              <form onSubmit={handleUpdatePassword} noValidate className="space-y-3 p-3 border border-blue-200 dark:border-blue-900">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">現在のパスワード</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); }}
                    autoComplete="current-password"
                    className={inputClass}
                    aria-invalid={!!passwordError}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">新しいパスワード</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className={inputClass}
                    aria-invalid={!!passwordError}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">8〜128文字</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">新しいパスワード（確認）</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                    autoComplete="new-password"
                    className={inputClass}
                    aria-invalid={!!passwordError}
                  />
                </div>
                {passwordError && <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={cancelPasswordEdit}>
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingPassword || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {submittingPassword ? "変更中..." : "パスワードを変更"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600">
                ••••••••
              </div>
            )}

            {passwordSuccess && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">パスワードを変更しました</p>
            )}
          </div>
        </section>
      )}

      {/* テーマ */}
      <section>
        <SectionHeading>テーマ</SectionHeading>
        <div className="space-y-1.5">
          {themes.map((t) => (
            <label
              key={t.value}
              className={`flex items-start gap-3 px-3 py-2.5 border cursor-pointer transition-colors ${
                theme === t.value
                  ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50"
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={t.value}
                checked={theme === t.value}
                onChange={() => setTheme(t.value)}
                className="mt-0.5 accent-blue-600"
              />
              <div>
                <p className="text-sm">{t.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Turnstile トークン */}
      <section>
        <SectionHeading>Turnstile トークン</SectionHeading>
        <div className="space-y-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
          <p>書き込み・ログイン・登録・プロフィール更新に必要なセッショントークンです。</p>
          <p>
            以下のページでトークンを取得し、貼り付けてください:{" "}
            <a
              href={`${import.meta.env.VITE_API_BASE_URL ?? "/api/v1"}/auth/turnstile`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Turnstile トークン取得
            </a>
          </p>
        </div>

        <form onSubmit={saveToken} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              placeholder="トークンを入力"
              required
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors min-w-0"
            />
            <Button type="submit" size="sm" disabled={!tsInput.trim()}>
              {tsSaved ? "保存済み ✓" : "保存"}
            </Button>
          </div>

          {turnstileSession ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-700 dark:text-green-400">
                ✓ 設定済み:{" "}
                <span className="font-mono text-gray-600 dark:text-gray-300">
                  {turnstileSession.length > 30
                    ? `${turnstileSession.slice(0, 30)}...`
                    : turnstileSession}
                </span>
              </span>
              <button
                type="button"
                onClick={() => { clearTurnstileSession(); setTsInput(""); }}
                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                クリア
              </button>
            </div>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-400">⚠ トークンが設定されていません</p>
          )}
        </form>
      </section>
    </div>
  );
}
