# 閲覧履歴・キャッシュ機能

## 概要

スレッドの閲覧履歴とスレッド一覧キャッシュを localStorage に保存し、未読管理・高速な戻り操作を実現する。

---

## 閲覧履歴（read_history）

### データ構造

```typescript
// src/utils/history.ts
export interface HistoryEntry {
  boardId: string;
  threadId: string;
  lastPostNumber: number; // 最後に読んだレス番号
  creatorId?: string;     // スレ立て者の displayUserId
}
```

### 保存先

localStorage キー: `read_history`（`HistoryEntry[]`）

### API

```typescript
import { loadHistory, getHistoryEntry, getLastVisitedThreadForBoard, updateHistory } from "../utils/history";

// 全履歴取得
const history = loadHistory();

// 特定スレッドのエントリ取得
const entry = getHistoryEntry(boardId, threadId);

// その板で最後に見たスレッドのエントリ取得（ThreadListPage の左スワイプで使用）
const lastEntry = getLastVisitedThreadForBoard(boardId);

// 履歴を更新（maxCount: SettingsContext.historyMaxCount）
updateHistory({ boardId, threadId, lastPostNumber, creatorId }, maxCount);
```

### 未読計算

```typescript
const unread = entry ? Math.max(0, thread.postCount - entry.lastPostNumber) : 0;
```

---

## スレッド一覧キャッシュ（thread_cache_{boardId}）

### データ構造

```typescript
// src/utils/threadCache.ts
export interface ThreadCacheEntry {
  board: Board;
  threads: Thread[];
  savedAt: number; // Unix timestamp (ms)
}
```

### 保存先

localStorage キー: `thread_cache_{boardId}`（板ごとに1世代）

### API

```typescript
import { saveThreadCache, loadThreadCache } from "../utils/threadCache";

// スレッド取得後に保存
saveThreadCache(boardId, board, threads);

// キャッシュから読み込み（スレッドページからの右スワイプ戻りに使用）
const cached = loadThreadCache(boardId); // ThreadCacheEntry | null
```

### キャッシュ使用条件

React Router の `location.state.useCache` が `true` のとき（スレッドページから右スワイプで戻った場合）、API を呼ばずにキャッシュを表示する。

```typescript
// ThreadListPage
const useCache = (location.state as { useCache?: boolean } | null)?.useCache;
if (useCache) {
  const cached = loadThreadCache(boardId);
  if (cached) { /* キャッシュを使用 */ }
}
```

---

## ThreadListPage でのナビゲーション

| ジェスチャー | アクション |
|---|---|
| 右スワイプ（ThreadPage） | `navigate(/boards/:boardId, { state: { useCache: true } })` → キャッシュ表示 |
| 左スワイプ（ThreadListPage） | `getLastVisitedThreadForBoard(boardId)` → そのスレッドに遷移 |
