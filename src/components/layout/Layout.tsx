import { Outlet } from "react-router-dom";
import { LayoutProvider, useLayout } from "../../contexts/LayoutContext";

function LayoutInner() {
  const { wideMode } = useLayout();
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-900 dark:text-gray-100">
      <main
        className={`${wideMode ? "max-w-[164rem]" : "max-w-[82rem]"} mx-auto sm:px-4 py-8 transition-none`}
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
