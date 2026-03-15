import { createContext, useContext, useState } from "react";

interface LayoutContextValue {
  wideMode: boolean;
  setWideMode: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  sidebarPinned: boolean;
  setSidebarPinned: (v: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [wideMode, setWideMode] = useState(false);
  const [sidebarPinned, setSidebarPinnedState] = useState(() => {
    return localStorage.getItem("sidebar_pinned") === "true";
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem("sidebar_pinned") === "true";
  });

  const setSidebarPinned = (v: boolean) => {
    setSidebarPinnedState(v);
    setSidebarOpen(v);
    localStorage.setItem("sidebar_pinned", String(v));
  };

  return (
    <LayoutContext.Provider value={{ wideMode, setWideMode, sidebarOpen, setSidebarOpen, sidebarPinned, setSidebarPinned }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
