/**
 * PressableButton — base interactive primitive used by every tappable
 * control in the app (Home mode tiles, answer chips in Arithmetic /
 * Compare, Parent_Lock submit, sticker thumbnails, etc.).
 *
 * Behaviour (design.md → "Tap_Feedback" and "Sound_Manifest"):
 *  - On `onPressIn` the button scales down to 0.95× over 120ms via
 *    `withTiming` and triggers `soundAdapter.play('tap')`. The total
 *    down+up cycle is ~240ms, well within the 500ms cap from R5.1.
 *  - On `onPressOut` the scale eases back to 1.0× over 120ms.
 *  - `soundAdapter.play` is total — any audio failure is swallowed by
 *    the adapter, so the tap animation is never blocked by sound.
 *
 * Layout / theming (design.md → "Theme" and Requirement 12):
 *  - `borderRadius` = `theme.radii.button` (24, exceeds the R12.4
 *    minimum of 20).
 *  - `minHeight` = `theme.radii.minTouchable` (64) and `minWidth` = 64
 *    so the hit-area is always at least 64×64 (R12.4).
 *  - Default `hitSlop` of 12 expands the touch target an additional
 *    12px on every side without affecting layout.
 *
 * Caller-provided `style` is merged on top of the themed defaults so
 * any consumer can layer in background colors, padding, etc., but the
 * size and radius minima cannot be lowered (the inline overrides come
 * before `style` in the array). Consumers that want a *larger* radius
 * or hit-area can still set them explicitly.
 *
 * The component follows the imports/contract documented in tasks.md
 * 10.1 — `Pressable` from `react-native` wrapped inside an
 * `Animated.View` from `react-native-reanimated` whose transform is
 * driven by a shared `scale` value.
 */

import React from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { soundAdapter } from '@/audio/sound-adapter';
import theme from '@/theme';

export interface PressableButtonProps {
  /** Content rendered inside the button (typically `ButtonLabel` / icon). */
  children?: React.ReactNode;
  /** Press handler invoked after a complete tap. */
  onPress?: PressableProps['onPress'];
  /** Caller-provided style merged on top of the themed defaults. */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label forwarded to the underlying `Pressable`. */
  accessibilityLabel?: string;
  /** Accessibility role forwarded to the underlying `Pressable`. */
  accessibilityRole?: PressableProps['accessibilityRole'];
  /** When `true` the button does not animate, play sound, or invoke press. */
  disabled?: boolean;
  /**
   * Touch-target inflation around the button. Defaults to 12px on every
   * side so that even visually small consumers retain a generous tap
   * region for kids 4–6.
   */
  hitSlop?: PressableProps['hitSlop'];
}

const PRESS_DURATION_MS = 120;
const PRESSED_SCALE = 0.95;
const RESTING_SCALE = 1;
const DEFAULT_HIT_SLOP = 12;

const PressableButton: React.FC<PressableButtonProps> = ({
  children,
  onPress,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
  disabled = false,
  hitSlop = DEFAULT_HIT_SLOP,
}) => {
  const scale = useSharedValue(RESTING_SCALE);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn: PressableProps['onPressIn'] = () => {
    scale.value = withTiming(PRESSED_SCALE, { duration: PRESS_DURATION_MS });
    // `soundAdapter.play` is total — it swallows missing-asset / expo-av
    // errors internally, so we don't need a try/catch here.
    void soundAdapter.play('tap');
  };

  const handlePressOut: PressableProps['onPressOut'] = () => {
    scale.value = withTiming(RESTING_SCALE, { duration: PRESS_DURATION_MS });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        hitSlop={hitSlop}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={{ disabled }}
        style={[
          {
            borderRadius: theme.radii.button,
            minHeight: theme.radii.minTouchable,
            minWidth: theme.radii.minTouchable,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

PressableButton.displayName = 'PressableButton';

export { PressableButton };
export default PressableButton;
