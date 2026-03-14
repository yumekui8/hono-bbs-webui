import { useRef } from "react";

/**
 * タッチスワイプジェスチャー検出フック。
 *
 * 水平・垂直の変位比率チェック (`axisRatio`) により、縦スクロール中の
 * 誤ジェスチャー検知を抑制する。
 *
 * @example
 * const swipe = useSwipeGesture({
 *   onSwipeLeft: () => openWritePanel(),
 *   onSwipeRight: () => navigate(-1),
 *   minDistance: 80,
 *   axisRatio: 2.5,
 * });
 * return <div {...swipe.handlers}>...</div>;
 */

export interface SwipeGestureHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export interface UseSwipeGestureOptions {
  /** 右→左 スワイプ（左スワイプ）コールバック */
  onSwipeLeft?: () => void;
  /** 左→右 スワイプ（右スワイプ）コールバック */
  onSwipeRight?: () => void;
  /** 上スワイプコールバック */
  onSwipeUp?: () => void;
  /** 下スワイプコールバック */
  onSwipeDown?: () => void;
  /**
   * 最小スワイプ距離（px）。
   * この距離未満のタッチはジェスチャーとして認識しない。
   * @default 80
   */
  minDistance?: number;
  /**
   * 主軸の変位が副軸の変位に対して必要な最小倍率。
   * 2.5 の場合、水平スワイプとして認識するには水平変位が垂直変位の 2.5 倍以上必要。
   * 値を大きくするほど誤検知が減るが、斜め方向での検知が難しくなる。
   * @default 2.5
   */
  axisRatio?: number;
  /**
   * true の場合、ジェスチャー検知を無効にする。
   * @default false
   */
  disabled?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minDistance = 80,
  axisRatio = 2.5,
  disabled = false,
}: UseSwipeGestureOptions): { handlers: SwipeGestureHandlers } {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (disabled) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx >= minDistance && absDx >= absDy * axisRatio) {
      // 水平スワイプとして認識
      if (dx > 0) onSwipeRight?.();
      else onSwipeLeft?.();
    } else if (absDy >= minDistance && absDy >= absDx * axisRatio) {
      // 垂直スワイプとして認識
      if (dy > 0) onSwipeDown?.();
      else onSwipeUp?.();
    }
  };

  return { handlers: { onTouchStart, onTouchEnd } };
}
