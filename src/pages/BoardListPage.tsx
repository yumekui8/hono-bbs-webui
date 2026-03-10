import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { boardsApi } from "../api/boards";
import type { Board } from "../types/api";
import { Loading } from "../components/ui/Loading";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { KebabMenu } from "../components/ui/KebabMenu";
import type { KebabMenuItem } from "../components/ui/KebabMenu";
import { useAuth } from "../contexts/AuthContext";

export function BoardListPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn, logout } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoards(await boardsApi.listBoards());
    } catch {
      setError("板一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const menuItems: KebabMenuItem[] = [
    { type: "theme" },
    { type: "divider" },
    { type: "link", label: "設定", to: "/settings" },
    ...(isLoggedIn
      ? [{ type: "action" as const, label: "ログアウト", onClick: logout }]
      : [{ type: "link" as const, label: "ログイン", to: "/login" }]),
  ];

  return (
    <div>
      {/* スティッキーサブヘッダー */}
      <div className="sticky top-0 z-40 -mt-8 sm:-mx-4 sm:px-4 py-2 bg-[var(--bg-page)] border-b border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex items-center gap-2">
          <KebabMenu items={menuItems} />
          <div className="flex-1 min-w-0">
            <nav className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mb-0.5">
              <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300">トップ</Link>
            </nav>
            <p className="text-sm font-medium">板一覧</p>
          </div>
        </div>
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={load} />}
      {!loading && !error && boards.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          板がまだありません
        </p>
      )}
      {!loading && !error && boards.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/boards/${board.id}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{board.name}</p>
                {board.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{board.description}</p>
                )}
              </div>
              <span className="text-gray-300 dark:text-gray-600 text-xs shrink-0 ml-4">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
