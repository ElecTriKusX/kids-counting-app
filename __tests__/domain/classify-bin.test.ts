import fc from 'fast-check';
import { classifyBin } from '../../src/domain/generators/classify-bin';

const tileArb = fc.record({ id: fc.string(), value: fc.integer({ min: 1, max: 20 }) });

describe('Property 7: Compose bin classification', () => {
  it('empty tiles → empty', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 20 }), (target) => {
      expect(classifyBin({ tiles: [], sum: 0, status: 'empty' }, target)).toBe('empty');
    }));
  });

  it('sum === target and tiles non-empty → correct', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 20 }),
      fc.array(tileArb, { minLength: 1, maxLength: 3 }),
      (target, tiles) => {
        expect(classifyBin({ tiles, sum: target, status: 'partial' }, target)).toBe('correct');
      }
    ));
  });

  it('sum > target → invalid', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 19 }),
      fc.array(tileArb, { minLength: 1, maxLength: 3 }),
      (target, tiles) => {
        expect(classifyBin({ tiles, sum: target + 1, status: 'partial' }, target)).toBe('invalid');
      }
    ));
  });

  it('0 < sum < target → partial', () => {
    fc.assert(fc.property(
      fc.integer({ min: 2, max: 20 }),
      fc.array(tileArb, { minLength: 1, maxLength: 3 }),
      (target, tiles) => {
        const sum = Math.max(1, target - 1);
        expect(classifyBin({ tiles, sum, status: 'partial' }, target)).toBe('partial');
      }
    ));
  });
});
