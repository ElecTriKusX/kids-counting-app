import { theme } from '../../src/theme';

describe('Property 16: Theme enforces child-friendly minima', () => {
  it('borderRadius for buttons >= 20', () => {
    expect(theme.radii.button).toBeGreaterThanOrEqual(20);
  });

  it('borderRadius for cards >= 20', () => {
    expect(theme.radii.card).toBeGreaterThanOrEqual(20);
  });

  it('minTouchable >= 64', () => {
    expect(theme.radii.minTouchable).toBeGreaterThanOrEqual(64);
  });

  it('numeric fontSize >= 28', () => {
    expect(theme.typography.numeric.fontSize).toBeGreaterThanOrEqual(28);
    expect(theme.typography.minNumericFontSize).toBeGreaterThanOrEqual(28);
  });

  it('buttonLabel fontSize >= 18', () => {
    expect(theme.typography.buttonLabel.fontSize).toBeGreaterThanOrEqual(18);
    expect(theme.typography.minLabelFontSize).toBeGreaterThanOrEqual(18);
  });

  it('background is not pure white', () => {
    expect(theme.colors.background.toLowerCase()).not.toBe('#ffffff');
    expect(theme.colors.background.toLowerCase()).not.toBe('#fff');
  });

  it('correct color is mint green', () => {
    expect(theme.colors.correct.toLowerCase()).toBe('#6bcb77');
  });

  it('incorrect color is coral', () => {
    expect(theme.colors.incorrect.toLowerCase()).toBe('#ff6b6b');
  });
});
