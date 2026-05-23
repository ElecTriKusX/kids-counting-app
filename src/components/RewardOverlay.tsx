/**
 * RewardOverlay — Session_Feedback animation shown after a 10-question round.
 *
 * Renders a full-screen Lottie animation (`assets/lottie/reward.lottie`) once,
 * plays the `session_reward` sound on show, and notifies the parent via
 * `onComplete` after roughly 2.2s — the typical length of the reward
 * animation. The overlay is fully non-interactive (`pointerEvents="none"`)
 * so it stacks safely over any game screen without blocking the
 * navigation that follows the round.
 *
 * Resilience contract (per task brief):
 *   - If the Lottie file fails to render — either because the asset is
 *     missing, malformed, or the native module raises `onAnimationFailure`
 *     — the overlay must NOT crash. Instead, it falls back to a simple
 *     static yellow ⭐ glyph so the kid still sees a celebratory cue.
 *   - The fallback is driven by component state, so the same overlay
 *     instance handles both render-time errors (caught by an inline
 *     ErrorBoundary) and runtime native failures (`onAnimationFailure`).
 *   - The completion timer fires regardless of which path is rendered,
 *     so navigation off the overlay never gets stuck if Lottie fails.
 *
 * Validates: Requirements 7.2
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

import { soundAdapter } from '../audio/sound-adapter';
import { colors } from '../theme';

// Approximate length of the Lottie reward animation. Kept slightly longer
// than the audio (1.5–2.5s per the manifest) so the visual celebration
// finishes before we hand control back to the parent.
const ANIMATION_DURATION_MS = 2200;

// `require()` of a binary `.lottie` asset returns an asset reference
// (a numeric handle on native, an object on web) that does not match the
// public `LottieViewProps['source']` type, but is what the runtime expects
// when Metro is configured to bundle `.lottie` files (see metro.config.js).
// Cast through `unknown` so we never interpret the value at the TS level.
const REWARD_SOURCE = require('../../assets/lottie/reward.lottie') as unknown as
  | string
  | { uri: string };

/**
 * Inline ErrorBoundary used as the "ErrorBoundary substitute" required by
 * the spec. React only exposes error-catching through class components, so
 * this is intentionally a tiny class colocated with the overlay rather than
 * a separate module — its only job is to flip the parent's `failed` flag
 * and render the static fallback.
 */
class LottieErrorBoundary extends React.Component<
  {
    onError: () => void;
    fallback: React.ReactNode;
    children: React.ReactNode;
  },
  { hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError(): { hasError: true } {
    return { hasError: true };
  }

  override componentDidCatch(): void {
    this.props.onError();
  }

  override render(): React.ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Static fallback shown when the Lottie animation cannot be rendered.
 * Plain `View` + `Text` so it has zero external dependencies — if the
 * Lottie path fails for *any* reason, this still renders.
 */
const StaticRewardFallback: React.FC = () => (
  <View style={styles.fallbackWrapper}>
    <View style={styles.fallbackCircle}>
      <Text style={styles.fallbackStar} accessibilityLabel="reward">
        ★
      </Text>
    </View>
  </View>
);

StaticRewardFallback.displayName = 'StaticRewardFallback';

export interface RewardOverlayProps {
  /** When true, the overlay mounts, plays once, and schedules `onComplete`. */
  visible: boolean;
  /** Called once after ~2.2s — typically used to clear `visible` and navigate. */
  onComplete?: () => void;
}

const RewardOverlay: React.FC<RewardOverlayProps> = ({
  visible,
  onComplete,
}) => {
  const [failed, setFailed] = useState(false);

  // Trigger the celebratory sound and schedule completion every time the
  // overlay transitions to visible. Both effects are idempotent w.r.t. the
  // soundAdapter (its `play` is total) and the timer is cleared if the
  // overlay is hidden early, so re-shows behave correctly.
  useEffect(() => {
    if (!visible) return;
    void soundAdapter.play('session_reward');
    const handle = setTimeout(() => {
      onComplete?.();
    }, ANIMATION_DURATION_MS);
    return () => clearTimeout(handle);
  }, [visible, onComplete]);

  // Reset the failure flag when the overlay is dismissed so the next show
  // gets another chance at rendering Lottie (e.g. after a transient native
  // hiccup). Without this, a single failure would lock the overlay into
  // the static fallback for the rest of the app's lifetime.
  useEffect(() => {
    if (!visible && failed) setFailed(false);
  }, [visible, failed]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {failed ? (
        <StaticRewardFallback />
      ) : (
        <LottieErrorBoundary
          onError={() => setFailed(true)}
          fallback={<StaticRewardFallback />}
        >
          <LottieView
            source={REWARD_SOURCE}
            autoPlay
            loop={false}
            resizeMode="contain"
            onAnimationFailure={() => setFailed(true)}
            style={styles.lottie}
          />
        </LottieErrorBoundary>
      )}
    </View>
  );
};

RewardOverlay.displayName = 'RewardOverlay';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  fallbackWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackStar: {
    fontSize: 96,
    lineHeight: 104,
    color: colors.text,
  },
});

export { RewardOverlay };
export default RewardOverlay;
