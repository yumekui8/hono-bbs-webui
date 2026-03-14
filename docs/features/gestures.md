# ジェスチャー機能

## 概要

タッチスワイプによるナビゲーションを提供する。`src/hooks/useSwipeGesture.ts` がコアフック。

---

## useSwipeGesture フック

```typescript
import { useSwipeGesture } from "../hooks/useSwipeGesture";

const swipe = useSwipeGesture({
  onSwipeLeft:  () => { /* 左スワイプ処理 */ },
  onSwipeRight: () => { /* 右スワイプ処理 */ },
  minDistance: 70,   // 最小スワイプ距離 (px)
  axisRatio: 2.0,    // 主軸/副軸の最小比率
  disabled: false,   // 無効化フラグ
});

return <div {...swipe.handlers}>...</div>;
```

### パラメータ

| パラメータ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `onSwipeLeft` | `() => void` | - | 右→左スワイプ時コールバック |
| `onSwipeRight` | `() => void` | - | 左→右スワイプ時コールバック |
| `onSwipeUp` | `() => void` | - | 下→上スワイプ時コールバック |
| `onSwipeDown` | `() => void` | - | 上→下スワイプ時コールバック |
| `minDistance` | `number` | `80` | ジェスチャーとして認識する最小移動距離(px) |
| `axisRatio` | `number` | `2.5` | 主軸変位が副軸変位に対して必要な最小倍率 |
| `disabled` | `boolean` | `false` | `true` にするとジェスチャー検知を無効化 |

---

## 感度設定

設定画面（`/settings`）でジェスチャー感度を選択できる。`SettingsContext` の `gestureSensitivity` フィールドに保存。

| 設定値 | minDistance | axisRatio | 説明 |
|---|---|---|---|
| `strong`（強） | 50px | 1.5 | 小さなスワイプでも検知。誤検知が増える場合あり |
| `medium`（中） | 70px | 2.0 | 標準設定（デフォルト） |
| `weak`（弱） | 90px | 2.5 | 大きくはっきりしたスワイプのみ検知 |

### 各ページでの設定適用

```typescript
const { gestureSensitivity } = useSettings();
const swipeSensitivity = {
  strong: { minDistance: 50, axisRatio: 1.5 },
  medium: { minDistance: 70, axisRatio: 2.0 },
  weak:   { minDistance: 90, axisRatio: 2.5 },
}[gestureSensitivity];

const swipe = useSwipeGesture({
  onSwipeLeft: ...,
  minDistance: swipeSensitivity.minDistance,
  axisRatio: swipeSensitivity.axisRatio,
});
```

---

## 実装箇所

### ThreadPage（スレッド表示画面）

| ジェスチャー | 条件 | アクション |
|---|---|---|
| **左スワイプ**（ページ） | ポップアップなし & 書き込みパネル閉 | 書き込みパネルを開く |
| **右スワイプ**（ページ） | ポップアップなし & 書き込みパネル閉 | スレッド一覧に戻る（キャッシュ使用） |
| **右スワイプ**（書き込みパネル・モバイル） | 常に | 書き込みパネルを閉じる |

- 書き込みパネルのスワイプは感度設定より少し緩い（minDistance -20px、axisRatio -0.5）
- ページ全体の div に `minHeight: 100vh` を設定し、レス数が少ない場合のデッドゾーンを防止

### ThreadListPage（スレッド一覧画面）

| ジェスチャー | 条件 | アクション |
|---|---|---|
| **左スワイプ**（ページ） | 常に | その板で最後に見たスレッドに遷移（履歴なしは無効） |

- ページ全体の div に `minHeight: 100vh` を設定

---

## axisRatio の説明

`axisRatio: 2.0` の場合、水平スワイプを検知するには `|dx| >= |dy| * 2.0` かつ `|dx| >= minDistance` が必要。縦スクロール中の誤検知を防ぐ。
