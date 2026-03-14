import { createContext, useContext, useState } from "react";

export interface NGSettings {
  id: string;    // newline-separated display user IDs
  name: string;  // newline-separated poster names
  body: string;  // newline-separated regexes for post body
  title: string; // newline-separated regexes for thread title
}

export type GestureSensitivity = "strong" | "medium" | "weak";

interface SettingsState {
  defaultPosterName: string;
  defaultPosterSubInfo: string;
  historyMaxCount: number;
  ng: NGSettings;
  gestureSensitivity: GestureSensitivity;
}

interface SettingsContextValue extends SettingsState {
  setDefaultPosterName: (v: string) => void;
  setDefaultPosterSubInfo: (v: string) => void;
  setHistoryMaxCount: (v: number) => void;
  updateNG: (key: keyof NGSettings, value: string) => void;
  setGestureSensitivity: (v: GestureSensitivity) => void;
}

const STORAGE_KEY = "app_settings";

const DEFAULT_SETTINGS: SettingsState = {
  defaultPosterName: "",
  defaultPosterSubInfo: "",
  historyMaxCount: 1000,
  ng: { id: "", name: "", body: "", title: "" },
  gestureSensitivity: "medium",
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

  const save = (next: SettingsState) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <SettingsContext.Provider value={{
      ...settings,
      setDefaultPosterName: (v) => save({ ...settings, defaultPosterName: v }),
      setDefaultPosterSubInfo: (v) => save({ ...settings, defaultPosterSubInfo: v }),
      setHistoryMaxCount: (v) => save({ ...settings, historyMaxCount: v }),
      updateNG: (key, value) => save({ ...settings, ng: { ...settings.ng, [key]: value } }),
      setGestureSensitivity: (v) => save({ ...settings, gestureSensitivity: v }),
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
