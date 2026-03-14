# スレッド表示・書き込み機能

## 概要

`src/pages/ThreadPage.tsx` がスレッド閲覧・書き込みの中核。

---

## レスポンシブ書き込みパネル

| 画面幅 | 挙動 |
|---|---|
| PC（sm以上） | スレッドの右側に固定パネル（sticky top: 0, height: calc(100vh - FOOTER_H)px）|
| モバイル（sm未満） | 画面右端からスライドインするオーバーレイ（translate-x-fullで非表示） |

### 開閉

- **開く**: フッターの書き込みアイコンボタン or 左スワイプ（モバイル）
- **閉じる**: 書き込みパネル上部の ✕ ボタン（PC）or 右スワイプ（モバイル）
- **自動フォーカス**: `writeOpen` が true になって 220ms 後にテキストエリアにフォーカス

---

## ポップアップ（アンカー/ID/名前クリック）

### 表示条件

| クリック要素 | 表示内容 |
|---|---|
| レス番号（anchorCount > 0） | そのレスへのアンカーツリー |
| >>N アンカー | N番レスのアンカーツリー |
| ID | そのIDの全レス |
| 投稿者名 | 同名の全レス |
| 本文（1レスのみアンカーツリー） | 何も表示しない（anchorCount <= 1） |

### ポップアップ配置（`useLayoutEffect` による2パス測定）

1. `visibility: hidden` でレンダリングして高さを測定
2. トリガーY座標と利用可能スペースを比較:
   - スペースあり: `bottom: vh - triggerY`（上方向に表示）
   - スペースなし: `top: headerBottom, maxHeight: (vh - headerBottom) * 0.9`（スクロール可能）

---

## コンテンツパーサー（parseContent）

投稿本文を以下のパーツに分解してレンダリング:

| タイプ | 例 | スタイル |
|---|---|---|
| `text` | 通常テキスト | - |
| `anchor` | `>>5`, `>>3-7` | ホバーでポップアップ / クリックでポップアップ固定 |
| `image` | `.jpg`, `.png` など | オレンジ色リンク。クリックでライトボックス |
| `twitter` | `twitter.com/...` | スカイブルーリンク |
| `youtube` | `youtube.com/watch?v=...` | 赤リンク。サムネイルプレビュー |
| `url` | その他URL | `#4169e1` / dark: `#6b8fe8` |

---

## フィルタ機能

フッター上のフィルターバーで以下のフィルタを切り替え可能:

| フィルタ | 条件 |
|---|---|
| 人気レス | アンカー数 >= 3 |
| 画像 | image タイプのリンクを含む |
| 動画 | youtube タイプのリンクを含む |
| URL | url / twitter タイプのリンクを含む |

NG フィルタ（`src/utils/ngFilter.ts`）は常時適用される。

---

## データフロー

```
boardsApi.getThread(boardId, threadId)
  → { data: { thread: Thread, posts: Post[] } }
  → client.ts が .data を抽出
  → ThreadDetailResponse = { thread, posts }
```

投稿後:
```
boardsApi.createPost(boardId, threadId, data, turnstileSession, sessionId?)
  → Post
  → setPosts(prev => [...prev, post])
  → bottomRef.scrollIntoView()
```
