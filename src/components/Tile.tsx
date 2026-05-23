/**
 * Tile — draggable square that holds a single number in Compose_Mode.
 *
 * The component is purely presentational: it owns no gesture or
 * domain logic. Parents that wire it up for drag-and-drop pass in
 * `translateX` / `translateY` / `scale` shared values from
 * `useTileGesture` and the tile mirrors them on the UI thread via
 * `useAnimatedStyle`. Components that just want a static tile (e.g.
 * the row of "completed" tiles inside the Bin) can omit the shared
 * values entirely and the tile renders with no transform.
 *
 * Visual contract (design.md → Compose_Mode and theme tokens):
 *  - 80×80 frame, `borderRadius` = `theme.radii.button` (24).
 *  - Background cycles through the `yellow1/yellow2/yellow3` accent
 *    triplet by `colorIndex` so a row of tiles reads as a friendly
 *    palette rotation rather than a flat yellow wall.
 *  - The number inside is rendered with `NumericText` at fontSize 42,
 *    well above the child-friendly minimum of 28pt (R12.6).
 *
 * `layoutCallback` exposes the tile's local layout box (relative to
 * its layout parent) when `onLayout` fires. The compose feature uses
 * this together with `Bin`'s `measureInWindow`-based callback to
 * compute hit-testing.
 */

import React from 'react';
import {
  type LayoutChangeEvent,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import NumericText from './NumericText';
import theme from '@/theme';

export interface TileLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TileProps {
  /** Number rendered at the centre of the tile. */
  value: number;
  /**
   * Index into the `yellow1/yellow2/yellow3` accent rotation. Defaults
   * to `0` (the primary yellow).
   */
  colorIndex?: 0 | 1 | 2;
  /**
   * Fired with the tile's local layout box (relative to the layout
   * parent) on every `onLayout`. Coordinates are *not* window-absolute
   * — feature code that needs absolute coordinates for hit-testing
   * should compose them with the parent's measurement.
   */
  layoutCallback?(layout: TileLayout): void;
  /** Optional drag x-offset shared value driven by gesture handlers. */
  translateX?: SharedValue<number>;
  /** Optional drag y-offset shared value driven by gesture handlers. */
  translateY?: SharedValue<number>;
  /** Optional scale shared value (e.g. 1.05 while dragging). */
  scale?: SharedValue<number>;
  /** Caller-provided container style (merged on top of theme defaults). */
  style?: StyleProp<ViewStyle>;
}

const TILE_SIZE = 80;
const TILE_FONT_SIZE = 42;

// Order matches the prop's union: 0 → yellow1, 1 → yellow2, 2 → yellow3.
const FILLS: readonly [string, string, string] = [
  theme.colors.yellow1,
  theme.colors.yellow2,
  theme.colors.yellow3,
];

const styles = StyleSheet.create({
  base: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: theme.radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const Tile: React.FC<TileProps> = ({
  value,
  colorIndex = 0,
  layoutCallback,
  translateX,
  translateY,
  scale,
  style,
}) => {
  // Always create internal shared values so the worklet has stable
  // references when the caller does not provide their own. Hooks must
  // be called unconditionally, so we cannot guard these on the props.
  const internalTx = useSharedValue(0);
  const internalTy = useSharedValue(0);
  const internalScale = useSharedValue(1);

  const tx = translateX ?? internalTx;
  const ty = translateY ?? internalTy;
  const sc = scale ?? internalScale;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: sc.value },
    ],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    if (!layoutCallback) return;
    const { x, y, width, height } = event.nativeEvent.layout;
    layoutCallback({ x, y, w: width, h: height });
  };

  const fill = FILLS[colorIndex] ?? FILLS[0];

  return (
    <Animated.View
      onLayout={onLayout}
      style={[styles.base, { backgroundColor: fill }, style, animatedStyle]}
      accessibilityRole="image"
      accessibilityLabel={`Плитка ${value}`}
    >
      <NumericText fontSize={TILE_FONT_SIZE}>{String(value)}</NumericText>
    </Animated.View>
  );
};

Tile.displayName = 'Tile';

export { Tile };
export default Tile;
