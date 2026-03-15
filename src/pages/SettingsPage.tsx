import { useEffect, useState } from "react";
import { useTheme, type Theme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useSettings, type GestureSensitivity, type FontSize } from "../contexts/SettingsContext";
import { Button } from "../components/ui/Button";
import { ApiRequestError } from "../api/client";
import { KebabMenu } from "../components/ui/KebabMenu";
import type { KebabMenuItem } from "../components/ui/KebabMenu";
import { PCHeaderLeft } from "../components/layout/PCHeaderLeft";

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-[var(--bg-surface)] focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors";
const textareaClass = `${inputClass} resize-y`;

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
      <div className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 min-h-[2.25rem]">
        {value || <span className="text-gray-400 dark:text-gray-600">{empty}</span>}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    turnstileSession, setTurnstileSession, clearTurnstileSession,
    isLoggedIn, userId, identityUser, updateProfile, updatePassword, refreshIdentityUser, logout,
  } = useAuth();
  const {
    defaultPosterName,
    defaultPosterSubInfo,
    setPosterDefaults,
    historyMaxCount, setHistoryMaxCount,
    ng,
    saveAllNG,
    gestureSensitivity, setGestureSensitivity,
    fontSize, setFontSize,
  } = useSettings();

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

  // パスワード変更
  const [passwordEditMode, setPasswordEditMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // デフォルト投稿者名
  const [draftPosterName, setDraftPosterName] = useState(defaultPosterName);
  const [draftPosterSubInfo, setDraftPosterSubInfo] = useState(defaultPosterSubInfo);
  const [posterNameSaved, setPosterNameSaved] = useState(false);

  // 閲覧履歴
  const [draftHistoryMax, setDraftHistoryMax] = useState(String(historyMaxCount));

  // NG ワード
  const [draftNG, setDraftNG] = useState({ ...ng });
  const [ngSaved, setNgSaved] = useState(false);

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (editDisplayName.length > 128) { setProfileError("表示名は128文字以内で入力してください"); return; }
    if (editBio.length > 500) { setProfileError("自己紹介は500文字以内で入力してください"); return; }
    if (!turnstileSession) { setProfileError("Turnstile トークンが設定されていません"); return; }
    setSubmittingProfile(true);
    try {
      await updateProfile({ displayName: editDisplayName || undefined, bio: editBio || null, email: editEmail || null });
      setProfileSuccess(true);
      setProfileEditMode(false);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof ApiRequestError ? err.message : err instanceof Error ? err.message : "プロフィールの更新に失敗しました");
    } finally {
      setSubmittingProfile(false);
    }
  };

  const cancelPasswordEdit = () => {
    setPasswordEditMode(false);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
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
      setPasswordError(err instanceof ApiRequestError ? err.message : err instanceof Error ? err.message : "パスワードの変更に失敗しました");
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

  const savePosterDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    setPosterDefaults(draftPosterName, draftPosterSubInfo);
    setPosterNameSaved(true);
    setTimeout(() => setPosterNameSaved(false), 2000);
  };

  const saveHistoryMax = () => {
    const n = parseInt(draftHistoryMax, 10);
    if (!isNaN(n) && n > 0) setHistoryMaxCount(n);
  };

  const saveNG = (e: React.FormEvent) => {
    e.preventDefault();
    saveAllNG(draftNG);
    setNgSaved(true);
    setTimeout(() => setNgSaved(false), 2000);
  };

  const themes: { value: Theme; label: string; desc: string }[] = [
    { value: "light",      label: "ライト",       desc: "白ベースの明るいテーマ" },
    { value: "light-gray", label: "ライトグレー", desc: "グレーベースの明るいテーマ" },
    { value: "dark",       label: "ダーク",       desc: "暗いテーマ（ダークグレー）" },
    { value: "gray",       label: "グレー",       desc: "ミディアムグレーのテーマ" },
    { value: "system",     label: "システム",     desc: "OS の設定に従う" },
  ];

  const fontSizeOptions: { value: FontSize; label: string; desc: string }[] = [
    { value: "small",  label: "小",   desc: "13px" },
    { value: "medium", label: "中",   desc: "15px（標準）" },
    { value: "large",  label: "大",   desc: "17px" },
    { value: "xlarge", label: "特大", desc: "19px" },
  ];

  const menuItems: KebabMenuItem[] = [
    { type: "theme" },
    { type: "divider" },
    { type: "link", label: "板一覧", to: "/boards" },
    ...(isLoggedIn
      ? [{ type: "action" as const, label: "ログアウト", onClick: logout }]
      : [{ type: "link" as const, label: "ログイン", to: "/login" }]),
  ];

  return (
    <div>
      {/* ヘッダー（PC: fixed全幅, mobile: sticky） */}
      <div className="sticky sm:fixed top-0 sm:inset-x-0 sm:h-12 z-40 sm:z-50 -mt-8 sm:mt-0 flex items-stretch bg-[var(--bg-surface)] border-b border-gray-200 dark:border-gray-700">
        <PCHeaderLeft />
        <div className="flex-1 px-3 py-3 sm:py-0 min-w-0 sm:flex sm:items-center sm:justify-center">
          <p className="text-sm leading-snug">設定</p>
        </div>
        <KebabMenu items={menuItems} />
      </div>

    <div className="max-w-lg mx-auto space-y-10 pt-6">
      {/* ユーザ情報 */}
      {isLoggedIn && (
        <section>
          <SectionHeading>ユーザ情報</SectionHeading>
          <div className="mb-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ユーザID<span className="ml-1 text-gray-400 dark:text-gray-600">（変更不可）</span></p>
            <div className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 select-all font-mono">{userId ?? ""}</div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">プロフィール</p>
              {!profileEditMode && <button type="button" onClick={openProfileEdit} className="text-xs text-[var(--link-color)] hover:underline">編集</button>}
            </div>
            {profileEditMode ? (
              <form onSubmit={handleUpdateProfile} noValidate className="space-y-3 p-3 border border-blue-200 dark:border-blue-900">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">表示名<span className="ml-1 text-gray-400">（0〜128文字）</span></label>
                  <input type="text" value={editDisplayName} onChange={(e) => { setEditDisplayName(e.target.value); setProfileError(null); }} maxLength={128} className={inputClass} autoFocus />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">自己紹介<span className="ml-1 text-gray-400">（0〜500文字）</span></label>
                  <textarea value={editBio} onChange={(e) => { setEditBio(e.target.value); setProfileError(null); }} maxLength={500} rows={3} className={textareaClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">メールアドレス<span className="ml-1 text-gray-400">（空欄で削除）</span></label>
                  <input type="email" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setProfileError(null); }} className={inputClass} />
                </div>
                {profileError && <p className="text-xs text-red-600 dark:text-red-400">{profileError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setProfileEditMode(false); setProfileError(null); }}>キャンセル</Button>
                  <Button type="submit" size="sm" disabled={submittingProfile}>{submittingProfile ? "保存中..." : "保存"}</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <ReadonlyField label="表示名" value={identityUser?.displayName} />
                <ReadonlyField label="自己紹介" value={identityUser?.bio} />
                <ReadonlyField label="メールアドレス" value={identityUser?.email} />
              </div>
            )}
            {profileSuccess && <p className="text-xs text-green-600 dark:text-green-400 mt-2">プロフィールを更新しました</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">パスワード</p>
              {!passwordEditMode && <button type="button" onClick={() => setPasswordEditMode(true)} className="text-xs text-[var(--link-color)] hover:underline">変更</button>}
            </div>
            {passwordEditMode ? (
              <form onSubmit={handleUpdatePassword} noValidate className="space-y-3 p-3 border border-blue-200 dark:border-blue-900">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">現在のパスワード</label>
                  <input type="password" value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); }} autoComplete="current-password" className={inputClass} autoFocus />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">新しいパスワード</label>
                  <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }} minLength={8} maxLength={128} autoComplete="new-password" className={inputClass} />
                  <p className="text-xs text-gray-400 mt-0.5">8〜128文字</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">新しいパスワード（確認）</label>
                  <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }} autoComplete="new-password" className={inputClass} />
                </div>
                {passwordError && <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={cancelPasswordEdit}>キャンセル</Button>
                  <Button type="submit" size="sm" disabled={submittingPassword || !currentPassword || !newPassword || !confirmPassword}>{submittingPassword ? "変更中..." : "パスワードを変更"}</Button>
                </div>
              </form>
            ) : (
              <div className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-600">••••••••</div>
            )}
            {passwordSuccess && <p className="text-xs text-green-600 dark:text-green-400 mt-2">パスワードを変更しました</p>}
          </div>
        </section>
      )}

      {/* テーマ */}
      <section>
        <SectionHeading>テーマ</SectionHeading>
        <div className="space-y-1.5">
          {themes.map((t) => (
            <label key={t.value} className={`flex items-start gap-3 px-3 py-2.5 border cursor-pointer transition-colors ${theme === t.value ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
              <input type="radio" name="theme" value={t.value} checked={theme === t.value} onChange={() => setTheme(t.value)} className="mt-0.5 accent-blue-600" />
              <div>
                <p className="text-sm">{t.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* ジェスチャー感度 */}
      <section>
        <SectionHeading>ジェスチャー感度</SectionHeading>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">スワイプジェスチャーの認識しやすさを設定します（スマートフォン向け）</p>
        <div className="space-y-1.5">
          {([
            { value: "strong" as GestureSensitivity, label: "強（認識しやすい）", desc: "小さなスワイプでも検知します。誤検知が増える場合があります" },
            { value: "medium" as GestureSensitivity, label: "中（標準）", desc: "バランスの良い設定です" },
            { value: "weak"   as GestureSensitivity, label: "弱（認識しにくい）", desc: "大きくはっきりとしたスワイプのみ検知します" },
          ] as const).map((opt) => (
            <label key={opt.value} className={`flex items-start gap-3 px-3 py-2.5 border cursor-pointer transition-colors ${gestureSensitivity === opt.value ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
              <input type="radio" name="gestureSensitivity" value={opt.value} checked={gestureSensitivity === opt.value} onChange={() => setGestureSensitivity(opt.value)} className="mt-0.5 accent-blue-600" />
              <div>
                <p className="text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* フォントサイズ */}
      <section>
        <SectionHeading>文字サイズ</SectionHeading>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">スレッド一覧・スレッド表示・ヘッダーに適用されます</p>
        <div className="space-y-1.5">
          {fontSizeOptions.map((opt) => (
            <label key={opt.value} className={`flex items-start gap-3 px-3 py-2.5 border cursor-pointer transition-colors ${fontSize === opt.value ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
              <input type="radio" name="fontSize" value={opt.value} checked={fontSize === opt.value} onChange={() => setFontSize(opt.value)} className="mt-0.5 accent-blue-600" />
              <div>
                <p className="text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* デフォルト投稿者名 */}
      <section>
        <SectionHeading>書き込みデフォルト設定</SectionHeading>
        <form onSubmit={savePosterDefaults} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">デフォルト投稿者名</label>
            <input type="text" value={draftPosterName} onChange={(e) => setDraftPosterName(e.target.value)} maxLength={50} placeholder="未設定のときは板のデフォルト名" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">デフォルトメール欄（sage など）</label>
            <input type="text" value={draftPosterSubInfo} onChange={(e) => setDraftPosterSubInfo(e.target.value)} maxLength={100} placeholder="sage" className={inputClass} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm">{posterNameSaved ? "保存しました ✓" : "保存"}</Button>
          </div>
        </form>
      </section>

      {/* 閲覧履歴 */}
      <section>
        <SectionHeading>閲覧履歴</SectionHeading>
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">履歴の保存件数（スレッド単位）</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={draftHistoryMax}
              onChange={(e) => setDraftHistoryMax(e.target.value)}
              min={1}
              max={10000}
              className="w-32 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-[var(--bg-surface)] focus:outline-none focus:border-blue-500"
            />
            <Button type="button" size="sm" onClick={saveHistoryMax}>保存</Button>
          </div>
          <p className="text-xs text-gray-400">現在の設定: {historyMaxCount} 件</p>
        </div>
      </section>

      {/* NGワード */}
      <section>
        <SectionHeading>NGワード設定</SectionHeading>
        <form onSubmit={saveNG} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">NG ID（改行区切り）</label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">指定したIDを持つ投稿を非表示にします</p>
            <textarea
              value={draftNG.id}
              onChange={(e) => setDraftNG(d => ({ ...d, id: e.target.value }))}
              rows={4}
              placeholder={"ABC123\nDEF456"}
              className={textareaClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">NG 名前（改行区切り）</label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">指定した投稿者名の投稿を非表示にします</p>
            <textarea
              value={draftNG.name}
              onChange={(e) => setDraftNG(d => ({ ...d, name: e.target.value }))}
              rows={4}
              placeholder={"NGユーザ\n荒らし"}
              className={textareaClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">NG 本文（改行区切り、正規表現）</label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">本文がいずれかの正規表現にマッチする投稿を非表示にします</p>
            <textarea
              value={draftNG.body}
              onChange={(e) => setDraftNG(d => ({ ...d, body: e.target.value }))}
              rows={4}
              placeholder={"NGワード\n(spam|広告)"}
              className={textareaClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">NG スレッドタイトル（改行区切り、正規表現）</label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">タイトルがいずれかの正規表現にマッチするスレッドを非表示にします</p>
            <textarea
              value={draftNG.title}
              onChange={(e) => setDraftNG(d => ({ ...d, title: e.target.value }))}
              rows={4}
              placeholder={"NGスレ\n^テスト"}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm">{ngSaved ? "保存しました ✓" : "NGワードを保存"}</Button>
          </div>
        </form>
      </section>

      {/* Turnstile トークン */}
      <section>
        <SectionHeading>Turnstile トークン</SectionHeading>
        <div className="space-y-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
          <p>書き込み・ログイン・登録・プロフィール更新に必要なセッショントークンです。</p>
          <p>
            以下のページでトークンを取得してください（現在のタブで遷移します）:{" "}
            <a
              href={`${import.meta.env.VITE_API_BASE_URL ?? "/api/v1"}/auth/turnstile`}
              className="text-[var(--link-color)] hover:underline"
            >
              Turnstile トークン取得
            </a>
          </p>
        </div>
        <form onSubmit={saveToken} className="space-y-2">
          <div className="flex gap-2">
            <input type="text" value={tsInput} onChange={(e) => setTsInput(e.target.value)} placeholder="トークンを入力" required className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-[var(--bg-surface)] focus:outline-none focus:border-blue-500 min-w-0" />
            <Button type="submit" size="sm" disabled={!tsInput.trim()}>{tsSaved ? "保存済み ✓" : "保存"}</Button>
          </div>
          {turnstileSession ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-700 dark:text-green-400">✓ 設定済み: <span className="font-mono text-gray-600 dark:text-gray-300">{turnstileSession.length > 30 ? `${turnstileSession.slice(0, 30)}...` : turnstileSession}</span></span>
              <button type="button" onClick={() => { clearTurnstileSession(); setTsInput(""); }} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">クリア</button>
            </div>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-400">⚠ トークンが設定されていません</p>
          )}
        </form>
      </section>
    </div>
    </div>
  );
}
