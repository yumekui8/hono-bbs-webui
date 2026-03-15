import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutProvider, useLayout } from "../../contexts/LayoutContext";

function SidebarNav() {
  const location = useLocation();
  const { sidebarPinned, setSidebarPinned, setSidebarOpen } = useLayout();

  // 現在の URL から boardId を抽出
  const boardMatch = location.pathname.match(/^\/boards\/([^/]+)/);
  const boardId = boardMatch?.[1];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const linkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
      isActive(path)
        ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100"
    }`;

  const navItems = [
    { to: "/",        icon: "🏠", label: "ホーム" },
    ...(boardId ? [{ to: `/boards/${boardId}`, icon: "◀", label: "板へ戻る" }] : []),
    { to: "/boards",  icon: "📋", label: "板一覧" },
    { to: "/history", icon: "🕐", label: "履歴" },
    { to: "/settings",icon: "⚙️",  label: "設定" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">メニュー</span>
        <button
          type="button"
          onClick={() => setSidebarPinned(!sidebarPinned)}
          title={sidebarPinned ? "固定解除" : "固定"}
          className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {sidebarPinned ? "固定中" : "固定"}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={linkClass(item.to)}
            onClick={() => { if (!sidebarPinned) setSidebarOpen(false); }}
          >
            <span className="text-base leading-none w-5 text-center shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function LayoutInner() {
  const { wideMode, sidebarOpen } = useLayout();

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-900 dark:text-gray-100">
      {/* PC 固定サイドバー（ページヘッダーの下から） */}
      <aside
        className={`hidden sm:block fixed left-0 top-12 bottom-0 z-30 bg-[var(--bg-surface)] border-r border-gray-200 dark:border-gray-700 transition-all duration-200 overflow-hidden ${
          sidebarOpen ? "w-44" : "w-0 border-r-0"
        }`}
      >
        {sidebarOpen && <SidebarNav />}
      </aside>

      {/* メインコンテンツ（中央揃え） */}
      <main
        className={`mx-auto px-4 py-8 sm:pt-12 transition-none ${
          wideMode ? "max-w-[164rem]" : "max-w-[62rem]"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}

export function Layout() {
  return (
    <LayoutProvider>
      <LayoutInner />
    </LayoutProvider>
  );
}
