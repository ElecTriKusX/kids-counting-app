/**
 * `useArithmeticGame` — view-model hook for Arithmetic_Mode.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "Hooks (features)" / "Screen designs / Arithmetic"
 *   → requirements 2.1–2.8, 6.1–6.5, 7.1, 7.2
 *
 * Coordinates the three layers Arithmetic_Mode needs:
 *   - **Domain** — `generateArithmeticQuestion` and `rangeFor` for the
 *     active Difficulty_Range.
 *   - **Progress_Store** — reads `effectiveLevel('arithmetic')`, writes
 *     Difficulty_Engine input via `recordAnswer`, awards sticker via
 *     `awardSticker`.
 *   - **Session_Store** — the active question and round index.
 *
 * Round semantics (Req 7.1):
 *   A round is exactly 10 questions (`questionIndex` 0..9). The hook
 *   tracks `roundScore` (correct answers) locally so the screen can
 *   decide between Session_Feedback (sticker) and Session_Failure.
 *   Only when the child reaches **≥ 5** correct answers do we call
 *   `awardSticker`; below that threshold the round still ends but no
 *   sticker is added.
 *
 * Feedback delay:
 *   After each answer we expose `feedbackKind` for ~500ms (incorrect)
 *   or ~1500ms (correct, so the confetti has time to play) before
 *   advancing the round index and generating the next question. The
 *   timer is cleared on unmount and on every fresh `startNewRound` call
 *   so a stale timeout can never advance a round that the screen has
 *   already left.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { rangeFor } from '../../domain/difficulty-engine';
import { generateArithmeticQuestion } from '../../domain/generators/arithmetic';
import { createRNG } from '../../domain/rng';
import { effectiveLevel, useProgressStore } from '../../state/progress-store';
import { useSessionStore } from '../../state/session-store';
import type { ArithmeticQuestion, Sticker } from '../../types';

/** A round is exactly 10 questions (Req 7.1). */
const ROUND_LENGTH = 10;

/**
 * Minimum correct answers required to earn a sticker. Below this the
 * round ends without awarding — the screen surfaces a Session_Failure
 * state instead.
 */
const PASSING_SCORE = 5;

/**
 * Feedback display duration before advancing to the next question.
 *
 * The "correct" delay is intentionally longer so the `ConfettiOverlay`
 * (1–1.5s, Req 6.1) can run to completion before we swap the question.
 */
const FEEDBACK_DELAY_INCORRECT_MS = 500;
const FEEDBACK_DELAY_CORRECT_MS = 1500;

/**
 * Public contract of the hook.
 */
export interface UseArithmeticGameResult {
  /** Active question, or `null` before `startNewRound` has been called. */
  question: ArithmeticQuestion | null;
  /** Index inside the current round (0..9). */
  questionIndex: number;
  /** `true` after the 10th answer's feedback delay completes. */
  isRoundComplete: boolean;
  /** Number of correct answers in the current round (0..10). */
  roundScore: number;
  /** Last numeric answer the child tapped, cleared between questions. */
  selectedAnswer: number | null;
  /** Drives Answer_Feedback overlays in the screen. */
  feedbackKind: 'idle' | 'correct' | 'incorrect';
  /** Submit the child's answer; ignored mid-feedback or post-round. */
  answer(value: number): void;
  /** Reset round state and generate the first question. */
  startNewRound(): void;
}

export function useArithmeticGame(): UseArithmeticGameResult {
  const currentQuestion = useSessionStore((s) => s.currentQuestion);
  const questionIndex = useSessionStore((s) => s.questionIndex);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedbackKind, setFeedbackKind] = useState<
    'idle' | 'correct' | 'incorrect'
  >('idle');
  const [isRoundComplete, setIsRoundComplete] = useState(false);
  const [roundScore, setRoundScore] = useState(0);

  // Refs hold round-scoped state that does NOT need to trigger a
  // re-render on its own.
  const correctCountRef = useRef(0);
  const seedCounterRef = useRef(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Narrow `Question | null` down to `ArithmeticQuestion` so the screen
  // never has to guard on `kind`. Any non-arithmetic value is treated as
  // "no active question" — same UX as `null`.
  const question: ArithmeticQuestion | null =
    currentQuestion !== null && currentQuestion.kind === 'arithmetic'
      ? currentQuestion
      : null;

  /**
   * Generate the next arithmetic question and write it into the session
   * store. Reads the latest level via `useProgressStore.getState()` so
   * it always reflects a freshly advanced level without a stale closure.
   */
  const regenerateQuestion = useCallback(() => {
    seedCounterRef.current += 1;
    const progress = useProgressStore.getState();
    const lvl = effectiveLevel(progress, 'arithmetic');
    const range = rangeFor(lvl);
    const rng = createRNG(Date.now() + seedCounterRef.current);
    const q = generateArithmeticQuestion(range, rng);
    useSessionStore.getState().setCurrentQuestion(q);
  }, []);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  // Cancel any pending feedback advance when the consumer unmounts so a
  // navigation-away mid-round can never fire a stale `nextQuestion()`.
  useEffect(() => {
    return clearFeedbackTimer;
  }, [clearFeedbackTimer]);

  const startNewRound = useCallback(() => {
    clearFeedbackTimer();
    useSessionStore.getState().startRound('arithmetic');
    correctCountRef.current = 0;
    setRoundScore(0);
    setSelectedAnswer(null);
    setFeedbackKind('idle');
    setIsRoundComplete(false);
    regenerateQuestion();
  }, [clearFeedbackTimer, regenerateQuestion]);

  const answer = useCallback(
    (value: number) => {
      // Defensive guards: ignore taps while no question is loaded,
      // during the feedback window, or after the round has wrapped.
      if (question === null) return;
      if (feedbackKind !== 'idle') return;
      if (isRoundComplete) return;

      const isCorrect = value === question.correctAnswer;
      const outcome: 'correct' | 'incorrect' = isCorrect
        ? 'correct'
        : 'incorrect';

      setSelectedAnswer(value);
      setFeedbackKind(outcome);

      // Drive Difficulty_Engine + lifetime stats.
      useProgressStore.getState().recordAnswer('arithmetic', outcome);

      if (isCorrect) {
        correctCountRef.current += 1;
        setRoundScore(correctCountRef.current);
      }

      const delay = isCorrect
        ? FEEDBACK_DELAY_CORRECT_MS
        : FEEDBACK_DELAY_INCORRECT_MS;

      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null;

        // Read the latest session state so two answers fired in quick
        // succession can't both think they're closing the round on the
        // same index.
        const session = useSessionStore.getState();
        const willCompleteRound =
          session.questionIndex + 1 >= ROUND_LENGTH;

        if (willCompleteRound) {
          // Award only on a passing score; otherwise the screen shows a
          // Session_Failure state instead of Session_Feedback.
          if (correctCountRef.current >= PASSING_SCORE) {
            const now = Date.now();
            const sticker: Sticker = {
              id: `arith-${now}`,
              mode: 'arithmetic',
              earnedAt: now,
              iconKey: 'sticker-arithmetic',
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
    roundScore,
    selectedAnswer,
    feedbackKind,
    answer,
    startNewRound,
  };
}
