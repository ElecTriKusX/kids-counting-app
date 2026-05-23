/**
 * Compose_Mode puzzle generator (pure, deterministic).
 *
 * The Compose puzzle asks the child to drag two tiles into a bin so
 * their values sum to `target`. This generator GUARANTEES at least
 * one valid pair `(a, b)` with `a + b === target` exists in the
 * returned `tiles` — Req 4.7 / Property 6.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "Compose Mode generator"
 *
 * Lives under `src/domain/` and therefore must stay free of any React
 * Native / Expo imports — it is consumed by `useComposeGame` and
 * exercised by property tests in Node. No hidden state: same `(range,
 * rng-sequence, id)` always yields identical output, which keeps
 * fast-check shrinking deterministic.
 */

import type { ComposeQuestion, Tile } from '../../types';
import { type RNG, randomInt, sampleN, shuffle } from '../rng';

/**
 * Number of filler tiles added on top of the guaranteed valid pair.
 * Total tile count is therefore `2 + FILLER_COUNT === 6` — design.md
 * specifies "4–6 плиток" and we use the upper bound so the child has
 * a richer set to scan.
 */
const FILLER_COUNT = 4;

/**
 * Build a Compose_Mode puzzle for the given difficulty range.
 *
 * Algorithm (matches design.md "Compose Mode generator"):
 *  1. `target ∈ [2, range.max]`. Lower bound 2 ensures at least one
 *     valid pair `(1, 1)` is representable inside `[1, range.max]`.
 *  2. Pick `a ∈ [1, min(target - 1, range.max)]`; let `b = target - a`.
 *     Since `target ≤ range.max`, `target - 1 ≤ range.max - 1`, so the
 *     clamp degenerates to `target - 1` and `b ∈ [1, target - 1]` is
 *     also inside `[1, range.max]` — no retry loop needed.
 *  3. 4 filler values via `sampleN(1, range.max, …)`. Duplicates and
 *     incidental extra valid pairs are fine; Property 6 only requires
 *     AT LEAST one valid pair, which `(a, b)` already provides.
 *  4. Shuffle `[a, b, ...filler]` so the valid pair is not pinned to
 *     indices 0/1 in the rendered tile row, then map to `Tile[]`.
 *
 * The optional `id` lets tests pin a deterministic puzzle id; when
 * omitted we fall back to `` `compose-${target}` `` (deterministic, no
 * `Date.now()`) to keep the function pure.
 */
export function generateComposePuzzle(
  range: { min: number; max: number },
  rng: RNG,
  id?: string,
): ComposeQuestion {
  const target = randomInt(2, range.max, rng);

  const a = randomInt(1, Math.min(target - 1, range.max), rng);
  const b = target - a;

  const filler = sampleN(1, range.max, FILLER_COUNT, rng);

  const puzzleId = id ?? `compose-${target}`;
  const values = shuffle([a, b, ...filler], rng);
  const tiles: Tile[] = values.map((value, i) => ({
    id: `${puzzleId}-tile-${i}`,
    value,
  }));

  return {
    kind: 'compose',
    id: puzzleId,
    target,
    tiles,
  };
}
