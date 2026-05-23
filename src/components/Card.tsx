/**
 * Card — neutral surface wrapper used for grouping related content
 * (Parent_Section statistics, sticker grid sections, etc.).
 *
 * Visual contract (design.md → "Theme" and design-brief.md → 3.11):
 *  - `borderRadius` = `theme.radii.card` (24, ≥ Requirement 12.1's 20pt
 *    floor for cards/buttons).
 *  - Background = `theme.colors.surface` (#FFFDF9, the slightly elevated
 *    cream tone — never pure white per R12.1).
 *  - Soft shadow rendered with low opacity so the card lifts off the
 *    cream background without harsh contrast (matches the design-brief
 *    "тени для карточек (мягкая, не больше 4–8% opacity)" guideline).
 *
 * The component is purely presentational and owns no behaviour. Callers
 * compose it with their own padding, gap and child content. The default
 * styles can be augmented via `style` (merged on top of the themed
 * defaults), but the radius and surface color come from the theme so
 * Property 16 holds without per-call enforcement.
 */

import React from 'react';
import {
  Platform,
  StyleSheet,
  type StyleProp,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import theme from '@/theme';

export interface CardProps {
  /** Content rendered inside the card. */
  children?: React.ReactNode;
  /** Caller-provided style merged on top of the themed defaults. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded for screen-reader announcements. */
  accessibilityLabel?: ViewProps['accessibilityLabel'];
  /** Forwarded for assistive-technology semantics. */
  accessibilityRole?: ViewProps['accessibilityRole'];
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    // Soft shadow — kept low-opacity so the lift reads on the cream
    // background without breaking the warm, friendly tone.
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
});

const Card: React.FC<CardProps> = ({
  children,
  style,
  accessibilityLabel,
  accessibilityRole,
}) => {
  return (
    <View
      style={[styles.base, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </View>
  );
};

Card.displayName = 'Card';

export { Card };
export default Card;
