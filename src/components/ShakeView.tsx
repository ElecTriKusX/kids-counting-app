/**
 * ShakeView — wrapper that exposes an imperative `shake()` method to
 * play the Answer_Feedback (incorrect) horizontal wobble animation.
 *
 * Per design.md "Answer_Feedback → Incorrect": the kid sees a short
 * ±8px horizontal shake on the button they chose. The full sequence is
 * 5 × 50ms = ~250ms, well within Requirement 6.3's 500ms cap on
 * answer-feedback animations.
 *
 * Usage:
 *
 *   const ref = useRef<ShakeHandle>(null);
 *   <ShakeView ref={ref}><PressableButton ... /></ShakeView>
 *   ref.current?.shake(); // on incorrect answer
 *
 * The component is a thin animated wrapper — it owns only its own
 * translateX shared value and never touches its children. Parent code
 * is responsible for sound (`error`) and color highlight (R6.4).
 */

import React, { forwardRef, useImperativeHandle } from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export interface ShakeHandle {
  /**
   * Plays the shake animation once. Safe to call repeatedly — each call
   * restarts the sequence from the current value.
   */
  shake(): void;
}

export interface ShakeViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const STEP_DURATION_MS = 50;
const SHAKE_OFFSET_PX = 8;

const ShakeView = forwardRef<ShakeHandle, ShakeViewProps>(function ShakeView(
  { children, style },
  ref,
) {
  const shakeX = useSharedValue(0);

  useImperativeHandle(
    ref,
    () => ({
      shake() {
        shakeX.value = withSequence(
          withTiming(-SHAKE_OFFSET_PX, { duration: STEP_DURATION_MS }),
          withTiming(SHAKE_OFFSET_PX, { duration: STEP_DURATION_MS }),
          withTiming(-SHAKE_OFFSET_PX, { duration: STEP_DURATION_MS }),
          withTiming(SHAKE_OFFSET_PX, { duration: STEP_DURATION_MS }),
          withTiming(0, { duration: STEP_DURATION_MS }),
        );
      },
    }),
    [shakeX],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
});

ShakeView.displayName = 'ShakeView';

export { ShakeView };
export default ShakeView;
