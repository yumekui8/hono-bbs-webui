import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-900 dark:text-gray-100">
      <main className="max-w-3xl mx-auto sm:px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
