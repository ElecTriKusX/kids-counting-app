/**
 * Persistent progress store.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "State Management (zustand)" / "Progress_Store"
 *   → "Difficulty_Engine state"
 *
 * Owns everything the app must remember between launches:
 *  - the sticker collection (Req 7.1, 7.4),
 *  - per-mode difficulty level + sliding answer window (Req 2.4–2.7),
 *  - Compare_Mode sub-mode counter (Req 3.3),
 *  - aggregated Parent_Section stats (Req 8.4),
 *  - the Parent_User's manual difficulty override (Req 8.5–8.6),
 *  - a `hydrated` flag so `BootstrapGate` can gate the UI (Req 9.3).
 *
 * The store is intentionally thin: it delegates the difficulty
 * decision to the pure `evaluate` function from
 * `domain/difficulty-engine`. That keeps the adaptive-difficulty rules
 * in one place and lets us property-test them in Node without a
 * renderer.
 *
 * No React Native / expo / AsyncStorage imports here — only `zustand`.
 * Persistence is wired up separately in `state/persistence.ts` via
 * `useProgressStore.subscribe`, which keeps this file pure and
 * unit-testable.
 */

import { create } from 'zustand';

import type {
  AnswerOutcome,
  CompareSubMode,
  DifficultyLevel,
  GameMode,
  ParentStats,
  PersistedSnapshot,
  Sticker,
} from '../types';
import { evaluate, rangeFor } from '../domain/difficulty-engine';

/**
 * Per-mode persistent state. Mirrors the design.md `ProgressState`
 * shape verbatim — every field here is also serialized into
 * `PersistedSnapshot` (with `hydrated` excluded).
 */
export interface ProgressState {
  stickers: Sticker[];
  difficulty: Record<GameMode, DifficultyLevel>;
  answerWindow: Record<GameMode, AnswerOutcome[]>;
  compareSubMode: CompareSubMode;
  /** 0..5 — counter for `objects` → `digits` switch (Req 3.3). */
  compareObjectsCompleted: number;
  stats: Record<GameMode, ParentStats>;
  manualDifficultyOverride: Partial<Record<GameMode, DifficultyLevel>>;
  /** `false` until `hydrate()` runs. `BootstrapGate` checks this. */
  hydrated: boolean;
}

/**
 * All store mutations. Split from `ProgressState` so selectors can
 * pick "just data" or "just actions" without dragging the other in.
 */
export interface ProgressActions {
  /**
   * Record one answer outcome for `mode` and let `evaluate` decide
   * whether to bump or drop the level. Updates the lifetime stats
   * (totalAnswered/totalCorrect/accuracy/currentRange) at the same
   * time so Parent_Section reflects the change immediately.
   */
  recordAnswer(mode: GameMode, outcome: AnswerOutcome): void;

  /**
   * Append a sticker to the collection AND increment that mode's
   * `roundsCompleted` counter. Rounds are tracked here (not in
   * `recordAnswer`) because a Round only "counts" when the child
   * actually finishes 10 questions and gets the sticker (Req 7.1).
   */
  awardSticker(sticker: Sticker): void;

  /**
   * Pin a difficulty level for `mode`. The override takes effect
   * immediately — `difficulty[mode]` is updated alongside the
   * override, so the next generated question uses the new range
   * without waiting for a fresh round (Req 8.5–8.6).
   */
  setManualDifficulty(mode: GameMode, level: DifficultyLevel): void;

  /**
   * Reset every persisted field to its starting value. Keeps
   * `hydrated: true` so the UI stays mounted after the user confirms
   * the reset in Parent_Section (Req 8.7).
   */
  resetAll(): void;

  /**
   * Replace persisted fields from a loaded snapshot and flip
   * `hydrated` to `true`. Called once by `BootstrapGate` after
   * `loadSnapshot()` resolves (Req 9.3, 9.4).
   */
  hydrate(snapshot: PersistedSnapshot): void;

  /**
   * Increment `compareObjectsCompleted`. When it reaches 5 and the
   * sub-mode is still `objects`, flip to `digits` (Req 3.3). The
   * counter is intentionally NOT reset — design.md says "когда
   * достигает 5", and a monotonic counter makes the transition a
   * pure function of state.
   */
  advanceCompareSubMode(): void;
}

/**
 * Combined store contract — what the `create<>()` call returns.
 */
export type ProgressStore = ProgressState & ProgressActions;

/**
 * Effective level selector: a Parent_User override wins over the
 * engine-managed level. Exported as a free function so tests can call
 * it on raw state without spinning up the hook.
 */
export const effectiveLevel = (
  state: ProgressState,
  mode: GameMode,
): DifficultyLevel => state.manualDifficultyOverride[mode] ?? state.difficulty[mode];

/**
 * Build a fresh `ParentStats` for one mode. `currentRange` is derived
 * from `level` so it's always consistent with `difficulty[mode]`
 * (Req 8.4).
 */
function makeStats(mode: GameMode, level: DifficultyLevel): ParentStats {
  return {
    mode,
    roundsCompleted: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    accuracy: 0,
    currentRange: rangeFor(level),
    manualOverride: false,
  };
}

