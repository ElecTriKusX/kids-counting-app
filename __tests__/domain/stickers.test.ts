import fc from 'fast-check';
import { groupByMode } from '../../src/domain/stickers';
import type { GameMode, Sticker } from '../../src/types';

const modeArb = fc.constantFrom<GameMode>('arithmetic', 'compare', 'compose');
const stickerArb = fc.record<Sticker>({
  id: fc.string(),
  mode: modeArb,
  earnedAt: fc.integer({ min: 0 }),
  iconKey: fc.string(),
});

describe('Property 10: Sticker grouping preserves all stickers', () => {
  it('all stickers appear in exactly one group', () => {
    fc.assert(fc.property(fc.array(stickerArb), (stickers) => {
      const grouped = groupByMode(stickers);
      const all = [...grouped.arithmetic, ...grouped.compare, ...grouped.compose];
      expect(all).toHaveLength(stickers.length);
    }));
  });

  it('each sticker is in the correct mode group', () => {
    fc.assert(fc.property(fc.array(stickerArb), (stickers) => {
      const grouped = groupByMode(stickers);
      (['arithmetic', 'compare', 'compose'] as GameMode[]).forEach(mode => {
        grouped[mode].forEach(s => expect(s.mode).toBe(mode));
      });
    }));
  });

  it('all three mode keys always present', () => {
    fc.assert(fc.property(fc.array(stickerArb), (stickers) => {
      const grouped = groupByMode(stickers);
      expect(grouped).toHaveProperty('arithmetic');
      expect(grouped).toHaveProperty('compare');
      expect(grouped).toHaveProperty('compose');
    }));
  });
});
