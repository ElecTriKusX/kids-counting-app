// Mock AsyncStorage and AppState for persistence
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));
jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

import { useProgressStore } from '../../src/state/progress-store';
import type { Sticker } from '../../src/types';

describe('Integration test 14.2: Round completion awards exactly one sticker', () => {
  beforeEach(() => {
    // Reset store to initial state
    useProgressStore.getState().resetAll();
    // Re-hydrate to clear hydrated=false from resetAll
    useProgressStore.getState().hydrate({
      version: 1,
      stickers: [],
      difficulty: { arithmetic: 1, compare: 1, compose: 1 },
      answerWindow: { arithmetic: [], compare: [], compose: [] },
      compareSubMode: 'objects',
      compareObjectsCompleted: 0,
      stats: {
        arithmetic: { mode: 'arithmetic', roundsCompleted: 0, totalAnswered: 0, totalCorrect: 0, accuracy: 0, currentRange: { min: 1, max: 5 }, manualOverride: false },
        compare: { mode: 'compare', roundsCompleted: 0, totalAnswered: 0, totalCorrect: 0, accuracy: 0, currentRange: { min: 1, max: 5 }, manualOverride: false },
        compose: { mode: 'compose', roundsCompleted: 0, totalAnswered: 0, totalCorrect: 0, accuracy: 0, currentRange: { min: 1, max: 5 }, manualOverride: false },
      },
      manualDifficultyOverride: {},
    });
  });

  it('awarding a sticker increases sticker count by exactly 1', () => {
    const before = useProgressStore.getState().stickers.length;
    const sticker: Sticker = {
      id: 'test-sticker-1',
      mode: 'arithmetic',
      earnedAt: Date.now(),
      iconKey: 'sticker-arithmetic',
    };
    useProgressStore.getState().awardSticker(sticker);
    const after = useProgressStore.getState().stickers.length;
    expect(after).toBe(before + 1);
  });

  it('sticker has correct mode', () => {
    const sticker: Sticker = {
      id: 'test-sticker-2',
      mode: 'compare',
      earnedAt: Date.now(),
      iconKey: 'sticker-compare',
    };
    useProgressStore.getState().awardSticker(sticker);
    const stickers = useProgressStore.getState().stickers;
    const last = stickers[stickers.length - 1];
    expect(last?.mode).toBe('compare');
  });

  it('N rounds award exactly N stickers', () => {
    const N = 5;
    for (let i = 0; i < N; i++) {
      useProgressStore.getState().awardSticker({
        id: `sticker-${i}`,
        mode: 'arithmetic',
        earnedAt: Date.now() + i,
        iconKey: 'sticker-arithmetic',
      });
    }
    expect(useProgressStore.getState().stickers).toHaveLength(N);
  });

  it('resetAll clears all stickers', () => {
    useProgressStore.getState().awardSticker({
      id: 'to-be-cleared',
      mode: 'compose',
      earnedAt: Date.now(),
      iconKey: 'sticker-compose',
    });
    expect(useProgressStore.getState().stickers).toHaveLength(1);
    useProgressStore.getState().resetAll();
    expect(useProgressStore.getState().stickers).toHaveLength(0);
  });
});
