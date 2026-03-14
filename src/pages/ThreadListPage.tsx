import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { boardsApi } from "../api/boards";
import type { Board, Thread } from "../types/api";
import { Loading } from "../components/ui/Loading";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { KebabMenu } from "../components/ui/KebabMenu";
import type { KebabMenuItem } from "../components/ui/KebabMenu";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { loadHistory, getLastVisitedThreadForBoard } from "../utils/history";
import { isNGThread } from "../utils/ngFilter";
import { useTheme, isDarkTheme } from "../contexts/ThemeContext";
import { saveThreadCache, loadThreadCache } from "../utils/threadCache";
import { useSwipeGesture } from "../hooks/useSwipeGesture";

const FOOTER_H = 56;

type SortMode = "momentum" | "new";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function calcMomentum(thread: Thread): number {
  const now = Math.floor(Date.now() / 1000);
  const created = Math.floor(new Date(thread.createdAt).getTime() / 1000);
  const elapsed = now - created;
  if (elapsed <= 0) return 0;
  return (thread.postCount * 86400) / elapsed;
}

function momentumColor(m: number): string {
  if (m >= 100000) return "text-red-600 dark:text-red-400 font-medium";
  if (m >= 50000)  return "text-pink-500 dark:text-pink-400";
  if (m >= 10000)  return "text-pink-400 dark:text-pink-300";
  return "text-gray-500 dark:text-gray-400";
}

function formatMomentum(m: number): string {
  if (m >= 10000) return Math.round(m).toLocaleString();
  if (m >= 10)    return m.toFixed(1);
  return m.toFixed(2);
}

