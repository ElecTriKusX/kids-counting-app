/**
 * ConfettiOverlay — code-drawn confetti for Answer_Feedback (correct answer).
 *
 * Per the project design brief (`design-brief.md`), Lottie is reserved for
 * the Session_Reward overlay (one fixed celebratory animation per round).
 * For each individual correct answer we want a *fresh* burst that the kid
 * cannot memorize — so this component procedurally draws 18–28 small
 * rectangular "chips" at random horizontal positions, with random colors,
 * sizes, and rotation, falling/spreading downward over ~1.4 seconds.
 *
 * The overlay is fully transparent and non-interactive (`pointerEvents="none"`),
 * so it can be stacked on top of any game screen without blocking taps on
 * the answer buttons or the home button.
 *
 * Contract:
 *   - `visible` toggles the burst. When it flips false → true, a *new* set
 *     of chips is generated (memoized on the visible toggle) so each
 *     showing is randomized but stable for the lifetime of the burst.
 *   - `onComplete` is invoked once after the burst finishes (~1400ms).
 *     Parents typically use it to clear the visible flag back to false.
 *
 * Implementation notes:
 *   - Screen dimensions are read inside the component via
 *     `Dimensions.get('window')` (not at module-load time) so the layout
 *     respects the actual device size whenever the overlay mounts.
 *   - Each chip is its own child component so it can own a Reanimated
 *     `useSharedValue` (hooks cannot run inside a loop).
 *   - The completion timer lives at the parent level; it fires exactly
 *     once per burst regardless of how many chips were generated.
 *
 * Validates: Requirements 6.1, 6.5
 */

import React, { useEffect, useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const PALETTE: readonly string[] = [
  '#FFD93D',
  '#FFCE4D',
  '#FFBA59',
  '#6BCB77',
  '#4D96FF',
  '#FF6B6B',
];

const MIN_CHIPS = 18;
const MAX_CHIPS = 28;
const DURATION_MS = 1400;
const MIN_SIZE = 8;
const MAX_SIZE = 16;

interface Chip {
  /** Horizontal anchor (px from the left edge of the overlay). */
  x: number;
  /** Starting vertical position (typically near the top of the screen). */
  startY: number;
  /** Ending vertical position — just below the bottom edge. */
  endY: number;
  /** Initial rotation in degrees. */
  rotateStart: number;
  /** Final rotation in degrees (chips visibly tumble while falling). */
  rotateEnd: number;
  /** Hex color from the kids palette. */
  color: string;
  /** Width in px; height is derived as `size * 0.5` so chips are rectangular. */
  size: number;
}

function pickColor(): string {
  // `noUncheckedIndexedAccess` makes raw indexing return `string | undefined`,
  // so fall back to the first palette entry (which is statically present).
  const idx = Math.floor(Math.random() * PALETTE.length);
  return PALETTE[idx] ?? PALETTE[0]!;
}

function generateChips(width: number, height: number): Chip[] {
  const count =
    MIN_CHIPS + Math.floor(Math.random() * (MAX_CHIPS - MIN_CHIPS + 1));

  const chips: Chip[] = [];
  for (let i = 0; i < count; i++) {
    const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
    chips.push({
      x: Math.random() * width,
      // Spread starting Y across the top third of the screen so the burst
      // looks like an explosion, not a uniform line.
      startY: -20 + Math.random() * (height * 0.3),
      endY: height + 40,
      rotateStart: Math.random() * 360,
      // Tumble between -360 and +720 degrees for visible spin.
      rotateEnd: -360 + Math.random() * 1080,
      color: pickColor(),
      size,
    });
  }
  return chips;
}

interface ChipViewProps {
  chip: Chip;
}

const ChipView: React.FC<ChipViewProps> = ({ chip }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: DURATION_MS,
      easing: Easing.out(Easing.quad),
    });
    // We intentionally only run on mount — each ChipView instance is
    // recreated when the parent regenerates the chips array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const y = interpolate(progress.value, [0, 1], [chip.startY, chip.endY]);
    const rotate = interpolate(
      progress.value,
      [0, 1],
      [chip.rotateStart, chip.rotateEnd],
    );
    return {
      transform: [{ translateY: y }, { rotate: `${rotate}deg` }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: chip.x,
          top: 0,
          width: chip.size,
          height: chip.size * 0.5,
          borderRadius: 3,
          backgroundColor: chip.color,
        },
        animatedStyle,
      ]}
    />
  );
};

ChipView.displayName = 'ChipView';

export interface ConfettiOverlayProps {
  /** When true, a fresh burst is rendered. Going false → true regenerates chips. */
  visible: boolean;
  /** Called once after the ~1.4s burst finishes. Optional. */
  onComplete?: () => void;
}

const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({
  visible,
  onComplete,
}) => {
  // Re-read the window size on every show so the burst always matches the
  // current screen (handles rotation / split-screen on tablets gracefully).
  const chips = useMemo<Chip[]>(() => {
    if (!visible) return [];
    const { width, height } = Dimensions.get('window');
    return generateChips(width, height);
    // We deliberately key only on `visible`: we want a single stable burst
    // for the lifetime of one show, even if the overlay re-renders for
    // unrelated reasons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Single timer at the parent level fires onComplete exactly once per
  // burst. Cancelled if the overlay is hidden early.
  useEffect(() => {
    if (!visible) return;
    const handle = setTimeout(() => {
      onComplete?.();
    }, DURATION_MS);
    return () => clearTimeout(handle);
  }, [visible, onComplete]);

  if (!visible || chips.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      {chips.map((chip, idx) => (
        <ChipView key={idx} chip={chip} />
      ))}
    </View>
  );
};

ConfettiOverlay.displayName = 'ConfettiOverlay';

export { ConfettiOverlay };
export default ConfettiOverlay;
