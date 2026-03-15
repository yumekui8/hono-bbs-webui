import { createContext, useContext, useEffect, useState } from "react";

export interface NGSettings {
  id: string;    // newline-separated display user IDs
  name: string;  // newline-separated poster names
  body: string;  // newline-separated regexes for post body
  title: string; // newline-separated regexes for thread title
}

export type GestureSensitivity = "strong" | "medium" | "weak";
export type FontSize = "small" | "medium" | "large" | "xlarge";

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  small:  "13px",
  medium: "15px",
  large:  "17px",
  xlarge: "19px",
};

interface SettingsState {
  defaultPosterName: string;
  defaultPosterSubInfo: string;
  historyMaxCount: number;
  ng: NGSettings;
  gestureSensitivity: GestureSensitivity;
  fontSize: FontSize;
}

interface SettingsContextValue extends SettingsState {
  setDefaultPosterName: (v: string) => void;
  setDefaultPosterSubInfo: (v: string) => void;
  setPosterDefaults: (name: string, subInfo: string) => void;
  setHistoryMaxCount: (v: number) => void;
  updateNG: (key: keyof NGSettings, value: string) => void;
  saveAllNG: (ng: NGSettings) => void;
  setGestureSensitivity: (v: GestureSensitivity) => void;
  setFontSize: (v: FontSize) => void;
}

const STORAGE_KEY = "app_settings";

const DEFAULT_SETTINGS: SettingsState = {
  defaultPosterName: "",
  defaultPosterSubInfo: "",
  historyMaxCount: 1000,
  ng: { id: "", name: "", body: "", title: "" },
  gestureSensitivity: "medium",
  fontSize: "medium",
};

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed, ng: { ...DEFAULT_SETTINGS.ng, ...(parsed.ng ?? {}) } };
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);

  // functional update でクロージャの古い参照を回避
  const save = (updater: (prev: SettingsState) => SettingsState) => {
    setSettings(prev => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // フォントサイズを root に適用
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[settings.fontSize];
  }, [settings.fontSize]);

  return (
    <SettingsContext.Provider value={{
      ...settings,
      setDefaultPosterName:  (v) => save(s => ({ ...s, defaultPosterName: v })),
      setDefaultPosterSubInfo: (v) => save(s => ({ ...s, defaultPosterSubInfo: v })),
      setPosterDefaults: (name, subInfo) => save(s => ({ ...s, defaultPosterName: name, defaultPosterSubInfo: subInfo })),
      setHistoryMaxCount: (v) => save(s => ({ ...s, historyMaxCount: v })),
      updateNG: (key, value) => save(s => ({ ...s, ng: { ...s.ng, [key]: value } })),
      saveAllNG: (ng) => save(s => ({ ...s, ng })),
      setGestureSensitivity: (v) => save(s => ({ ...s, gestureSensitivity: v })),
      setFontSize: (v) => save(s => ({ ...s, fontSize: v })),
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
