/**
 * `useParentLock` — React hook that drives the Parent_Lock screen.
 *
 * Source of truth:
 *   `.kiro/specs/kids-counting-app/requirements.md` → Requirement 8
 *   `.kiro/specs/kids-counting-app/design.md`        → Hooks → useParentLock
 *
 * Responsibilities:
 *  - Surface the active `ParentLockChallenge` from `useSessionStore`
 *    so the screen can render the prompt (`a op b`).
 *  - On mount, ensure a challenge exists; if the store is empty we
 *    seed one via `generateParentLockChallenge(createRNG(Date.now()))`
 *    so the screen is never rendered without a question.
 *  - Validate parent input via `isCorrect`. On a correct answer the
 *    caller (screen) is responsible for `navigation.replace(...)` —
 *    we only signal `true`. On an incorrect answer we regenerate the
 *    challenge (Req 8.3) so the parent cannot guess past one prompt.
 *
 * The hook itself does not navigate, render UI, or clear input
 * fields — those concerns live in `ParentLockScreen`. Keeping the
 * hook framework-agnostic (no navigation imports) makes it trivial
 * to test with `@testing-library/react-native`.
 */

import { useCallback, useEffect } from 'react';

import { generateParentLockChallenge, isCorrect } from '../../domain/parent-lock';
import { createRNG } from '../../domain/rng';
import { useSessionStore } from '../../state/session-store';
import type { ParentLockChallenge } from '../../types';

export interface UseParentLockResult {
  /** Current challenge or `null` if the mount-time generation hasn't run yet. */
  challenge: ParentLockChallenge | null;
  /**
   * Validate `input` against the active challenge.
   *
   * Returns `true` when the parent has unlocked — caller should
   * navigate to Parent_Section. Returns `false` otherwise; in that
   * case the hook has already regenerated a fresh challenge so the
   * screen just needs to clear the input field.
   *
   * Returns `false` if no challenge is loaded yet (defensive — the
   * screen normally won't render the submit button until `challenge`
   * is non-null, but a fast double-tap shouldn't blow up).
   */
  submit: (input: number) => boolean;
  /** Replace the active challenge with a freshly generated one. */
  regenerate: () => void;
}

export function useParentLock(): UseParentLockResult {
  const challenge = useSessionStore((s) => s.parentLockChallenge);
  const setParentLockChallenge = useSessionStore(
    (s) => s.setParentLockChallenge,
  );

  const regenerate = useCallback((): void => {
    const next = generateParentLockChallenge(createRNG(Date.now()));
    setParentLockChallenge(next);
  }, [setParentLockChallenge]);

  // Seed a challenge the first time the screen mounts, but only if
  // the store is empty — preserves an in-progress challenge across
  // re-mounts (e.g. when React Navigation keeps the screen alive).
  useEffect(() => {
    if (useSessionStore.getState().parentLockChallenge === null) {
      regenerate();
    }
  }, [regenerate]);

  const submit = useCallback(
    (input: number): boolean => {
      // Read fresh state — `challenge` from the selector above might
      // be stale within the same render if `submit` is called twice
      // in quick succession after a regenerate.
      const current = useSessionStore.getState().parentLockChallenge;
      if (current === null) return false;
      if (isCorrect(current, input)) return true;
      regenerate();
      return false;
    },
    [regenerate],
  );

  return { challenge, submit, regenerate };
}
