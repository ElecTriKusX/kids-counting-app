/**
 * Arithmetic_Mode question generator (pure, deterministic).
 *
 * Produces an addition or subtraction question whose operands lie in
 * the supplied inclusive range, picks 3 or 4 multiple-choice options
 * (correct + 2 or 3 distractors), and shuffles them so the correct
 * value is not always in the same slot.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "Arithmetic Mode generator" / "Distractor Generator"
 * Requirements: Req 2.1 (operands & op), 2.2 (3 or 4 options),
 *   2.8 (no negative results).
 *
 * Lives under `src/domain/` and therefore must stay free of any
 * React Native / Expo imports — it is exercised by property tests in
 * Node.
 */

import type { ArithmeticQuestion } from '../../types';
import { pickRandomly, randomInt, type RNG, shuffle } from '../rng';
import { generateDistractors } from './distractor';

/**
 * Generate the next Arithmetic_Mode question.
 *
 * Algorithm (matches design.md "Arithmetic Mode generator"):
 *   1. Pick `op` uniformly from `['add', 'sub']`.
 *   2. Draw `a` and `b` independently from `[range.min, range.max]`.
 *   3. For subtraction, swap so `a >= b` — this guarantees a
 *      non-negative result without rejection sampling (Req 2.8).
 *   4. Compute `correctAnswer` from the (possibly swapped) operands.
 *   5. Pick `optionCount ∈ {3, 4}` uniformly, derive
 *      `distractorCount = optionCount - 1` (typed as `2 | 3` for
 *      `generateDistractors`).
 *   6. Build distractors and shuffle the full option list.
 *
 * The function is pure: same `range` + same `rng` state always
 * yields the same `ArithmeticQuestion`. That determinism is what
 * lets property tests shrink counter-examples cleanly.
 *
 * @param range  Inclusive numeric range for `a` and `b`.
 * @param rng    Seedable RNG (see `domain/rng.ts`).
 * @param id     Optional explicit id. When omitted, a stable id is
 *               derived from operands and operator so identical
 *               questions get identical ids.
 */
export function generateArithmeticQuestion(
  range: { min: number; max: number },
  rng: RNG,
  id?: string,
): ArithmeticQuestion {
  // Step 1: choose operator uniformly.
  const op = pickRandomly(['add', 'sub'] as const, rng);

  // Step 2: draw both operands from the inclusive range.
  let a = randomInt(range.min, range.max, rng);
  let b = randomInt(range.min, range.max, rng);

  // Step 3 (Req 2.8): for subtraction swap so the result is never
  // negative. Addition needs no adjustment.
  if (op === 'sub' && a < b) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  // Step 4: compute the correct answer from the final operands.
  const correctAnswer = op === 'add' ? a + b : a - b;

  // Step 5 (Req 2.2): 3 or 4 total options → 2 or 3 distractors.
  // Cast is safe: `optionCount - 1` is exactly `2 | 3`.
  const optionCount = pickRandomly([3, 4] as const, rng);
  const distractorCount = (optionCount - 1) as 2 | 3;

  // Step 6: build distractors, then shuffle so the correct answer
  // isn't always at index 0.
  const distractors = generateDistractors(correctAnswer, distractorCount, rng);
  const options = shuffle([correctAnswer, ...distractors], rng);

  return {
    kind: 'arithmetic',
    id: id ?? `arith-${a}${op === 'add' ? '+' : '-'}${b}`,
    a,
    b,
    op,
    correctAnswer,
    options,
  };
}
