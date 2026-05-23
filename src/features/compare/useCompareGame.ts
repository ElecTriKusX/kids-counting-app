/**
 * `useCompareGame` — view-model hook for Compare_Mode.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "Hooks (features)" / "Screen designs / Compare"
 *   → requirements 3.1–3.6, 6.1–6.5, 7.1, 7.2
 *
 * Coordinates the three layers Compare_Mode needs:
 *   - **Domain** — `generateCompareQuestion` (balanced label
 *     distribution) and `rangeFor` for the active Difficulty_Range.
 *   - **Progress_Store** — reads `effectiveLevel('compare')` and
 *     `compareSubMode`, writes Difficulty_Engine input via
 *     `recordAnswer` and the sub-mode counter via
 *     `advanceCompareSubMode` (objects → digits at 5).
 *   - **Session_Store** — the active question and round index.
 *
 * Round semantics (Req 7.1):
 *   A round is exactly 10 questions (`questionIndex` 0..9). The hook
 *   tracks `correctCount` locally so the screen can decide between
 *   Session_Feedback (sticker) and Session_Failure. Only when the
 *   child reaches **≥ 5** correct answers in the round do we call
 *   `awardSticker`; below that threshold the round still ends but
 *   no sticker is added.
 *
 * Feedback delay:
 *   After each answer we expose `feedbackKind` for ~500ms (incorrect)
 *   or ~1500ms (correct, so the confetti has time to play) before
 *   advancing the round index and generating the next question. The
 *   timer is cleared on unmount and on every fresh `startNewRound` /
 *   `startNewQuestion` call so a stale timeout can never advance a
 *   round that the screen has already left.
 *
 * Recent-labels balancing (Req 3.6):
 *   The compare generator wants the **last ≤9 correct labels** so
 *   it can keep `greater` / `less` / `equal` near uniform. We push
 *   the question's *correct* label (not the child's selected label)
 *   so distribution balancing is independent of accuracy.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { rangeFor } from '../../domain/difficulty-engine';
import { generateCompareQuestion } from '../../domain/generators/compare';
import { createRNG } from '../../domain/rng';
import { effectiveLevel, useProgressStore } from '../../state/progress-store';
import { useSessionStore } from '../../state/session-store';
import type { CompareLabel, CompareQuestion, Sticker } from '../../types';

/** A round is exactly 10 questions (Req 7.1). */
const ROUND_LENGTH = 10;

/**
 * Minimum correct answers required to earn a sticker. Below this
 * the round ends without awarding — the screen is responsible for
 * surfacing a Session_Failure state.
 */
const PASSING_SCORE = 5;

/**
 * Feedback display duration before advancing to the next question.
 *
 * The "correct" delay is intentionally longer so the
 * `ConfettiOverlay` (1–1.5s, Req 6.1) can run to completion before
 * we swap the question underneath it.
 */
const FEEDBACK_DELAY_INCORRECT_MS = 500;
const FEEDBACK_DELAY_CORRECT_MS = 1500;

/**
 * Public contract of the hook. Mirrors the interface defined in
 * tasks.md → 11.2 verbatim.
 */
export interface UseCompareGameResult {
  /** Active question, or `null` before `startNewRound` has been called. */
  question: CompareQuestion | null;
  /** Index inside the current round (0..9). */
  questionIndex: number;
  /** `true` after the 10th answer's feedback delay completes. */
  isRoundComplete: boolean;
  /** История outcomes для ProgressDots. */
  history: ReadonlyArray<'correct' | 'incorrect'>;
  /** Last label the child tapped, cleared between questions. */
  selectedAnswer: CompareLabel | null;
  /** Drives Answer_Feedback overlays in the screen. */
  feedbackKind: 'idle' | 'correct' | 'incorrect';
  /** Submit the child's answer; ignored mid-feedback or post-round. */
  answer(label: CompareLabel): void;
  /** Reset round state and generate the first question. */
  startNewRound(): void;
  /** Replace the current question with a freshly generated one. */
  startNewQuestion(): void;
}

