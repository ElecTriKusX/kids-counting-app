/**
 * Ephemeral session store for the active game round.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "State Management (zustand)" / "Session_Store"
 *
 * Unlike `useProgressStore`, this store is intentionally NOT
 * persisted. When the child returns to Home, the round is over —
 * dropping mid-round state is the desired behaviour (kids rarely
 * resume the exact question they left). Long-term progress
 * (stickers, difficulty, stats) lives in `useProgressStore` and is
 * the only thing serialized to AsyncStorage.
 *
 * The store covers state shared across:
 *  - the active mode and current question (Arithmetic / Compare /
 *    Compose),
 *  - the running question index inside a 10-question Round,
 *  - the Compose bin (tiles dropped, running sum, derived status),
 *  - the current Parent_Lock challenge.
 *
 * The Compose bin is stored as the same `ComposeBin` shape consumed
 * by `classifyBin` so the classifier can be applied directly inside
 * `addTileToBin` without an intermediate adapter (Req 4.3-4.5).
 *
 * No React Native / Expo imports here — only `zustand`. That means
 * tests can drive this store from Node without a renderer.
 */

import { create } from 'zustand';

import type {
  GameMode,
  ParentLockChallenge,
  Question,
  Tile,
} from '../types';
import {
  classifyBin,
  type ComposeBin,
} from '../domain/generators/classify-bin';

/**
 * Empty Compose bin used as the initial state and after `clearBin`.
 *
 * Frozen so accidental mutations elsewhere surface immediately.
 * Every mutation in this store creates a NEW `composeBin` object,
 * so freezing this constant does not interfere with normal flow.
 */
const EMPTY_BIN: ComposeBin = Object.freeze({
  tiles: [] as Tile[],
  sum: 0,
  status: 'empty' as const,
}) as ComposeBin;

/**
 * Pure helper used by `addTileToBin` to read the Compose target out
 * of the currently active question. Only `compose` questions carry
 * a target; for any other shape the helper returns `null` so the
 * action can short-circuit safely (no tile gets added to a bin that
 * has no associated puzzle).
 */
function composeTargetOf(question: Question | null): number | null {
  if (question === null) return null;
  return question.kind === 'compose' ? question.target : null;
}

/**
 * Shape of the session store. The interface is deliberately split
 * into "state" and "actions" — selectors in the UI typically pick
 * one or the other, never both.
 */
export interface SessionState {
  mode: GameMode | null;
  currentQuestion: Question | null;
  /** 0..9 within a Round; consumers compare `>= 10` to end the round. */
  questionIndex: number;
  composeBin: ComposeBin;
  parentLockChallenge: ParentLockChallenge | null;
}

export interface SessionActions {
  /**
   * Start a fresh Round in the given mode.
   *
   * Resets question index to 0 and clears any leftover question /
   * Compose bin from a previous round. Does NOT touch
   * `parentLockChallenge` — Parent_Lock lives in its own flow and
   * is cleared explicitly via `setParentLockChallenge(null)`.
   */
  startRound(mode: GameMode): void;

  /** Replace the active question (e.g. after generating a new one). */
  setCurrentQuestion(question: Question): void;

  /**
   * Advance to the next question in the round.
   *
   * Increments `questionIndex` without clamping; the consumer (game
   * hook / screen) is responsible for detecting `questionIndex >= 10`
   * and triggering Session_Feedback + sticker award.
   */
  nextQuestion(): void;

  /**
   * Append a tile to the Compose bin and recompute `sum` + `status`.
   *
   * The new status is derived by calling `classifyBin` against the
   * target stored on the active `compose` question. If the active
   * question is not a compose question (or there is no active
   * question), the call is a no-op — the UI shouldn't be dragging
   * tiles in that situation, but defensiveness here costs nothing
   * and prevents inconsistent bins from leaking into the store.
   */
  addTileToBin(tile: Tile): void;

  /**
   * Reset the Compose bin to `{ tiles: [], sum: 0, status: 'empty' }`.
   *
   * Called after a correct compose answer (before generating the
   * next puzzle) and after an `invalid` overshoot (Req 4.5).
   */
  clearBin(): void;

  /**
   * Set or clear the current Parent_Lock challenge. Pass `null`
   * after a successful unlock or when leaving the Parent_Lock screen
   * so the next entry generates a fresh challenge (Req 8.3).
   */
  setParentLockChallenge(challenge: ParentLockChallenge | null): void;
}

/**
 * Combined store contract — what the `create<>()` call returns.
 */
export type SessionStore = SessionState & SessionActions;

/**
 * Initial state values. Exposed as a function so tests (and any
 * future "reset session" helper) can grab a fresh copy without
 * leaking references to the frozen `EMPTY_BIN`.
 */
function initialState(): SessionState {
  return {
    mode: null,
    currentQuestion: null,
    questionIndex: 0,
    composeBin: EMPTY_BIN,
    parentLockChallenge: null,
  };
}

/**
 * The session store hook.
 *
 * Use it like any zustand hook:
 *   const startRound = useSessionStore((s) => s.startRound);
 *   const idx = useSessionStore((s) => s.questionIndex);
 */
export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState(),

  startRound(mode) {
    set({
      mode,
      currentQuestion: null,
      questionIndex: 0,
      composeBin: EMPTY_BIN,
    });
  },

  setCurrentQuestion(question) {
    set({ currentQuestion: question });
  },

  nextQuestion() {
    set((state) => ({ questionIndex: state.questionIndex + 1 }));
  },

  addTileToBin(tile) {
    set((state) => {
      const target = composeTargetOf(state.currentQuestion);
      if (target === null) {
        // No compose puzzle is active — silently ignore so the bin
        // can never desynchronize from the puzzle that owns it.
        return state;
      }
      const tiles = [...state.composeBin.tiles, tile];
      const sum = tiles.reduce((acc, t) => acc + t.value, 0);
      // `classifyBin` only reads `tiles` and `sum`, so we can pass
      // a freshly-built bin with a placeholder status.
      const status = classifyBin({ tiles, sum, status: 'partial' }, target);
      return { composeBin: { tiles, sum, status } };
    });
  },

  clearBin() {
    set({ composeBin: EMPTY_BIN });
  },

  setParentLockChallenge(challenge) {
    set({ parentLockChallenge: challenge });
  },
}));
