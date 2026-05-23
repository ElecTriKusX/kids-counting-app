/**
 * Compare_Mode question generator (pure, deterministic).
 *
 * Picks the next correct label (`greater` / `less` / `equal`) using a
 * frequency-balanced rule over the last ≤9 correct answers, then
 * draws `left` and `right` numbers from `range` consistent with that
 * label. The balancing is what makes Property 5 hold: in any window
 * of the last ≤9 questions each label appears roughly 3 times when
 * the caller feeds back recent correct labels.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "Compare Mode generator"
 *
 * Lives under `src/domain/` and therefore must stay free of any
 * React Native / Expo imports — it is exercised by property tests in
 * Node (Property 5, Req 3.4-3.6).
 */

import type { CompareLabel, CompareQuestion, CompareSubMode } from '../../types';
import { pickRandomly, randomInt, type RNG } from '../rng';

/**
 * All three labels in fixed iteration order. Kept module-private so
 * the frequency tally below has a stable, exhaustive key set.
 */
const ALL_LABELS: readonly CompareLabel[] = ['greater', 'less', 'equal'];

/**
 * Generate the next Compare_Mode question.
 *
 * Algorithm (matches design.md "Compare Mode generator"):
 *   1. Tally how often each label appears in `recentLabels` (the
 *      caller passes up to the last 9 *correct* labels).
 *   2. Find the minimum count; the tied labels are the candidates
 *      with the most "room" to be picked next.
 *   3. Pick one tied label uniformly via `pickRandomly` → `target`.
 *   4. Sample `left` / `right` so their relation matches `target`.
 *   5. If the range is degenerate (single value, so no inequality is
 *      representable), fall back to `equal` — the only label that
 *      can actually be realized.
 *
 * The function is pure: same `range` + same `recentLabels` + same
 * `rng` state produces the same `CompareQuestion`. That determinism
 * is what lets property tests (Property 5) shrink counter-examples.
 *
 * @param range          Inclusive numeric range for `left` / `right`.
 * @param recentLabels   Up to last 9 correct labels for balancing.
 * @param rng            Seedable RNG (see `domain/rng.ts`).
 * @param subMode        Visual sub-mode (`objects` | `digits`).
 *                       Defaults to `digits` so callers using only
 *                       digit screens don't have to pass it.
 * @param id             Optional explicit id. When omitted, a stable
 *                       id is derived from `left`/`right`/`target`
 *                       so identical questions get identical ids.
 */
export function generateCompareQuestion(
  range: { min: number; max: number },
  recentLabels: CompareLabel[],
  rng: RNG,
  subMode: CompareSubMode = 'digits',
  id?: string,
): CompareQuestion {
  // Step 1: tally label frequencies. Initialised to zero for every
  // label so a label missing from `recentLabels` correctly registers
  // as "least seen" and wins balancing on the next pick.
  const counts: Record<CompareLabel, number> = { greater: 0, less: 0, equal: 0 };
  for (const label of recentLabels) {
    counts[label] += 1;
  }

  // Step 2: collect labels tied for the minimum count.
  const minCount = Math.min(counts.greater, counts.less, counts.equal);
  const candidates = ALL_LABELS.filter((label) => counts[label] === minCount);

  // Step 3: pick the target label among the tied candidates.
  let target: CompareLabel = pickRandomly(candidates, rng);

  // Step 5 (applied here to short-circuit step 4 cleanly): a
  // degenerate range can only realise `equal`. We override *after*
  // the balancing pick because the caller's range — not the recent
  // history — dictates feasibility. This loses one step of balance
  // in degenerate ranges, which is acceptable: the only honest
  // question we can ask is `equal` regardless.
  if (range.min >= range.max) {
    target = 'equal';
  }

  // Step 4: draw `left` and `right` consistent with `target`. Each
  // branch keeps both numbers inside `[range.min, range.max]` and
  // satisfies the relation by construction — no rejection sampling.
  let left: number;
  let right: number;
  if (target === 'equal') {
    left = randomInt(range.min, range.max, rng);
    right = left;
  } else if (target === 'greater') {
    // `left` must exceed `range.min` to leave room for a strictly
    // smaller `right`; then `right ∈ [min, left - 1]`.
    left = randomInt(range.min + 1, range.max, rng);
    right = randomInt(range.min, left - 1, rng);
  } else {
    // Mirror of `greater`: pick `right` first, then a smaller `left`.
    right = randomInt(range.min + 1, range.max, rng);
    left = randomInt(range.min, right - 1, rng);
  }

  return {
    kind: 'compare',
    id: id ?? `cmp-${left}-${right}-${target}`,
    subMode,
    left,
    right,
    correct: target,
  };
}
