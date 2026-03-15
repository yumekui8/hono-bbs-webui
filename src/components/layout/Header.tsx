import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderProps {
  onMenuClick?: () => void;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const icon = resolvedTheme === "dark" || resolvedTheme === "gray" ? "🌙" : "☀️";

  return (
    <button
      onClick={cycleTheme}
      title={`テーマ: ${theme}`}
      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-sm leading-none"
    >
      {icon}
    </button>
  );
}

export function Header({ onMenuClick }: HeaderProps) {
  const { isLoggedIn, username, identityUser, logout } = useAuth();
  const displayLabel = identityUser?.displayName ?? username;
  const location = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm transition-colors ${
        location.pathname === to
          ? "text-gray-900 dark:text-gray-100 font-medium"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-[var(--bg-page)]">
      <div className="max-w-[calc(62rem+11rem)] mx-auto px-4 h-12 flex items-center gap-2">
        {/* ハンバーガー（PC・スマホ共通） */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="hidden sm:flex w-8 h-8 items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors shrink-0"
            aria-label="メニュー"
          >
            ☰
          </button>
        )}

        {/* ロゴ（favicon + サイト名） */}
        <Link
          to="/"
          className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
        >
          <img src="/favicon.ico" alt="" className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          hono-bbs
        </Link>

        <div className="flex-1" />

        <nav className="flex items-center gap-3">
          {navLink("/boards", "板一覧")}
          <ThemeToggle />
          {navLink("/settings", "設定")}
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                {displayLabel}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
