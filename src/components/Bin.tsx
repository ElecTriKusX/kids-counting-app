/**
 * Bin — drop zone for Compose_Mode.
 *
 * The Bin is a 320×160 cream surface that visually changes by `status`:
 *  - `'empty'`   → dashed border, body-text hint "Перетащи плитки сюда"
 *  - `'partial'` → dashed border, row of tiles + "= sum"
 *  - `'correct'` → solid mint border, row of tiles + "= sum"
 *  - `'invalid'` → solid coral border, row of tiles + "= sum"
 *
 * The component is presentational. It does not run hit-testing itself
 * — that is handled by `useTileGesture` against the bin's absolute
 * window-space rectangle. The Bin exposes that rectangle through the
 * `onLayoutMeasured` callback, which fires both on mount (after the
 * first `onLayout`) and any subsequent layout change. Coordinates are
 * captured via `measureInWindow` so they survive transforms applied
 * by ancestor `Animated.View`s and stack layouts.
 *
 * Tile values are rendered through the existing `Tile` component
 * (no transforms, since these tiles are static "completed" tokens),
 * separated by a `+` glyph and terminated with `= <sum>`. The
 * separator characters use plain RN `Text` with body typography —
 * the design treats them as label glue, not numeric figures.
 */

import React, { useCallback, useRef } from 'react';
import {
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import NumericText from './NumericText';
import Tile from './Tile';
import theme from '@/theme';

export interface BinLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type BinStatus = 'empty' | 'partial' | 'correct' | 'invalid';

export interface BinTile {
  id: string;
  value: number;
}

export interface BinProps {
  status: BinStatus;
  /**
   * Tiles currently dropped into the bin. Required visually for any
   * status other than `empty`. Defaults to an empty array so the
   * component is safe even if a caller forgets to pass it for
   * `empty`.
   */
  tiles?: BinTile[];
  /** Sum of `tiles[*].value`. Shown as "= sum" on non-empty states. */
  sum?: number;
  /** Target the child is composing toward; used for a11y labels. */
  target: number;
  /** Fired with the bin's absolute window-space layout rectangle. */
  onLayoutMeasured?(layout: BinLayout): void;
}

const BIN_WIDTH = 320;
const BIN_HEIGHT = 160;
const BIN_RADIUS = 28;
const BIN_BORDER_WIDTH = 3;
const HINT_TEXT = 'Перетащи плитки сюда';

const SEPARATOR_FONT_SIZE = 32;

const styles = StyleSheet.create({
  base: {
    width: BIN_WIDTH,
    height: BIN_HEIGHT,
    borderRadius: BIN_RADIUS,
    borderWidth: BIN_BORDER_WIDTH,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  emptyHint: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight,
    color: theme.colors.text,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  separator: {
    fontSize: SEPARATOR_FONT_SIZE,
    fontWeight: '600',
    color: theme.colors.text,
    marginHorizontal: theme.spacing.xs,
  },
});

/**
 * Resolve the border style and color for a given status.
 *
 * Empty/partial keep the inviting dashed outline (R4.2: a "visual
 * basket"). Correct/invalid switch to a solid colored border so the
 * outcome reads at a glance, using the same mint/coral palette that
 * Answer_Feedback uses on buttons (R6.5).
 */
function borderForStatus(status: BinStatus): {
  borderStyle: 'dashed' | 'solid';
  borderColor: string;
} {
  switch (status) {
    case 'empty':
    case 'partial':
      return {
        borderStyle: 'dashed',
        borderColor: theme.colors.borderSubtle,
      };
    case 'correct':
      return { borderStyle: 'solid', borderColor: theme.colors.correct };
    case 'invalid':
      return { borderStyle: 'solid', borderColor: theme.colors.incorrect };
  }
}

const Bin: React.FC<BinProps> = ({
  status,
  tiles = [],
  sum,
  target,
  onLayoutMeasured,
}) => {
  const viewRef = useRef<View>(null);

  // Compute and dispatch the absolute layout rectangle. Called from
  // `onLayout` so the rectangle is refreshed any time the bin's size
  // or position changes (e.g. orientation flip, parent re-flow).
  const measure = useCallback(() => {
    if (!onLayoutMeasured) return;
    const node = viewRef.current;
    if (!node) return;
    node.measureInWindow((x, y, w, h) => {
      // RN can briefly report NaN for unmounted nodes — guard so we
      // never forward bogus rectangles to hit-testing code.
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(w) &&
        Number.isFinite(h)
      ) {
        onLayoutMeasured({ x, y, w, h });
      }
    });
  }, [onLayoutMeasured]);

  const handleLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      measure();
    },
    [measure],
  );

  const border = borderForStatus(status);

  // Effective sum: prefer the explicit `sum` prop, fall back to a
  // local sum of `tiles`. Keeps the "= sum" line consistent even if
  // upstream forgets to pass it.
  const effectiveSum =
    typeof sum === 'number'
      ? sum
      : tiles.reduce((acc, t) => acc + t.value, 0);

  const a11yLabel =
    status === 'empty'
      ? `Корзина пуста, цель ${target}`
      : `Корзина: сумма ${effectiveSum}, цель ${target}`;

  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      style={[
        styles.base,
        { borderStyle: border.borderStyle, borderColor: border.borderColor },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      {status === 'empty' ? (
        <Text style={styles.emptyHint}>{HINT_TEXT}</Text>
      ) : (
        <View style={styles.row}>
          {tiles.map((t, i) => (
            <React.Fragment key={t.id}>
              {i > 0 ? <Text style={styles.separator}>+</Text> : null}
              <Tile value={t.value} colorIndex={(i % 3) as 0 | 1 | 2} />
            </React.Fragment>
          ))}
          <Text style={styles.separator}>=</Text>
          <NumericText fontSize={42}>{String(effectiveSum)}</NumericText>
        </View>
      )}
    </View>
  );
};

Bin.displayName = 'Bin';

export { Bin };
export default Bin;
