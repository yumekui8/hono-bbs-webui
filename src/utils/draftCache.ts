export interface DraftEntry {
  threadId: string;
  boardId: string;
  content: string;
  posterName: string;
  posterSubInfo: string;
  updatedAt: number;
}

const STORAGE_KEY = "thread_drafts";
const MAX_ENTRIES = 50;

function loadAll(): DraftEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DraftEntry[];
  } catch { /* ignore */ }
  return [];
}

function saveAll(entries: DraftEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

export function loadDraft(boardId: string, threadId: string): DraftEntry | null {
  return loadAll().find(e => e.boardId === boardId && e.threadId === threadId) ?? null;
}

// LRU: 末尾が最近使用、先頭が最古。MAX_ENTRIES 超過時は先頭（最古）を削除
export function saveDraft(entry: Omit<DraftEntry, "updatedAt">): void {
  let all = loadAll();
  const idx = all.findIndex(e => e.boardId === entry.boardId && e.threadId === entry.threadId);
  if (idx >= 0) all.splice(idx, 1);
  all.push({ ...entry, updatedAt: Date.now() });
  if (all.length > MAX_ENTRIES) all = all.slice(all.length - MAX_ENTRIES);
  saveAll(all);
}

export function clearDraft(boardId: string, threadId: string): void {
  saveAll(loadAll().filter(e => !(e.boardId === boardId && e.threadId === threadId)));
}
