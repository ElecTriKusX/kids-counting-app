import fc from 'fast-check';
import { generateParentLockChallenge, isCorrect } from '../../src/domain/parent-lock';
import { createRNG } from '../../src/domain/rng';

describe('Property 11: Parent lock', () => {
  it('operands are in [10, 99]', () => {
    fc.assert(fc.property(fc.integer({ min: 0 }), (seed) => {
      const c = generateParentLockChallenge(createRNG(seed));
      expect(c.a).toBeGreaterThanOrEqual(10);
      expect(c.a).toBeLessThanOrEqual(99);
      expect(c.b).toBeGreaterThanOrEqual(10);
      expect(c.b).toBeLessThanOrEqual(99);
    }));
  });

  it('correctAnswer is non-negative', () => {
    fc.assert(fc.property(fc.integer({ min: 0 }), (seed) => {
      const c = generateParentLockChallenge(createRNG(seed));
      expect(c.correctAnswer).toBeGreaterThanOrEqual(0);
    }));
  });

  it('isCorrect returns true only for exact match', () => {
    fc.assert(fc.property(fc.integer({ min: 0 }), fc.integer(), (seed, input) => {
      const c = generateParentLockChallenge(createRNG(seed));
      const result = isCorrect(c, input);
      expect(result).toBe(input === c.correctAnswer);
    }));
  });
});
