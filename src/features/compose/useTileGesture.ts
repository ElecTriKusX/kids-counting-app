/**
 * useTileGesture — pan-жест для одной плитки в Compose_Mode.
 *
 * Изменения:
 *  - При подъёме плитка увеличивается до 1.25 (более заметно).
 *  - Запускается wobble — лёгкое покачивание плитки.
 *  - На дроп / промах — wobble выключается, scale возвращается к 1.
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

export interface BinLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UseTileGestureOptions {
  tile: Tile;
  binLayout: BinLayout | null;
  onDrop?: () => void;
}

export interface UseTileGestureResult {
  pan: PanGesture;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  wobble: SharedValue<number>;
}

const PICKUP_SCALE = 1.25;
const RESTING_SCALE = 1;
const ACTIVATION_DISTANCE = 5;

export function useTileGesture(
  opts: UseTileGestureOptions,
): UseTileGestureResult {
  const { tile, binLayout, onDrop } = opts;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(RESTING_SCALE);
  const wobble = useSharedValue(0);

  const playPickupSound = useCallback(() => {
    void soundAdapter.play('drag_pickup');
  }, []);

  const playDropSound = useCallback(() => {
    void soundAdapter.play('drag_drop');
  }, []);

  const triggerHaptic = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleDrop = useCallback(
    (droppedTile: Tile) => {
      useSessionStore.getState().addTileToBin(droppedTile);
      onDrop?.();
    },
    [onDrop],
  );

  const isInsideBin = (
    px: number,
    py: number,
    bin: BinLayout,
  ): boolean => {
    'worklet';
    return (
      px >= bin.x &&
      px <= bin.x + bin.w &&
      py >= bin.y &&
      py <= bin.y + bin.h
    );
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(0)
    .minDistance(ACTIVATION_DISTANCE)
    .onBegin(() => {
      'worklet';
      runOnJS(playPickupSound)();
      runOnJS(triggerHaptic)();
      scale.value = withSpring(PICKUP_SCALE, {
        damping: 12,
        stiffness: 220,
      });
      wobble.value = 1; // включаем покачивание
    })
    .onUpdate((e) => {
      'worklet';
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      scale.value = withSpring(RESTING_SCALE, {
        damping: 15,
        stiffness: 200,
      });
      wobble.value = 0;

      const dropped =
        binLayout !== null &&
        isInsideBin(e.absoluteX, e.absoluteY, binLayout);

      if (dropped) {
        runOnJS(playDropSound)();
        runOnJS(handleDrop)(tile);
        // Плавный возврат к нулевой позиции (плитка скрывается через
        // droppedIds на JS-стороне, поэтому даже при невидимом
        // элементе spring завершится корректно).
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 180 });
      }
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(RESTING_SCALE, {
        damping: 15,
        stiffness: 200,
      });
      wobble.value = 0;
    });

  return { pan, translateX, translateY, scale, wobble };
}
