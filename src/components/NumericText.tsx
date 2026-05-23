/**
 * NumericText
 *
 * Typography component for displaying the large numbers used in game prompts
 * (e.g. `5 + 3 = ?`, big "7" tiles, parent-lock challenge digits). It is a
 * thin wrapper around React Native's `<Text>` that applies
 * `theme.typography.numeric` and enforces the child-friendly minimum font
 * size from Requirement 12.6 (`>= 28pt`).
 *
 * The component is intentionally permissive about overrides — callers may
 * pass a custom `fontSize` prop or a `style` containing `fontSize` — but the
 * final size is always clamped to `theme.typography.minNumericFontSize` so
 * that Property 16 ("Themed UI components honor child-friendly minima")
 * holds regardless of how the component is composed.
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import theme from '@/theme';

export interface NumericTextProps {
  /** Content to render inside the underlying `<Text>`. */
  children?: React.ReactNode;
  /** Optional explicit font size override; clamped to the minimum. */
  fontSize?: number;
  /** Caller-provided style; merged on top of the themed defaults. */
  style?: StyleProp<TextStyle>;
  /** Forwarded to `<Text>` for layout truncation control. */
  numberOfLines?: number;
  /** Forwarded to `<Text>` for screen-reader announcements. */
  accessibilityLabel?: string;
}

const styles = StyleSheet.create({
  base: {
    fontSize: theme.typography.numeric.fontSize,
    fontWeight: theme.typography.numeric.fontWeight,
    color: theme.typography.numeric.color,
  },
});

const NumericText: React.FC<NumericTextProps> = ({
  children,
  fontSize,
  style,
  numberOfLines,
  accessibilityLabel,
}) => {
  // Resolve the requested font size, giving the explicit `fontSize` prop the
  // highest precedence, then anything embedded in `style`, then the theme.
  const flatStyle = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const requested =
    fontSize ?? flatStyle.fontSize ?? theme.typography.numeric.fontSize;

  // Clamp upward so smaller overrides cannot violate Property 16.
  const finalFontSize = Math.max(
    requested,
    theme.typography.minNumericFontSize,
  );

  return (
    <Text
      style={[styles.base, style, { fontSize: finalFontSize }]}
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Text>
  );
};

NumericText.displayName = 'NumericText';

export { NumericText };
export default NumericText;
