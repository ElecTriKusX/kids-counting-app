/**
 * Seedable pseudo-random number generator and helpers used by every
 * domain generator (arithmetic, compare, compose, parent-lock).
 *
 * Why seedable: property-based tests in `__tests__/` need
 * reproducibility. Given the same `seed`, every helper here MUST
 * produce the same sequence of values — that's what lets fast-check
 * shrink counter-examples cleanly.
 *
 * Implementation note: this module is part of the *pure* domain layer
 * — no React Native, expo, or AsyncStorage imports are allowed here.
 */

/**
 * Minimal RNG contract: a single method returning a uniform float in
 * `[0, 1)`. All helpers in this module accept any object satisfying
 * this interface, so tests can swap in a stub generator if they want
 * to drive a specific sequence of values.
 */
export interface RNG {
  next(): number;
}

/**
 * Creates a deterministic PRNG using the well-known mulberry32
 * algorithm. Compact (one 32-bit state word), fast, and good enough
 * for game generators — we are not running cryptographic operations.
 *
 * The seed is coerced to an unsigned 32-bit integer; `seed = 0` is a
 * valid seed and produces a stable sequence (mulberry32 advances
 * state before mixing, so it is not stuck at zero).
 */
export function createRNG(seed: number): RNG {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/**
 * Uniform integer in the **inclusive** range `[min, max]`.
 *
 * Both bounds are normalized via `Math.ceil` / `Math.floor` so callers
 * can safely pass non-integer bounds. Throws if the range is empty
 * (`min > max`) — that's a programmer error, not a runtime condition
 * we want to silently paper over.
 */
export function randomInt(min: number, max: number, rng: RNG): number {
  if (min > max) {
    throw new Error(`randomInt: min (${min}) > max (${max})`);
  }
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return lo + Math.floor(rng.next() * (hi - lo + 1));
}

/**
 * Picks a single element uniformly at random from a non-empty array.
 *
 * Throws `Error('pickRandomly: empty array')` for empty input — every
 * caller in this codebase passes a non-empty list of options, so an
 * empty array indicates a generator bug worth surfacing immediately.
 */
export function pickRandomly<T>(items: readonly T[], rng: RNG): T {
  if (items.length === 0) {
    throw new Error('pickRandomly: empty array');
  }
  const index = Math.floor(rng.next() * items.length);
  // Safe: `index` is in [0, items.length) and length > 0.
  return items[index] as T;
}

/**
 * Returns a new array containing the elements of `items` in random
 * order. Uses Fisher-Yates (in-place on a copy) so each permutation is
 * equally likely. Input is `readonly` and never mutated.
 */
export function shuffle<T>(items: readonly T[], rng: RNG): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    // Both indices are in-bounds; cast away `T | undefined` from
    // `noUncheckedIndexedAccess`.
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return result;
}

/**
 * Returns `n` independently sampled integers from `[min, max]` —
 * duplicates are allowed and expected. Used by the compose generator
 * to produce filler tiles around the guaranteed valid pair.
 *
 * `n <= 0` short-circuits to an empty array (a no-op sample is a
 * legal, useful base case for callers building tile sets in a loop).
 * Bound validation is delegated to `randomInt`, so an inverted range
 * still throws when `n > 0`.
 */
export function sampleN(min: number, max: number, n: number, rng: RNG): number[] {
  if (n <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(randomInt(min, max, rng));
  }
  return out;
}
