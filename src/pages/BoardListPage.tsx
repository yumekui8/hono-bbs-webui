import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { boardsApi } from "../api/boards";
import type { Board } from "../types/api";
import { Loading } from "../components/ui/Loading";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { KebabMenu } from "../components/ui/KebabMenu";
import type { KebabMenuItem } from "../components/ui/KebabMenu";
import { useAuth } from "../contexts/AuthContext";
import { useTheme, isDarkTheme } from "../contexts/ThemeContext";
import { PCHeaderLeft } from "../components/layout/PCHeaderLeft";

const FOOTER_H = 56;
const TOP_CATEGORY = "雑談";
const BOTTOM_CATEGORY = "運営";

export function BoardListPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const reloadIcon = isDarkTheme(resolvedTheme) ? "/reload_dark.svg" : "/reload_light.svg";

  // 雑談は最初から展開、それ以外は折りたたみ
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set([TOP_CATEGORY]));

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

  // カテゴリ別にグループ化（カテゴリなしは除外）
  const boardsByCategory = useMemo(() => {
    const groups = new Map<string, Board[]>();
    for (const board of boards) {
      if (!board.category) continue;
      if (!groups.has(board.category)) groups.set(board.category, []);
      groups.get(board.category)!.push(board);
    }
    return groups;
  }, [boards]);

  // カテゴリ並び順: 雑談 → その他（五十音順）→ 運営
  const sortedCategories = useMemo(() => {
    return Array.from(boardsByCategory.keys()).sort((a, b) => {
      if (a === TOP_CATEGORY) return -1;
      if (b === TOP_CATEGORY) return 1;
      if (a === BOTTOM_CATEGORY) return 1;
      if (b === BOTTOM_CATEGORY) return -1;
      return a.localeCompare(b, "ja");
    });
  }, [boardsByCategory]);

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

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
      {/* ヘッダー（PC: fixed全幅, mobile: sticky） */}
      <div className="sticky sm:fixed top-0 sm:inset-x-0 sm:h-12 z-40 sm:z-50 -mt-8 sm:mt-0 flex items-stretch bg-[var(--bg-surface)] border-b border-gray-200 dark:border-gray-700">
        <PCHeaderLeft />
        <div className="flex-1 px-3 py-3 sm:py-0 min-w-0 sm:flex sm:items-center sm:justify-center">
          <p className="text-sm leading-snug">板一覧</p>
        </div>
        <KebabMenu items={menuItems} />
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && (
        <div style={{ marginBottom: FOOTER_H }}>
          {sortedCategories.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              板がまだありません
            </p>
          ) : (
            sortedCategories.map((cat) => {
              const catBoards = boardsByCategory.get(cat) ?? [];
              const isOpen = openCategories.has(cat);
              const isTop = cat === TOP_CATEGORY;

              return (
                <div key={cat} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                  {/* カテゴリヘッダー */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className={`text-xs font-semibold tracking-wide ${
                      isTop
                        ? "text-blue-700 dark:text-blue-400"
                        : cat === BOTTOM_CATEGORY
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {cat}
                    </span>
                    <span className="text-xs text-gray-300 dark:text-gray-600 ml-1">
                      {catBoards.length}
                    </span>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* 板リスト */}
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 gray-list">
                      {catBoards.map((board) => (
                        <Link
                          key={board.id}
                          to={`/boards/${board.id}`}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
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
            })
          )}
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
