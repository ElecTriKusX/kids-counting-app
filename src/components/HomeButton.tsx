/**
 * HomeButton — round 56×56 navigation button rendered in the top-left
 * of every non-Home screen (Arithmetic, Compare, Compose,
 * StickerCollection, ParentLock, ParentSection).
 *
 * NOTE on the icon: the original design.md sketches showed a "home"
 * glyph, but the reviewed `design.pen` mock replaced every
 * "home"-style return control with a back-arrow ("стрелка назад") for
 * a more conventional navigation affordance. The component name
 * `HomeButton` is preserved per tasks.md 10.3, but the rendered icon
 * is a back-arrow — it returns the user one level back in the stack,
 * which on every game screen is exactly the Home screen.
 *
 * Visual contract (design.md → "Theme" / design-brief.md → 3.9):
 *  - 56×56 pill shape (`borderRadius: theme.radii.pill` = 999) so the
 *    button reads as fully round.
 *  - Background = `theme.colors.surface` (the same elevated cream as
 *    `Card`) with a soft shadow lifting it off the page.
 *  - Centered back-arrow glyph ("←", U+2190) sized to 28pt with
 *    `theme.colors.text`. Using a Unicode glyph keeps the component
 *    free of new asset dependencies and renders cleanly on iOS and
 *    Android system fonts.
 *  - Built on top of `PressableButton`, so the tap animation, sound,
 *    and 64×64 hit-area minimum from R12.4 / R12.5 are inherited
 *    automatically — even though the visual circle is 56×56, the
 *    underlying `Pressable` enforces `minHeight/minWidth = 64`.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';

import PressableButton from './PressableButton';
import theme from '@/theme';

export interface HomeButtonProps {
  /** Press handler — typically `() => navigation.popToTop()`. */
  onPress?: () => void;
  /**
   * Accessibility label. Defaults to "Назад" because the rendered
   * glyph is a back-arrow that returns the user to the previous
   * screen (which is Home from any in-app surface).
   */
  accessibilityLabel?: string;
}

const BUTTON_SIZE = 56;
const ICON_FONT_SIZE = 28;
// Unicode "Leftwards Arrow" (U+2190) — renders as a clean back-arrow on
// iOS and Android system fonts without pulling in an icon library.
const BACK_ARROW_GLYPH = '\u2190';

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft shadow consistent with `Card` so the floating control reads
    // as elevated above the cream background.
    shadowColor: theme.colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  glyph: {
    fontSize: ICON_FONT_SIZE,
    color: theme.colors.text,
    fontWeight: '600',
    // Slight optical adjustment so the arrow sits centered on its
    // baseline inside the round button.
    lineHeight: ICON_FONT_SIZE,
    textAlign: 'center',
  },
});

const HomeButton: React.FC<HomeButtonProps> = ({
  onPress,
  accessibilityLabel = 'Назад',
}) => {
  return (
    <PressableButton
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={styles.button}
    >
      <Text style={styles.glyph} accessibilityElementsHidden>
        {BACK_ARROW_GLYPH}
      </Text>
    </PressableButton>
  );
};

HomeButton.displayName = 'HomeButton';

export { HomeButton };
export default HomeButton;
