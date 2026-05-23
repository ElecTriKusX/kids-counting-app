/**
 * Arithmetic_Mode distractor generator (pure, deterministic given an RNG).
 *
 * For an Arithmetic_Mode question with correct answer `correct`, this
 * module produces `count` wrong-answer options ("distractors") that
 * are plausible enough to challenge the child but never absurd.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "Distractor Generator (Arithmetic_Mode)"
 *
 * Algorithm (Req 2.3):
 *   1. Seed pool with offsets ±1 and ±2 from `correct`.
 *   2. Drop negatives and the `correct` value itself, dedupe.
 *   3. If the pool already has at least `count` candidates,
 *      shuffle and slice — done.
 *   4. Otherwise extend with `+3, +4, …` (never going negative,
 *      never reusing `correct` or an existing candidate) until we
 *      have enough, then shuffle and slice.
 *
 * Invariants on the returned array (Property 2 fragment):
 *   - length === count
 *   - every value is a non-negative integer
 *   - all values are pairwise distinct
 *   - none of the values equals `correct`
 *
 * Lives under `src/domain/` and therefore must stay free of any
 * React Native / Expo imports — it is consumed by the arithmetic
 * generator and exercised by property tests in Node.
 */

import { type RNG, shuffle } from '../rng';

/**
 * Generate `count` distractor values for an Arithmetic_Mode option set.
 *
 * The function is pure: same `correct`, same `count`, same RNG state
 * always produces the same output, with no I/O and no mutation of
 * inputs.
 *
 * `count` is constrained to `2 | 3` because Arithmetic_Mode shows 3
 * or 4 options total (Req 2.2) — i.e. `correct` plus 2 or 3
 * distractors.
 */
export function generateDistractors(
  correct: number,
  count: 2 | 3,
  rng: RNG,
): number[] {
  // Step 1+2: seed pool with ±1/±2, drop negatives and `correct`,
  // dedupe via Set so e.g. `correct=1` doesn't yield `[-1, 0, 2, 3]`
  // with a stray dup if someone tweaked the offsets later.
  const seeded = [correct - 2, correct - 1, correct + 1, correct + 2].filter(
    (v) => v >= 0 && v !== correct,
  );
  const unique = Array.from(new Set(seeded));

  if (unique.length >= count) {
    return shuffle(unique, rng).slice(0, count);
  }

  // Step 4: pool too small (only happens for tiny `correct`, e.g.
  // `correct=0` gives `[1, 2]` but we need 3 distractors). Extend
  // upward via `+3, +4, …` — going further negative is forbidden by
  // Req 2.3, and we already have everything `>=correct-2` except
  // `correct` itself.
  const candidates = unique.slice();
  let delta = 3;
  while (candidates.length < count) {
    const next = correct + delta;
    if (next !== correct && !candidates.includes(next)) {
      candidates.push(next);
    }
    delta += 1;
  }

  return shuffle(candidates, rng).slice(0, count);
}
