/**
 * Difficulty_Engine — pure adaptive difficulty controller.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 * → "Difficulty Engine — детали алгоритма" and "Difficulty_Engine state".
 *
 * Behavior (Req 2.4–2.7):
 *  - Maintains a sliding window of the last ≤10 `AnswerOutcome` values per mode.
 *  - On each new answer:
 *      1. Append `next` and clip the window to the last 10 entries.
 *      2. While `window.length < 10`, the level never changes.
 *      3. Once the window has exactly 10 entries, compute `accuracy = correct / 10`.
 *         - `accuracy > 0.8` and `level < 4` → bump level by +1, reset window to `[]`.
 *         - `accuracy < 0.5` and `level > 1` → drop level by −1, reset window to `[]`.
 *         - Otherwise → keep level, keep the (already-clipped) last-10 window.
 *
 * Thresholds are strict (`> 0.8`, `< 0.5`) by design — phrasing in Req 2.6/2.7
 * says "превышает 80" / "опускается ниже 50", not `≥`/`≤`.
 *
 * The function is pure: it never mutates `input.window` or `input` itself; the
 * returned `window` is always a fresh array.
 *
 * No React Native / Expo imports allowed in this file (consumed by Node-side
 * property tests).
 */

import type { AnswerOutcome, DifficultyLevel } from '../types';

/**
 * Mapping from `DifficultyLevel` index to the inclusive maximum of the
 * numeric range. `min` is always 1 (see `rangeFor`).
 *
 * Frozen so callers can't mutate the shared table.
 */
export const LEVELS: ReadonlyArray<{ level: DifficultyLevel; max: number }> = [
  { level: 1, max: 5 },
  { level: 2, max: 10 },
  { level: 3, max: 15 },
  { level: 4, max: 20 },
];

/**
 * Input snapshot for `evaluate`: the current level and the rolling
 * window of recent outcomes (length 0..10).
 */
export interface EngineInput {
  level: DifficultyLevel;
  window: AnswerOutcome[];
}

/**
 * Result of `evaluate`: the (possibly updated) level, the new window
 * after the latest answer was applied, and a `changed` flag indicating
 * whether the level moved this step.
 */
export interface EngineOutput {
  level: DifficultyLevel;
  window: AnswerOutcome[];
  changed: boolean;
}

/**
 * Map a `DifficultyLevel` to its inclusive numeric range `{ min, max }`.
 *
 * The lookup is total over the `DifficultyLevel` literal union, so the
 * non-null assertion is safe — a level outside `1..4` cannot be passed
 * without a type error at the call site.
 */
export function rangeFor(level: DifficultyLevel): { min: number; max: number } {
  const found = LEVELS.find((l) => l.level === level);
  // Total over the `DifficultyLevel` union; assertion is for `noUncheckedIndexedAccess`.
  return { min: 1, max: found!.max };
}

/**
 * Apply one new `AnswerOutcome` to the current engine state and return
 * the next state. Pure — does not mutate `input.window` or `input`.
 *
 * See file header for the full algorithm.
 */
export function evaluate(input: EngineInput, next: AnswerOutcome): EngineOutput {
  // Spread copy + slice → fresh array; `input.window` is never mutated.
  const window = [...input.window, next].slice(-10);

  if (window.length < 10) {
    return { level: input.level, window, changed: false };
  }

  const correct = window.filter((o) => o === 'correct').length;
  const accuracy = correct / window.length;

  if (accuracy > 0.8 && input.level < 4) {
    return {
      level: (input.level + 1) as DifficultyLevel,
      window: [],
      changed: true,
    };
  }

  if (accuracy < 0.5 && input.level > 1) {
    return {
      level: (input.level - 1) as DifficultyLevel,
      window: [],
      changed: true,
    };
  }

  // Boundary cases (level=4 with high accuracy, level=1 with low accuracy)
  // and the middle band [0.5, 0.8] all keep the level steady. The window
  // remains the freshly-clipped last 10 — see design.md "Difficulty_Engine state".
  return { level: input.level, window, changed: false };
}
