# ジェスチャーシステム

## 概要

`src/hooks/useSwipeGesture.ts` がスワイプジェスチャー検出の中核。
縦横の変位比率チェックにより、縦スクロール中の誤ジェスチャー検知を抑制する。

---

## useSwipeGesture フック

```typescript
import { useSwipeGesture } from "../hooks/useSwipeGesture";

const swipe = useSwipeGesture({
  onSwipeLeft:  () => { /* 左スワイプ処理 */ },
  onSwipeRight: () => { /* 右スワイプ処理 */ },
  minDistance: 80,   // 最小スワイプ距離 (px)
  axisRatio: 2.5,    // 主軸/副軸の最小比率
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

### axisRatio の説明

`axisRatio: 2.5` の場合:
- **水平スワイプ**: `|dx| >= |dy| * 2.5` かつ `|dx| >= minDistance` を満たす場合に検知
- **垂直スワイプ**: `|dy| >= |dx| * 2.5` かつ `|dy| >= minDistance` を満たす場合に検知

つまり、水平スワイプを検知するには水平変位が垂直変位の 2.5 倍以上必要。
これにより、縦スクロールしながらわずかに横に動いても誤検知しない。

```
                |dy|
                 ↑
          68°   /│ 68° ← ここより内側は垂直スワイプ
               / │
              /  │
  ───────────/───┼────────
 左スワイプ  /68°│68°\  右スワイプ
         に /    │    \ に検知
         検知    │     検知される範囲
```

---

## 現在の実装箇所

### ThreadPage（スレッド表示画面）

| ジェスチャー | 条件 | アクション |
|---|---|---|
| **左スワイプ**（ページ） | ポップアップなし & 書き込みパネル閉 | 書き込みパネルを開く |
| **右スワイプ**（ページ） | ポップアップなし & 書き込みパネル閉 | スレッド一覧に戻る（キャッシュ使用） |
| **右スワイプ**（書き込みパネル・モバイル） | 常に | 書き込みパネルを閉じる |

```typescript
// ページ全体のスワイプ（誤検知抑制設定）
const pageSwipe = useSwipeGesture({
  onSwipeLeft:  () => setWriteOpen(true),
  onSwipeRight: () => navigate(`/boards/${boardId}`, { state: { useCache: true } }),
  minDistance: 80,
  axisRatio: 2.5,           // 厳格な判定
  disabled: popups.length > 0 || writeOpen,
});

// 書き込みパネルを閉じるスワイプ（ゆるめの設定）
const writePanelSwipe = useSwipeGesture({
  onSwipeRight: () => setWriteOpen(false),
  minDistance: 60,
  axisRatio: 1.5,           // やや緩い判定（意図的なアクション）
});
```

---

## 拡張方針

将来的にジェスチャーを追加する場合:

1. **新しいジェスチャー種別** (ピンチ・長押しなど): `useSwipeGesture` と同じ設計で新フックを作成
   - 例: `src/hooks/useLongPress.ts`
   - 例: `src/hooks/usePinchGesture.ts`

2. **複数ジェスチャーの組み合わせ**: 各フックを独立して使用し、`handlers` を合成する
   ```typescript
   const swipe = useSwipeGesture({ ... });
   const longPress = useLongPress({ ... });
   // それぞれのハンドラを対応するイベントに渡す
   ```

3. **ジェスチャーのチェーン**: `disabled` フラグでモーダル表示中などの無効化を制御

4. **PC でのキーボードショートカット**: ジェスチャーと同じアクションを `useKeyboardShortcut.ts` で実装

---

## デバッグのコツ

- `axisRatio` を一時的に `1.0` に下げると、斜め方向でもジェスチャーが発火しやすくなる
- `minDistance` を `0` にすると最小距離チェックなしで検知できる（開発確認用）
- Chrome DevTools の「センサー」タブでタッチイベントをシミュレートできる
