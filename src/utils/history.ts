export interface HistoryEntry {
  boardId: string;
  threadId: string;
  lastPostNumber: number;
  creatorId?: string; // first post's displayUserId
}

const STORAGE_KEY = "read_history";

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HistoryEntry[];
  } catch { /* ignore */ }
  return [];
}

export function getHistoryEntry(boardId: string, threadId: string): HistoryEntry | undefined {
  return loadHistory().find(e => e.boardId === boardId && e.threadId === threadId);
}

export function getLastVisitedThreadForBoard(boardId: string): HistoryEntry | undefined {
  const history = loadHistory();
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].boardId === boardId) return history[i];
  }
  return undefined;
}

export function updateHistory(entry: HistoryEntry, maxCount: number): void {
  const history = loadHistory();
  const idx = history.findIndex(e => e.boardId === entry.boardId && e.threadId === entry.threadId);
  if (idx >= 0) {
    history[idx] = entry;
  } else {
    history.push(entry);
  }
  const trimmed = history.slice(-maxCount);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}
