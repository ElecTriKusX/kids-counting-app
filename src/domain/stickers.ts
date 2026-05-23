/**
 * Sticker grouping utilities.
 *
 * Pure domain helpers for the Sticker_Collection screen — no React
 * Native, expo, or storage imports. The `domain/` layer is unit- and
 * property-tested in plain Node.
 *
 * Spec references:
 *  - design.md → "Sticker_Collection"
 *  - requirements.md → Requirement 7.3 (стикеры сгруппированы по
 *    Game_Mode на экране Sticker_Collection)
 */

import type { GameMode, Sticker } from '../types';

/**
 * Partition a flat sticker collection into three per-mode buckets.
 *
 * Guarantees:
 *  - Every input sticker appears in exactly one output bucket — no
 *    drops, no duplicates (Property 10 / Req 7.3).
 *  - All three `GameMode` keys are always present, even when empty,
 *    so callers can index without optional-chaining.
 *  - Insertion order within each bucket matches the input array's
 *    relative order (stable partition), so a UI sorted by `earnedAt`
 *    upstream stays sorted downstream.
 *  - The input array and its elements are never mutated; a fresh
 *    object with fresh arrays is returned.
 *
 * @param stickers Flat list of stickers, typically `progress.stickers`.
 * @returns Record keyed by `GameMode` with stickers in original order.
 */
export function groupByMode(
  stickers: readonly Sticker[],
): Record<GameMode, Sticker[]> {
  const grouped: Record<GameMode, Sticker[]> = {
    arithmetic: [],
    compare: [],
    compose: [],
  };

  for (const sticker of stickers) {
    grouped[sticker.mode].push(sticker);
  }

  return grouped;
}