export function useCompareGame(): UseCompareGameResult {
  // Reactive session reads — re-render the screen when the store
  // moves. We read the question via a narrowing selector below so
  // mid-round writes from other modes (none today, but cheap to
  // future-proof) can never leak through.
  const currentQuestion = useSessionStore((s) => s.currentQuestion);
  const questionIndex = useSessionStore((s) => s.questionIndex);

  const [selectedAnswer, setSelectedAnswer] = useState<CompareLabel | null>(
    null,
  );
  const [feedbackKind, setFeedbackKind] = useState<
    'idle' | 'correct' | 'incorrect'
  >('idle');
  const [isRoundComplete, setIsRoundComplete] = useState(false);
  const [history, setHistory] = useState<ReadonlyArray<'correct' | 'incorrect'>>(
    [],
  );

  // Refs hold round-scoped state that does NOT need to trigger a
  // re-render on its own. Generators read them on demand, and the
  // sticker-award branch reads `correctCountRef` once at end-of-round.
  const recentLabelsRef = useRef<CompareLabel[]>([]);
  const correctCountRef = useRef(0);
  const seedCounterRef = useRef(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Narrow `Question | null` down to a `CompareQuestion` so the
  // screen never has to guard on `kind`. Any non-compare value is
  // treated as "no active question" — same UX as `null`.
  const question: CompareQuestion | null =
    currentQuestion !== null && currentQuestion.kind === 'compare'
      ? currentQuestion
      : null;

  /**
   * Generate the next compare question and write it into the
   * session store. Reads the latest level/sub-mode via
   * `useProgressStore.getState()` so it always reflects a freshly
   * advanced sub-mode (objects → digits) without a stale closure.
   */
  const regenerateQuestion = useCallback(() => {
    seedCounterRef.current += 1;
    const progress = useProgressStore.getState();
    const lvl = effectiveLevel(progress, 'compare');
    const range = rangeFor(lvl);
    const subMode = progress.compareSubMode;
    const rng = createRNG(Date.now() + seedCounterRef.current);
    const q = generateCompareQuestion(range, recentLabelsRef.current, rng, subMode);
    useSessionStore.getState().setCurrentQuestion(q);
  }, []);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  // Always cancel a pending feedback advance when the consumer
  // unmounts — otherwise a navigation-away mid-round could fire a
  // stale `nextQuestion()` against an unrelated screen.
  useEffect(() => {
    return clearFeedbackTimer;
  }, [clearFeedbackTimer]);

  const startNewRound = useCallback(() => {
    clearFeedbackTimer();
    useSessionStore.getState().startRound('compare');
    recentLabelsRef.current = [];
    correctCountRef.current = 0;
    setHistory([]);
    setSelectedAnswer(null);
    setFeedbackKind('idle');
    setIsRoundComplete(false);
    regenerateQuestion();
  }, [clearFeedbackTimer, regenerateQuestion]);

  const startNewQuestion = useCallback(() => {
    clearFeedbackTimer();
    setSelectedAnswer(null);
    setFeedbackKind('idle');
    regenerateQuestion();
  }, [clearFeedbackTimer, regenerateQuestion]);

  const answer = useCallback(
    (label: CompareLabel) => {
      // Defensive guards: ignore taps while no question is loaded,
      // during the feedback window, or after the round has wrapped.
      if (question === null) return;
      if (feedbackKind !== 'idle') return;
      if (isRoundComplete) return;

      const correctLabel = question.correct;
      const isCorrect = label === correctLabel;
      const outcome: 'correct' | 'incorrect' = isCorrect ? 'correct' : 'incorrect';

      setSelectedAnswer(label);
      setFeedbackKind(outcome);

      // Drive Difficulty_Engine + lifetime stats.
      useProgressStore.getState().recordAnswer('compare', outcome);

      // История для ProgressDots
      setHistory((h) => [...h, outcome]);

      // Always feed the *correct* label into the balancing window —
      // generator distribution must not depend on whether the child
      // got the answer right. Trim to ≤9 per design.md.
      recentLabelsRef.current = [...recentLabelsRef.current, correctLabel].slice(-9);

      if (isCorrect) {
        correctCountRef.current += 1;
        // The store auto-flips `compareSubMode` from 'objects' →
        // 'digits' once the internal counter reaches 5 (Req 3.3).
        // Only call it while still in 'objects' so we don't keep
        // ticking the counter forever once we've moved to digits.
        if (useProgressStore.getState().compareSubMode === 'objects') {
          useProgressStore.getState().advanceCompareSubMode();
        }
      }

      const delay = isCorrect ? FEEDBACK_DELAY_CORRECT_MS : FEEDBACK_DELAY_INCORRECT_MS;
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null;

        // Read the latest session state so two answers fired in
        // quick succession can't both think they're closing the
        // round on the same index.
        const session = useSessionStore.getState();
        const willCompleteRound = session.questionIndex + 1 >= ROUND_LENGTH;

        if (willCompleteRound) {
          // Award only on a passing score; otherwise the screen
          // shows a Session_Failure state instead of Session_Feedback.
          if (correctCountRef.current >= PASSING_SCORE) {
            const now = Date.now();
            const sticker: Sticker = {
              id: `cmp-${now}`,
              mode: 'compare',
              earnedAt: now,
              iconKey: 'sticker-compare',
            };
            useProgressStore.getState().awardSticker(sticker);
          }
          session.nextQuestion();
          setIsRoundComplete(true);
          setSelectedAnswer(null);
          setFeedbackKind('idle');
        } else {
          session.nextQuestion();
          setSelectedAnswer(null);
          setFeedbackKind('idle');
          regenerateQuestion();
        }
      }, delay);
    },
    [question, feedbackKind, isRoundComplete, regenerateQuestion],
  );

  return {
    question,
    questionIndex,
    isRoundComplete,
    history,
    selectedAnswer,
    feedbackKind,
    answer,
    startNewRound,
    startNewQuestion,
  };
}
