/**
 * Tile — плитка с цифрой (Compose_Mode).
 *
 * Поведение:
 *  - При drag (через external translateX/Y/scale) поднимается и
 *    плавно покачивается (rotation ±3deg, period ~280ms), пока
 *    `wobble` > 0. Покачивание реализовано через `withRepeat` на
 *    отдельном shared-value (rotation), который запускается/гасится
 *    через `useAnimatedReaction(wobble, ...)` — без `Date.now()`,
 *    что безопасно для worklet-рантайма.
 *  - В покое — без вращения.
 */

import React, { useEffect } from 'react';
import {
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import Animated, {
  type SharedValue,
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { getNunitoFamily } from '../hooks/useAppFonts';

const TILE_SIZE = 80;
const TILE_RADIUS = 24;
const TILE_FONT_SIZE = 42;

const FILLS: readonly [string, string, string] = [
  '#FFD93D', // yellow-1
  '#FFCE4D', // yellow-2
  '#FFBA59', // yellow-3
];

export interface TileProps {
  value: number;
  colorIndex?: 0 | 1 | 2;
  translateX?: SharedValue<number>;
  translateY?: SharedValue<number>;
  scale?: SharedValue<number>;
  /** Включить wobble: > 0 — качать, 0 — стоп. */
  wobble?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
}

const Tile: React.FC<TileProps> = ({
  value,
  colorIndex = 0,
  translateX,
  translateY,
  scale,
  wobble,
  style,
}) => {
  const internalTx = useSharedValue(0);
  const internalTy = useSharedValue(0);
  const internalScale = useSharedValue(1);
  const internalWobble = useSharedValue(0);
  const rotation = useSharedValue(0);

  const tx = translateX ?? internalTx;
  const ty = translateY ?? internalTy;
  const sc = scale ?? internalScale;
  const wb = wobble ?? internalWobble;

  // Реакция на wobble: запускаем/гасим колебания угла без Date.now()
  useAnimatedReaction(
    () => wb.value,
    (current, previous) => {
      'worklet';
      if (current > 0 && previous !== current) {
        rotation.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 140, easing: Easing.inOut(Easing.quad) }),
            withTiming(3, { duration: 140, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          true,
        );
      } else if (current === 0) {
        cancelAnimation(rotation);
        rotation.value = withTiming(0, { duration: 120 });
      }
    },
    [wb],
  );

  useEffect(() => {
    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: sc.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const fill = FILLS[colorIndex] ?? FILLS[0];

  return (
    <Animated.View
      style={[styles.tile, { backgroundColor: fill }, animatedStyle, style]}
      accessibilityRole="image"
      accessibilityLabel={`Плитка ${value}`}
    >
      <Text style={styles.value}>{value}</Text>
    </Animated.View>
  );
};

Tile.displayName = 'Tile';

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5B800',
    shadowOpacity: 0.33,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  value: {
    fontSize: TILE_FONT_SIZE,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
    lineHeight: TILE_FONT_SIZE + 2,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export { Tile };
export default Tile;
