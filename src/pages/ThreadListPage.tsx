import { useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { boardsApi } from "../api/boards";
import type { Board, Thread } from "../types/api";
import { Loading } from "../components/ui/Loading";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { KebabMenu } from "../components/ui/KebabMenu";
import type { KebabMenuItem } from "../components/ui/KebabMenu";
import { useAuth } from "../contexts/AuthContext";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ThreadListPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn, logout } = useAuth();

  const load = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await boardsApi.listThreads(boardId);
      setBoard(data.board);
      setThreads(data.threads);
    } catch {
      setError("スレッド一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

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
    <div>
      {/* 板名スティッキーサブヘッダー */}
      <div className="sticky top-0 z-40 -mt-8 sm:-mx-4 sm:px-4 py-2 bg-[var(--bg-page)] border-b border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex items-center gap-2">
          <KebabMenu items={menuItems} />
          <div className="flex-1 min-w-0">
            <nav className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mb-0.5">
              <a href="/" className="hover:text-gray-600 dark:hover:text-gray-300">トップ</a>
              <span>/</span>
              <a href="/boards" className="hover:text-gray-600 dark:hover:text-gray-300">板一覧</a>
            </nav>
            <p className="text-sm font-medium truncate">{board?.name ?? boardId}</p>
          </div>
        </div>
      </div>

      {/* ボード説明 */}
      {board?.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{board.description}</p>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={load} />}
      {!loading && !error && threads.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          スレッドがまだありません
        </p>
      )}
      {!loading && !error && threads.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {threads.map((thread, idx) => (
            <a
              key={thread.id}
              href={`/boards/${boardId}/threads/${thread.id}`}
              className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <span className="text-xs text-gray-400 w-6 shrink-0 mt-0.5 text-right tabular-nums">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{thread.title}</p>
                <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  <span>{thread.postCount} レス</span>
                  <span>作成 {formatDate(thread.createdAt)}</span>
                  <span>最終 {formatDate(thread.updatedAt)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
