import { createContext, useContext, useEffect, useState } from "react";
import { getCookie, setCookie } from "../utils/cookies";

export type Theme = "light" | "dark" | "gray" | "light-gray" | "system";
export type ResolvedTheme = "light" | "dark" | "gray" | "light-gray";

export function isDarkTheme(t: ResolvedTheme): boolean {
  return t === "dark" || t === "gray";
}

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = getCookie("theme") as Theme | null;
    // migrate old "dark-gray" → "dark"
    if (stored === ("dark-gray" as Theme)) return "dark";
    return stored ?? "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const resolve = (): ResolvedTheme => {
      if (theme === "system") return mq.matches ? "dark" : "light";
      return theme;
    };

    const update = () => {
      const resolved = resolve();
      setResolvedTheme(resolved);
      const dark = isDarkTheme(resolved);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.classList.toggle("gray", resolved === "gray");
      document.documentElement.classList.toggle("light-gray", resolved === "light-gray");
    };

    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    setCookie("theme", next, 365);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
