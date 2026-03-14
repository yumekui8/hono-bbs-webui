import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { boardsApi } from "../api/boards";
import type { Board } from "../types/api";
import { Loading } from "../components/ui/Loading";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { KebabMenu } from "../components/ui/KebabMenu";
import type { KebabMenuItem } from "../components/ui/KebabMenu";
import { useAuth } from "../contexts/AuthContext";
import { useTheme, isDarkTheme } from "../contexts/ThemeContext";

const FOOTER_H = 56;

export function BoardListPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const reloadIcon = isDarkTheme(resolvedTheme) ? "/reload_dark.svg" : "/reload_light.svg";

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
      <div className="sticky top-0 z-40 -mt-8 sm:-mx-4 flex items-stretch bg-[var(--bg-surface)] border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 px-3 sm:px-4 py-3 min-w-0">
          <p className="text-sm leading-snug">板一覧</p>
        </div>
        <KebabMenu items={menuItems} />
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={load} />}
      {!loading && !error && boards.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          板がまだありません
        </p>
      )}
      {!loading && !error && boards.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800" style={{ marginBottom: FOOTER_H }}>
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/boards/${board.id}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
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

      {/* 固定フッター */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-surface)] border-t border-gray-200 dark:border-gray-700"
        style={{ height: FOOTER_H }}
      >
        <div className="max-w-[82rem] mx-auto px-4 h-full flex items-center justify-end">
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
