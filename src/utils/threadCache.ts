import type { Board, Thread } from "../types/api";

/**
 * スレッド一覧のキャッシュエントリ。
 * 板ごとに最新 1 世代だけ localStorage に保持する。
 */
export interface ThreadCacheEntry {
  board: Board;
  threads: Thread[];
  /** 保存時刻（Unix ms） */
  savedAt: number;
}

const CACHE_KEY_PREFIX = "thread_cache_";

/**
 * 指定した板のスレッド一覧をキャッシュに保存する。
 * localStorage の容量不足は無視する（クォータ超過はサイレントエラー）。
 */
export function saveThreadCache(boardId: string, board: Board, threads: Thread[]): void {
  try {
    const entry: ThreadCacheEntry = { board, threads, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY_PREFIX + boardId, JSON.stringify(entry));
  } catch {
    /* localStorage quota exceeded — ignore */
  }
}

/**
 * 指定した板のスレッド一覧キャッシュを読み込む。
 * キャッシュが存在しない場合は null を返す。
 */
export function loadThreadCache(boardId: string): ThreadCacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + boardId);
    if (!raw) return null;
    return JSON.parse(raw) as ThreadCacheEntry;
  } catch {
    return null;
  }
}
