import fc from 'fast-check';
import { evaluate, rangeFor, LEVELS } from '../../src/domain/difficulty-engine';
import type { AnswerOutcome, DifficultyLevel } from '../../src/types';

const outcomeArb = fc.constantFrom<AnswerOutcome>('correct', 'incorrect');
const levelArb = fc.constantFrom<DifficultyLevel>(1, 2, 3, 4);
const windowArb = fc.array(outcomeArb, { maxLength: 10 });

describe('Property 3: Difficulty engine transitions are bounded and threshold-driven', () => {
  it('window never exceeds 10 elements', () => {
    fc.assert(fc.property(levelArb, windowArb, outcomeArb, (level, window, next) => {
      const result = evaluate({ level, window }, next);
      expect(result.window.length).toBeLessThanOrEqual(10);
    }));
  });

  it('level stays within 1..4', () => {
    fc.assert(fc.property(levelArb, windowArb, outcomeArb, (level, window, next) => {
      const result = evaluate({ level, window }, next);
      expect(result.level).toBeGreaterThanOrEqual(1);
      expect(result.level).toBeLessThanOrEqual(4);
    }));
  });

  it('level increases by exactly 1 when accuracy > 0.8 and level < 4 and window has 10 entries', () => {
    fc.assert(fc.property(
      fc.constantFrom<DifficultyLevel>(1, 2, 3),
      fc.array(fc.constant<AnswerOutcome>('correct'), { minLength: 9, maxLength: 9 }),
      (level, nineCorrect) => {
        // 9 correct + 1 correct = 10 correct = 100% accuracy > 0.8
        const result = evaluate({ level, window: nineCorrect }, 'correct');
        expect(result.level).toBe(level + 1);
        expect(result.changed).toBe(true);
        expect(result.window).toHaveLength(0);
      }
    ));
  });

  it('level decreases by exactly 1 when accuracy < 0.5 and level > 1 and window has 10 entries', () => {
    fc.assert(fc.property(
      fc.constantFrom<DifficultyLevel>(2, 3, 4),
      fc.array(fc.constant<AnswerOutcome>('incorrect'), { minLength: 9, maxLength: 9 }),
      (level, nineIncorrect) => {
        // 9 incorrect + 1 incorrect = 10 incorrect = 0% accuracy < 0.5
        const result = evaluate({ level, window: nineIncorrect }, 'incorrect');
        expect(result.level).toBe(level - 1);
        expect(result.changed).toBe(true);
        expect(result.window).toHaveLength(0);
      }
    ));
  });

  it('level unchanged when window < 10', () => {
    fc.assert(fc.property(levelArb, fc.array(outcomeArb, { maxLength: 8 }), outcomeArb, (level, window, next) => {
      const result = evaluate({ level, window }, next);
      expect(result.level).toBe(level);
      expect(result.changed).toBe(false);
    }));
  });

  it('rangeFor returns correct ranges', () => {
    expect(rangeFor(1)).toEqual({ min: 1, max: 5 });
    expect(rangeFor(2)).toEqual({ min: 1, max: 10 });
    expect(rangeFor(3)).toEqual({ min: 1, max: 15 });
    expect(rangeFor(4)).toEqual({ min: 1, max: 20 });
  });
});
