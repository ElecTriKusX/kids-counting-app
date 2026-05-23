/**
 * Tile — плитка с цифрой (Compose_Mode).
 *
 * Изменения:
 *  - При drag (через external translateX/Y/scale) можно добавить
 *    лёгкое покачивание (rotation oscillation), пока scale > 1.
 *  - Тени и базовая стилизация совпадают с Pencil-компонентом PKWYZ.
 */

import React from 'react';
import {
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import Animated, {
  type SharedValue,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
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
  /** Включить wobble-анимацию (вращение ±3deg на repeat), пока активна. */
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

  const tx = translateX ?? internalTx;
  const ty = translateY ?? internalTy;
  const sc = scale ?? internalScale;
  const wb = wobble ?? internalWobble;

  // Wobble: -3..+3 degrees, period ~250ms, активен когда wb.value > 0
  const wobbleRotation = useDerivedValue(() => {
    if (wb.value <= 0) return 0;
    return Math.sin(Date.now() / 80) * 3;
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: sc.value },
      { rotate: `${wobbleRotation.value}deg` },
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
    lineHeight: TILE_FONT_SIZE,
  },
});

export { Tile };
export default Tile;
