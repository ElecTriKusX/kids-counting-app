/**
 * Parent_Lock challenge generator and validator (pure, deterministic).
 *
 * Parent_Lock gates the Parent_Section behind an arithmetic problem
 * intentionally outside a 4–6 year old's reach: two-digit operands
 * (10..99) combined with multiplication or subtraction (Req 8.1).
 *
 * Source of truth:
 *   `.kiro/specs/kids-counting-app/requirements.md` → Requirement 8
 *   `.kiro/specs/kids-counting-app/design.md`        → Domain → parent-lock
 *
 * Lives under `src/domain/` and therefore must stay free of any
 * React Native / Expo imports — exercised by property tests in Node.
 */

import type { ParentLockChallenge } from '../types';
import { type RNG, randomInt, pickRandomly } from './rng';

/** Inclusive lower bound for both operands (Req 8.1). */
const MIN_OPERAND = 10;
/** Inclusive upper bound for both operands (Req 8.1). */
const MAX_OPERAND = 99;

/** Operations Parent_Lock is allowed to use. */
const OPERATIONS = ['mul', 'sub'] as const;

/**
 * Generate a fresh Parent_Lock challenge.
 *
 * - Operands `a`, `b` are uniformly sampled from `[10, 99]`.
 * - `op` is chosen uniformly from `{ 'mul', 'sub' }`.
 * - For `sub` the operands are ordered so that `a >= b`. This keeps
 *   `correctAnswer` non-negative (Req 8.1) — the parent's input UI is
 *   a non-negative numeric field, so a negative expected answer would
 *   make the lock unsolvable.
 *
 * Pure and deterministic given the supplied `rng`: identical seeds
 * yield identical challenges, which is what makes the Property 11
 * test reproducible.
 */
export function generateParentLockChallenge(rng: RNG): ParentLockChallenge {
  const op = pickRandomly(OPERATIONS, rng);
  let a = randomInt(MIN_OPERAND, MAX_OPERAND, rng);
  let b = randomInt(MIN_OPERAND, MAX_OPERAND, rng);

  if (op === 'sub' && a < b) {
    // Swap so subtraction stays non-negative. Both operands remain
    // in [10, 99], so the operand-range invariant is preserved.
    const tmp = a;
    a = b;
    b = tmp;
  }

  const correctAnswer = op === 'mul' ? a * b : a - b;

  return { a, b, op, correctAnswer };
}

/**
 * Validate a Parent_User's input against the active challenge.
 *
 * Strict equality on `correctAnswer` — no tolerance, no coercion.
 * The screen layer is responsible for parsing user input into a
 * `number` (and rejecting empty / non-numeric submissions before
 * calling this function).
 */
export function isCorrect(challenge: ParentLockChallenge, input: number): boolean {
  return input === challenge.correctAnswer;
}
