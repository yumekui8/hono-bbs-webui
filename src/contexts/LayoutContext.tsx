import { createContext, useContext, useState } from "react";

interface LayoutContextValue {
  wideMode: boolean;
  setWideMode: (v: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [wideMode, setWideMode] = useState(false);
  return (
    <LayoutContext.Provider value={{ wideMode, setWideMode }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