export function ThreadListPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [board, setBoard] = useState<Board | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ソート・フィルタ状態
  const [sortMode, setSortMode] = useState<SortMode>("momentum");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { isLoggedIn, logout } = useAuth();
  const { ng, gestureSensitivity } = useSettings();
  const { resolvedTheme } = useTheme();
  const reloadIcon = isDarkTheme(resolvedTheme) ? "/reload_dark.svg" : "/reload_light.svg";

  // ジェスチャー感度設定
  const swipeSensitivity = {
    strong: { minDistance: 50, axisRatio: 1.5 },
    medium: { minDistance: 70, axisRatio: 2.0 },
    weak:   { minDistance: 90, axisRatio: 2.5 },
  }[gestureSensitivity];

  // 左スワイプ: その板で最後に見たスレッドに遷移 / 右スワイプ: 板一覧に戻る
  const listSwipe = useSwipeGesture({
    onSwipeLeft: useCallback(() => {
      if (!boardId) return;
      const entry = getLastVisitedThreadForBoard(boardId);
      if (entry) navigate(`/boards/${boardId}/threads/${entry.threadId}`);
    }, [boardId, navigate]),
    onSwipeRight: useCallback(() => {
      navigate("/boards");
    }, [navigate]),
    minDistance: swipeSensitivity.minDistance,
    axisRatio: swipeSensitivity.axisRatio,
  });

  const load = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await boardsApi.listThreads(boardId);
      setBoard(data.board);
      setThreads(data.threads);
      // 取得後にキャッシュ保存
      saveThreadCache(boardId, data.board, data.threads);
    } catch {
      setError("スレッド一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    // スレッドページからの右スワイプ戻り時: キャッシュを優先表示
    const useCache = (location.state as { useCache?: boolean } | null)?.useCache;
    if (useCache) {
      const cached = loadThreadCache(boardId);
      if (cached) {
        setBoard(cached.board);
        setThreads(cached.threads);
        setLoading(false);
        return;
      }
    }
    load();
  }, [boardId, load, location.state]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => loadHistory(), [threads]);

  // NG フィルタ
  const ngFilteredThreads = useMemo(
    () => threads.filter(t => !isNGThread(t, ng)),
    [threads, ng],
  );

  // 閲覧履歴から未読情報を計算
  const threadsWithMeta = useMemo(() => {
    return ngFilteredThreads.map(thread => {
      const entry = history.find(e => e.boardId === boardId && e.threadId === thread.id);
      const visited = !!entry;
      const unread = entry ? Math.max(0, thread.postCount - entry.lastPostNumber) : 0;
      const momentum = calcMomentum(thread);
      return { thread, entry, visited, unread, momentum };
    });
  }, [ngFilteredThreads, history, boardId]);

  // 未読スレ合計
  const totalUnread = useMemo(
    () => threadsWithMeta.reduce((sum, { unread }) => sum + unread, 0),
    [threadsWithMeta],
  );

  // フィルタ＆ソート
  const displayThreads = useMemo(() => {
    let list = showUnreadOnly
      ? threadsWithMeta.filter(({ unread }) => unread > 0)
      : threadsWithMeta;

    if (sortMode === "momentum") {
      list = [...list].sort((a, b) => b.momentum - a.momentum);
    } else {
      // "new": updatedAt 降順（最終更新順）
      list = [...list].sort(
        (a, b) => new Date(b.thread.updatedAt).getTime() - new Date(a.thread.updatedAt).getTime(),
      );
    }
    return list;
  }, [threadsWithMeta, showUnreadOnly, sortMode]);

  const menuItems: KebabMenuItem[] = [
    ...(boardId ? [{ type: "link" as const, label: "スレッド作成", to: `/boards/${boardId}/threads/new` }] : []),
    { type: "divider" },
    { type: "theme" },
    { type: "divider" },
    { type: "link", label: "設定", to: "/settings" },
    { type: "link", label: "板一覧", to: "/boards" },
    ...(isLoggedIn
      ? [{ type: "action" as const, label: "ログアウト", onClick: logout }]
      : [{ type: "link" as const, label: "ログイン", to: "/login" }]),
  ];

  return (
    <div {...listSwipe.handlers} style={{ minHeight: "90vh" }}>
      {/* スティッキーサブヘッダー */}
      <div className="sticky top-0 z-40 -mt-8 sm:-mx-4 flex items-stretch bg-[var(--bg-surface)] border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 px-3 sm:px-4 py-3 min-w-0">
          <p className="text-sm leading-snug">{board?.name ?? boardId}</p>
        </div>
        <KebabMenu items={menuItems} />
      </div>

      {board?.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{board.description}</p>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={load} />}
      {!loading && !error && displayThreads.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          {showUnreadOnly ? "未読スレッドはありません" : "スレッドがまだありません"}
        </p>
      )}
      {!loading && !error && displayThreads.length > 0 && (
        <div
          className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800"
          style={{ marginBottom: FOOTER_H }}
        >
          {displayThreads.map(({ thread, entry, visited, unread, momentum }) => (
            <a
              key={thread.id}
              href={`/boards/${boardId}/threads/${thread.id}`}
              className="flex flex-col px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <p className={`text-sm leading-snug ${visited ? "text-[var(--link-color)]" : ""}`}>
                {thread.title}
              </p>
              <div className="flex items-center mt-0.5 gap-2 text-xs">
                <span className="text-gray-400 dark:text-gray-500 shrink-0">{formatDate(thread.createdAt)}</span>
                <span className="text-gray-400 dark:text-gray-500 font-mono truncate max-w-[8rem]">
                  {entry?.creatorId ?? thread.ownerUserId?.slice(0, 8) ?? "-"}
                </span>
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                  {unread > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-700 text-white leading-none">
                      +{unread}
                    </span>
                  )}
                  <span className={`tabular-nums ${momentumColor(momentum)}`} title="勢い">
                    {formatMomentum(momentum)}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 tabular-nums" title="レス数">
                    {thread.postCount}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* 固定フッター */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-surface)] border-t border-gray-200 dark:border-gray-700"
        style={{ height: FOOTER_H }}
      >
        <div className="max-w-[82rem] mx-auto px-4 h-full flex items-center gap-1">
          {/* 左: フィルタ・ソートボタン */}
          <div className="flex items-center gap-1 flex-1">
            {/* 未読フィルタ */}
            <button
              type="button"
              onClick={() => setShowUnreadOnly(o => !o)}
              className={`flex flex-col items-center justify-center px-2 py-0.5 text-[10px] leading-tight border transition-colors min-w-[2.8rem] h-9 ${
                showUnreadOnly
                  ? "border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
              }`}
            >
              <span>未読</span>
              <span className="font-medium tabular-nums">{totalUnread > 0 ? totalUnread : "-"}</span>
            </button>
            {/* 勢いソート */}
            <button
              type="button"
              onClick={() => setSortMode("momentum")}
              className={`px-2.5 h-9 text-xs border transition-colors ${
                sortMode === "momentum" && !showUnreadOnly
                  ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                  : sortMode === "momentum"
                  ? "border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
              }`}
            >
              勢い
            </button>
            {/* 新しい順ソート */}
            <button
              type="button"
              onClick={() => setSortMode("new")}
              className={`px-2.5 h-9 text-xs border transition-colors ${
                sortMode === "new"
                  ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
              }`}
            >
              新しい
            </button>
          </div>
          {/* 右: 更新ボタン */}
          <button
            type="button"
            onClick={load}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            aria-label="更新"
          >
            <img src={reloadIcon} alt="" className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
