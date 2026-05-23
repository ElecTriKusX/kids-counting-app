/**
 * `useTileGesture` — pan-жест для одной плитки в Compose_Mode.
 *
 * Источник правды:
 *   - `.kiro/specs/kids-counting-app/design.md` →
 *     "Drag-and-drop (react-native-gesture-handler + reanimated)".
 *   - `tasks.md` → 11.3.
 *
 * Хук возвращает Reanimated shared-значения (`translateX`, `translateY`,
 * `scale`) и собранный `Gesture.Pan()`. Компонент Tile уже умеет
 * рендериться поверх трёх SharedValue'ов через `useAnimatedStyle`, так
 * что нам остаётся только собрать жест и пробросить значения.
 *
 * Контракт жеста (см. design.md и Req 4.2, 4.5, 6.2):
 *  - `onBegin` → проигрываем `drag_pickup` и пушим лёгкое тактильное
 *    событие; плитка увеличивается до 1.05.
 *  - `onUpdate` → translateX/Y следуют за `translation*` события.
 *  - `onEnd` → hit-test против `binLayout` (window-coords); при
 *    попадании добавляем плитку в `composeBin` и проигрываем
 *    `drag_drop`. При промахе плитка spring-анимацией возвращается
 *    в (0, 0).
 *
 * `binLayout` приходит из `Bin.onLayoutMeasured` — там уже выполнен
 * `measureInWindow`, значит координаты в системе экрана. Жест отдаёт
 * `e.absoluteX/absoluteY` в той же системе координат, поэтому hit-test —
 * простое прямоугольное попадание точки.
 *
 * Все JS-сайды (`soundAdapter.play`, `Haptics`, `useSessionStore`)
 * вызываются строго через `runOnJS`, потому что коллбеки жестов
 * выполняются на UI-потоке (worklet).
 */

import { useCallback } from 'react';

import * as Haptics from 'expo-haptics';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import {
  type SharedValue,
  runOnJS,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { soundAdapter } from '../../audio/sound-adapter';
import { useSessionStore } from '../../state/session-store';
import type { Tile } from '../../types';

/** Прямоугольник корзины в координатах окна (px). */
export interface BinLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UseTileGestureOptions {
  /** Плитка, которой управляет данный жест. */
  tile: Tile;
  /**
   * Layout корзины в координатах окна. До первого `measureInWindow`
   * Bin может ещё не отправить значение — в этом случае все
   * drop-попытки промахиваются и плитка возвращается на исходное
   * место (так и задумано: ронять можно только в видимую корзину).
   */
  binLayout: BinLayout | null;
  /**
   * Опциональный коллбек, вызываемый сразу после успешного дропа на
   * JS-стороне (после `addTileToBin`). Удобно для экрана, чтобы
   * запустить локальную анимацию или скрыть плитку.
   */
  onDrop?: () => void;
}

export interface UseTileGestureResult {
  pan: PanGesture;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
}

/** Масштаб плитки во время удержания. */
const PICKUP_SCALE = 1.05;
/** Масштаб плитки в покое. */
const RESTING_SCALE = 1;

/**
 * Чистая функция hit-testing'а: точка попала внутрь прямоугольника?
 *
 * Сравнения нестрогие справа/снизу, потому что `measureInWindow`
 * возвращает координаты с плавающей точкой, и пользователь должен
 * иметь возможность «бросить» плитку по самому краю корзины.
 */
function isInsideRect(
  px: number,
  py: number,
  rect: BinLayout,
): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  );
}

export function useTileGesture(
  opts: UseTileGestureOptions,
): UseTileGestureResult {
  const { tile, binLayout, onDrop } = opts;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(RESTING_SCALE);

  // Функции, которые жест дёрнет через runOnJS. Объявляем их в
  // useCallback, чтобы жест на каждом рендере получал стабильные
  // ссылки и не пересоздавался напрасно.
  const playPickupSound = useCallback(() => {
    void soundAdapter.play('drag_pickup');
  }, []);

  const playDropSound = useCallback(() => {
    void soundAdapter.play('drag_drop');
  }, []);

  const triggerHaptic = useCallback(() => {
    // expo-haptics может бросать на устройствах без вибромотора /
    // в эмуляторе. Тактильная отдача — приятный бонус, не критичный
    // путь, поэтому ошибки гасим.
    Haptics.selectionAsync().catch(() => {});
  }, []);

  /**
   * JS-сторона дропа: добавляет плитку в bin и зовёт
   * пользовательский `onDrop`. Используем `getState()`, потому что
   * jest-/worklet-сценарий безопаснее без замыкания на свежий
   * экземпляр хук-функции.
   */
  const handleDrop = useCallback(
    (droppedTile: Tile) => {
      useSessionStore.getState().addTileToBin(droppedTile);
      onDrop?.();
    },
    [onDrop],
  );

  // Сборка жеста. Все callbacks — worklet'ы (по умолчанию для
  // `Gesture.Pan()` из gesture-handler v2), значит можно без
  // дополнительной директивы делать `translateX.value = ...`.
  const pan = Gesture.Pan()
    .onBegin(() => {
      runOnJS(playPickupSound)();
      runOnJS(triggerHaptic)();
      scale.value = withSpring(PICKUP_SCALE);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      // Возврат к нормальному масштабу в любом случае. Сделано
      // первым, чтобы плитка корректно «отдала» подъём даже при
      // успешном дропе, прежде чем исчезнуть в bin.
      scale.value = withSpring(RESTING_SCALE);

      const dropped =
        binLayout !== null &&
        isInsideRect(e.absoluteX, e.absoluteY, binLayout);

      if (dropped) {
        runOnJS(handleDrop)(tile);
        runOnJS(playDropSound)();
        // Сбрасываем translate без spring — плитка визуально
        // «прилипает» к корзине, а реальный рендер уйдёт в Bin.
        translateX.value = 0;
        translateY.value = 0;
      } else {
        // Промах: плавно возвращаем плитку на исходную позицию.
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  return { pan, translateX, translateY, scale };
}
