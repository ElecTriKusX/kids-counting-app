/**
 * Centralized theme for Kids Counting App.
 *
 * Single source of truth for colors, typography, radii, and spacing.
 * All interactive components MUST import values from this module so that
 * the design constraints from Requirement 12 (child-friendly minima) and
 * Requirement 1.5 (large rounded buttons) hold across the app.
 *
 * Constraints enforced here (R12):
 *  - background must be a soft cream (#FFF8F0), never pure white.
 *  - borderRadius for buttons / cards is at least 20 (we use 24).
 *  - minimum touchable hit-area is 64x64.
 *  - numeric font is at least 28pt; label font is at least 18pt.
 *
 * The yellow1/yellow2/yellow3 shades are accent variants used for chrome
 * rotations on home cards and tiles (per the design.pen mock). They are
 * NOT semantic state colors — correct/incorrect remain mint/coral.
 */

export const colors = {
  // Base palette (design.md)
  background: '#FFF8F0',
  primary: '#FFD93D',
  success: '#6BCB77',
  info: '#4D96FF',
  danger: '#FF6B6B',
  text: '#1A1A2E',

  // Semantic aliases for answer feedback
  correct: '#6BCB77',
  incorrect: '#FF6B6B',

  // Yellow accent rotation for home cards / tiles (chrome only — never for
  // correct/incorrect highlights).
  yellow1: '#FFD93D',
  yellow2: '#FFCE4D',
  yellow3: '#FFBA59',

  // Slightly elevated cream and a subtle border tone for cards.
  surface: '#FFFDF9',
  borderSubtle: 'rgba(26,26,46,0.08)',
} as const;

export const typography = {
  numeric: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
  },
  buttonLabel: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.text,
  },

  // Minimum legible sizes for kids 4–6 (R12.3, R12.6). Property tests
  // assert that numeric.fontSize >= minNumericFontSize and
  // buttonLabel.fontSize >= minLabelFontSize.
  minNumericFontSize: 28,
  minLabelFontSize: 18,
} as const;

export const radii = {
  button: 24,
  card: 24,
  pill: 999,
  // Minimum hit-area for any tappable element (R12.4).
  minTouchable: 64,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const theme = {
  colors,
  typography,
  radii,
  spacing,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Radii = typeof radii;
export type Spacing = typeof spacing;

export default theme;
