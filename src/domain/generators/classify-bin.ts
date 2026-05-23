/**
 * Compose_Mode bin classifier (pure, deterministic).
 *
 * The Compose puzzle asks the child to drag two tiles into a bin so
 * their values sum to `target`. UI state derives entirely from this
 * classifier — no other place inspects `tiles`/`sum` to decide what
 * to render.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "Состояние корзины" / "Классификатор (чистая функция)"
 *
 * Lives under `src/domain/` and therefore must stay free of any
 * React Native / Expo imports — it is consumed by `useComposeGame`
 * and exercised by property tests in Node (Property 7, Req 4.3-4.5).
 */

import type { Tile } from '../../types';

/**
 * Visual / behavioural state of the Compose bin.
 *
 * - `empty`   — no tiles dropped yet (Req 4.3 baseline).
 * - `partial` — at least one tile dropped, sum strictly below target.
 * - `correct` — sum equals target with at least one tile (Req 4.4).
 * - `invalid` — sum exceeds target; bin will be cleared and tiles
 *               returned to their origin (Req 4.5).
 */
export type BinStatus = 'empty' | 'partial' | 'correct' | 'invalid';

/**
 * Compose_Mode bin state. The same shape is stored in
 * `useSessionStore.composeBin` (see design.md → state/session-store).
 *
 * Invariant maintained by callers (and verified by Property 7):
 *   `sum === tiles.reduce((s, t) => s + t.value, 0)`
 *
 * `classifyBin` itself does NOT recompute `sum` from `tiles` — it
 * trusts the caller's invariant. This keeps the function O(1) and
 * lets the property test exercise the relationship directly.
 */
export interface ComposeBin {
  tiles: Tile[];
  sum: number;
  status: BinStatus;
}

/**
 * Classify a Compose bin against the puzzle's target sum.
 *
 * Order of checks matters: an empty bin is `empty` regardless of
 * `sum` (which should be 0 by invariant, but we never depend on
 * that). After that, equality wins over the over/under split.
 *
 * Pure and deterministic — same inputs always yield the same
 * output, with no I/O, no `Math.random`, no `Date.now`.
 */
export function classifyBin(bin: ComposeBin, target: number): BinStatus {
  if (bin.tiles.length === 0) return 'empty';
  if (bin.sum === target) return 'correct';
  if (bin.sum > target) return 'invalid';
  return 'partial';
}
