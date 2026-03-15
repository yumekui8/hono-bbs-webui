import { Link } from "react-router-dom";
import { useLayout } from "../../contexts/LayoutContext";

/** PC専用のヘッダー左端セクション（ハンバーガー + サイト名）。モバイルでは非表示。 */
export function PCHeaderLeft() {
  const { sidebarOpen, setSidebarOpen } = useLayout();
  return (
    <div className="hidden sm:flex items-stretch shrink-0 border-r border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="h-full px-3 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-xl leading-none"
        aria-label="メニュー"
      >
        ☰
      </button>
      <Link
        to="/"
        className="flex items-center gap-1.5 px-2 pr-4 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
      >
        <img
          src="/favicon.ico"
          alt=""
          className="w-4 h-4"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        hono-bbs
      </Link>
    </div>
  );
}
