import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import type { Theme } from "../../contexts/ThemeContext";

export type KebabMenuItem =
  | { type: "link";    label: string; to: string }
  | { type: "action";  label: string; onClick: () => void }
  | { type: "divider" }
  | { type: "theme" };

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light",      label: "ライト" },
  { value: "dark",       label: "ダーク" },
  { value: "dark-gray",  label: "ダークグレー" },
  { value: "light-gray", label: "ライトグレー" },
  { value: "system",     label: "システム" },
];

interface KebabMenuProps {
  items: KebabMenuItem[];
}

export function KebabMenu({ items }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-xl leading-none select-none"
        aria-label="メニュー"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-44 bg-[var(--bg-page)] border border-gray-200 dark:border-gray-700 shadow-lg z-[60] py-1">
          {items.map((item, i) => {
            if (item.type === "divider") {
              return <div key={i} className="my-1 border-t border-gray-100 dark:border-gray-800" />;
            }
            if (item.type === "link") {
              return (
                <Link
                  key={i}
                  to={item.to}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            }
            if (item.type === "action") {
              return (
                <button
                  key={i}
                  type="button"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => { item.onClick(); setOpen(false); }}
                >
                  {item.label}
                </button>
              );
            }
            if (item.type === "theme") {
              return (
                <div key={i}>
                  <div className="px-4 py-1 text-xs text-gray-400 dark:text-gray-500 font-medium">テーマ</div>
                  {THEME_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className="flex items-center gap-2 w-full text-left px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => { setTheme(opt.value); setOpen(false); }}
                    >
                      <span className={`text-xs w-3 shrink-0 ${theme === opt.value ? "text-blue-500" : "opacity-0"}`}>✓</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
