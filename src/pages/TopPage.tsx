import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { boardsApi } from "../api/boards";
import type { Board } from "../types/api";
import { Loading } from "../components/ui/Loading";
import { ErrorMessage } from "../components/ui/ErrorMessage";

export function TopPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-10">
      <section className="py-8 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-semibold tracking-tight">hono-bbs</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">掲示板サービスへようこそ</p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">板一覧</h2>
          <Link to="/boards" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            すべて見る
          </Link>
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
            {boards.slice(0, 5).map((board) => (
              <Link
                key={board.id}
                to={`/boards/${board.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{board.name}</p>
                  {board.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {board.description}
                    </p>
                  )}
                </div>
                <span className="text-gray-300 dark:text-gray-600 text-xs shrink-0 ml-4">›</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
