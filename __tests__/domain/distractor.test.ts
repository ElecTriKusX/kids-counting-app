import fc from 'fast-check';
import { generateDistractors } from '../../src/domain/generators/distractor';
import { createRNG } from '../../src/domain/rng';

describe('Property 2: Distractor generator invariants', () => {
  it('all values are non-negative', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 20 }),
      fc.constantFrom(2 as const, 3 as const),
      fc.integer({ min: 0 }),
      (correct, count, seed) => {
        const result = generateDistractors(correct, count, createRNG(seed));
        result.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
      }
    ));
  });

  it('all values are pairwise distinct and differ from correct', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 20 }),
      fc.constantFrom(2 as const, 3 as const),
      fc.integer({ min: 0 }),
      (correct, count, seed) => {
        const result = generateDistractors(correct, count, createRNG(seed));
        const unique = new Set(result);
        expect(unique.size).toBe(result.length);
        result.forEach(v => expect(v).not.toBe(correct));
      }
    ));
  });

  it('returns exactly count elements', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 20 }),
      fc.constantFrom(2 as const, 3 as const),
      fc.integer({ min: 0 }),
      (correct, count, seed) => {
        const result = generateDistractors(correct, count, createRNG(seed));
        expect(result).toHaveLength(count);
      }
    ));
  });
});
