/**
 * ButtonLabel
 *
 * Typography component for the captions on `PressableButton`s and other
 * interactive controls (mode tiles on Home, the `>`/`<`/`=` answer keys in
 * Compare, the "Готово" submit on Parent_Lock, etc.). It applies
 * `theme.typography.buttonLabel` and enforces the child-friendly minimum
 * font size from Requirement 12.6 (`>= 18pt`).
 *
 * Like `NumericText`, the component clamps any caller-provided font size
 * upward to `theme.typography.minLabelFontSize` so Property 16 holds even
 * when consumers attempt to pass a smaller value via the `fontSize` prop or
 * an embedded `style.fontSize`.
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import theme from '@/theme';

export interface ButtonLabelProps {
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
    fontSize: theme.typography.buttonLabel.fontSize,
    fontWeight: theme.typography.buttonLabel.fontWeight,
    color: theme.typography.buttonLabel.color,
  },
});

const ButtonLabel: React.FC<ButtonLabelProps> = ({
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
    fontSize ?? flatStyle.fontSize ?? theme.typography.buttonLabel.fontSize;

  // Clamp upward so smaller overrides cannot violate Property 16.
  const finalFontSize = Math.max(
    requested,
    theme.typography.minLabelFontSize,
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

ButtonLabel.displayName = 'ButtonLabel';

export { ButtonLabel };
export default ButtonLabel;
