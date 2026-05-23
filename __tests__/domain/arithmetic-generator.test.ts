import fc from 'fast-check';
import { generateArithmeticQuestion } from '../../src/domain/generators/arithmetic';
import { createRNG } from '../../src/domain/rng';

const rangeArb = fc.integer({ min: 1, max: 20 }).chain(max =>
  fc.constant({ min: 1, max })
);

describe('Property 1+2: Arithmetic question well-formed', () => {
  it('operands are within range', () => {
    fc.assert(fc.property(rangeArb, fc.integer({ min: 0 }), (range, seed) => {
      const q = generateArithmeticQuestion(range, createRNG(seed));
      expect(q.a).toBeGreaterThanOrEqual(range.min);
      expect(q.a).toBeLessThanOrEqual(range.max);
      expect(q.b).toBeGreaterThanOrEqual(range.min);
      expect(q.b).toBeLessThanOrEqual(range.max);
    }));
  });

  it('correctAnswer is non-negative', () => {
    fc.assert(fc.property(rangeArb, fc.integer({ min: 0 }), (range, seed) => {
      const q = generateArithmeticQuestion(range, createRNG(seed));
      expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
    }));
  });

  it('correctAnswer matches op(a, b)', () => {
    fc.assert(fc.property(rangeArb, fc.integer({ min: 0 }), (range, seed) => {
      const q = generateArithmeticQuestion(range, createRNG(seed));
      const expected = q.op === 'add' ? q.a + q.b : q.a - q.b;
      expect(q.correctAnswer).toBe(expected);
    }));
  });

  it('options has 3 or 4 elements, contains correctAnswer, all non-negative and distinct', () => {
    fc.assert(fc.property(rangeArb, fc.integer({ min: 0 }), (range, seed) => {
      const q = generateArithmeticQuestion(range, createRNG(seed));
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.length).toBeLessThanOrEqual(4);
      expect(q.options).toContain(q.correctAnswer);
      q.options.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
      const unique = new Set(q.options);
      expect(unique.size).toBe(q.options.length);
    }));
  });
});