/**
 * Default per-mode difficulty: every mode starts at level 1 → 1..5
 * (Req 2.4).
 */
function defaultDifficulty(): Record<GameMode, DifficultyLevel> {
  return { arithmetic: 1, compare: 1, compose: 1 };
}

/**
 * Default empty answer windows per mode.
 */
function defaultAnswerWindow(): Record<GameMode, AnswerOutcome[]> {
  return { arithmetic: [], compare: [], compose: [] };
}

/**
 * Default per-mode stats — all zero, ranges anchored to level 1.
 */
function defaultStats(): Record<GameMode, ParentStats> {
  return {
    arithmetic: makeStats('arithmetic', 1),
    compare: makeStats('compare', 1),
    compose: makeStats('compose', 1),
  };
}

/**
 * Initial in-memory state used at module load and by `resetAll`.
 *
 * `hydrated` defaults to `false`. `resetAll` overwrites everything
 * else but flips `hydrated` back to `true` — see the action body.
 */
function initialState(): ProgressState {
  return {
    stickers: [],
    difficulty: defaultDifficulty(),
    answerWindow: defaultAnswerWindow(),
    compareSubMode: 'objects',
    compareObjectsCompleted: 0,
    stats: defaultStats(),
    manualDifficultyOverride: {},
    hydrated: false,
  };
}

/**
 * The progress store hook.
 *
 * Use it like any zustand hook:
 *   const stickers = useProgressStore((s) => s.stickers);
 *   const recordAnswer = useProgressStore((s) => s.recordAnswer);
 */
export const useProgressStore = create<ProgressStore>((set) => ({
  ...initialState(),

  recordAnswer(mode, outcome) {
    set((state) => {
      // Delegate the "should the level move?" decision to the pure
      // engine. It returns the new (possibly unchanged) level plus
      // the next sliding window — both fields are always fresh
      // arrays/values, so we can drop them in without copying.
      const result = evaluate(
        { level: state.difficulty[mode], window: state.answerWindow[mode] },
        outcome,
      );

      const prevStats = state.stats[mode];
      const totalAnswered = prevStats.totalAnswered + 1;
      const totalCorrect = prevStats.totalCorrect + (outcome === 'correct' ? 1 : 0);
      const nextStats: ParentStats = {
        ...prevStats,
        totalAnswered,
        totalCorrect,
        // Lifetime accuracy. Safe to divide because we just incremented
        // `totalAnswered` to at least 1.
        accuracy: totalCorrect / totalAnswered,
        // Range tracks the (possibly bumped/dropped) level so the
        // Parent_Section card updates the moment the engine moves.
        currentRange: rangeFor(result.level),
      };

      return {
        difficulty: { ...state.difficulty, [mode]: result.level },
        answerWindow: { ...state.answerWindow, [mode]: result.window },
        stats: { ...state.stats, [mode]: nextStats },
      };
    });
  },

  awardSticker(sticker) {
    set((state) => {
      const prevStats = state.stats[sticker.mode];
      return {
        stickers: [...state.stickers, sticker],
        stats: {
          ...state.stats,
          [sticker.mode]: {
            ...prevStats,
            roundsCompleted: prevStats.roundsCompleted + 1,
          },
        },
      };
    });
  },

  setManualDifficulty(mode, level) {
    set((state) => {
      const prevStats = state.stats[mode];
      return {
        // Override drives `effectiveLevel`; the underlying engine
        // level is also synced so a future `recordAnswer` evaluates
        // against the pinned level, not the stale one (Req 8.6).
        manualDifficultyOverride: {
          ...state.manualDifficultyOverride,
          [mode]: level,
        },
        difficulty: { ...state.difficulty, [mode]: level },
        stats: {
          ...state.stats,
          [mode]: {
            ...prevStats,
            manualOverride: true,
            currentRange: rangeFor(level),
          },
        },
      };
    });
  },

  resetAll() {
    // Take a fresh blank state, then keep `hydrated: true` so the UI
    // doesn't flash back to the splash screen after a reset action.
    set({
      ...initialState(),
      hydrated: true,
    });
  },

  hydrate(snapshot) {
    set({
      stickers: snapshot.stickers,
      difficulty: snapshot.difficulty,
      answerWindow: snapshot.answerWindow,
      compareSubMode: snapshot.compareSubMode,
      compareObjectsCompleted: snapshot.compareObjectsCompleted,
      stats: snapshot.stats,
      manualDifficultyOverride: snapshot.manualDifficultyOverride,
      hydrated: true,
    });
  },

  advanceCompareSubMode() {
    set((state) => {
      const next = state.compareObjectsCompleted + 1;
      // Only auto-flip from `objects` → `digits`, and only at the
      // exact threshold. Re-entering `objects` mode (e.g. after a
      // future feature) won't trigger a second switch because the
      // counter keeps growing — this is intentional per design.md.
      const compareSubMode: CompareSubMode =
        next >= 5 && state.compareSubMode === 'objects' ? 'digits' : state.compareSubMode;
      return {
        compareObjectsCompleted: next,
        compareSubMode,
      };
    });
  },
}));
