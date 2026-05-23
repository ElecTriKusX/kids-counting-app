/**
 * useScreenScale — коэффициент масштаба для адаптации игровых экранов
 * под разные разрешения.
 *
 * Дизайн макетировался под 390×844 (iPhone 14 baseline).
 * Возвращает `scale`, на который нужно умножать абсолютные размеры:
 *  - 1.0 — на референсном экране 390 шириной
 *  - <1.0 — на маленьких устройствах (например, iPhone SE 320px)
 *  - >1.0 — на больших (планшеты, Pro Max)
 *
 * Также возвращает `width`, `height` текущего окна.
 */

import { useWindowDimensions } from 'react-native';

const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;

export interface ScreenScale {
  width: number;
  height: number;
  scale: number;
  /** Отдельный множитель по высоте — для вертикальных позиций (y). */
  scaleY: number;
}

export function useScreenScale(): ScreenScale {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / REFERENCE_WIDTH, 1.4);
  const scaleY = Math.min(height / REFERENCE_HEIGHT, 1.4);
  return { width, height, scale, scaleY };
}
