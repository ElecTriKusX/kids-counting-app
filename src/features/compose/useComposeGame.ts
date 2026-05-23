/**
 * `useComposeGame` — координирующий хук для Compose_Mode.
 *
 * Источник правды:
 *   - `.kiro/specs/kids-counting-app/design.md` → "Compose Mode generator",
 *     "Drag-and-drop", "Состояние корзины", "Hooks (features)".
 *   - `tasks.md` → 11.3.
 *
 * Хук связывает три вещи:
 *  1. Чистый генератор `generateComposePuzzle` из `domain/generators/compose`.
 *  2. Эфемерное состояние сессии (`useSessionStore`) — текущий вопрос,
 *     корзина, индекс вопроса в раунде, переход к следующему вопросу.
 *  3. Долгоживущий прогресс (`useProgressStore`) — `recordAnswer`,
 *     `awardSticker`, эффективный уровень сложности для compose.
 *
 * Жесты и подъём плиток инкапсулированы в отдельном хуке
 * `useTileGesture` — отсюда мы только наблюдаем за `composeBin.status` и
 * реагируем на терминальные значения `correct` / `invalid`.
 *
 * Жизненный цикл раунда:
 *  - На монтировании хук стартует новый раунд: `startRound('compose')`,
 *    `setCurrentQuestion(...)`, `clearBin()`. Дальше watcher следит за
 *    статусом корзины.
 *  - `correct` → `recordAnswer('compose', 'correct')`, через 500мс
 *    инкрементируем `questionIndex` через `nextQuestion()` и либо
 *    генерируем следующий вопрос (`startNewQuestion()`), либо, если
 *    набралось 10 ответов, выдаём стикер и переводим раунд в
 *    `isRoundComplete = true`.
 *  - `invalid` → `recordAnswer('compose', 'incorrect')`, после 500мс
 *    очищаем корзину (`clearBin()`); плитки визуально вернутся на
 *    исходные позиции через spring-анимацию `useTileGesture` (там же
 *    обнуляются translateX/translateY).
 *
 * 500мс задержка задана дизайном Answer_Feedback — это окно, когда
 * подсветка/конфетти проигрывается до перехода к следующему вопросу.
 *
 * Все обращения к store-методам читаются через `getState()` внутри
 * колбэков, чтобы выявление коэффициентов сложности и индекс вопроса
 * не "застревали" в замыкании setTimeout. Это также делает `answer`
 * стабильным callback'ом, что важно для эффекта-наблюдателя ниже.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  effectiveLevel,
  useProgressStore,
} from '../../state/progress-store';
import { useSessionStore } from '../../state/session-store';
import { rangeFor } from '../../domain/difficulty-engine';
import { generateComposePuzzle } from '../../domain/generators/compose';
import { createRNG } from '../../domain/rng';
import type { ComposeQuestion } from '../../types';
import type { ComposeBin } from '../../domain/generators/classify-bin';

/**
 * Шейп возврата хука. См. `tasks.md` 11.3 — все поля задаются явно
 * в спецификации задачи.
 */
export interface UseComposeGameResult {
  question: ComposeQuestion | null;
  bin: ComposeBin;
  /** Сколько вопросов уже завершено в текущем раунде, 0..10. */
  questionIndex: number;
  /** Количество правильных ответов в текущем раунде (0..10). */
  roundScore: number;
  /** История outcomes для ProgressDots. */
  history: ReadonlyArray<'correct' | 'incorrect'>;
  /** Императивный API для редких случаев, когда экран хочет сам триггернуть исход. */
  answer(outcome: 'correct' | 'invalid'): void;
  /** Перезапустить раунд (например, после показа RewardOverlay). */
  startNewRound(): void;
  /** Сгенерировать новый вопрос внутри текущего раунда. */
  startNewQuestion(): void;
  isRoundComplete: boolean;
}

/**
 * Задержка между корректным/некорректным завершением задания и переходом
 * к следующему — даёт время отыграть Answer_Feedback (конфетти/шейк).
 */
const FEEDBACK_DELAY_MS = 500;

/** Сколько вопросов в одном Compose-раунде. */
const ROUND_LENGTH = 10;

/** Минимум правильных ответов для получения стикера. */
const PASSING_SCORE = 5;

export function useComposeGame(): UseComposeGameResult {
  // ── progress store: запись ответа, выдача стикера, актуальный уровень.
  // `effectiveLevel(state, 'compose')` уважает manual override из Parent_Section.
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const awardSticker = useProgressStore((s) => s.awardSticker);
  const level = useProgressStore((s) => effectiveLevel(s, 'compose'));

  // ── session store: эфемерное состояние раунда.
  const currentQuestion = useSessionStore((s) => s.currentQuestion);
  const bin = useSessionStore((s) => s.composeBin);
  const questionIndex = useSessionStore((s) => s.questionIndex);
  const setCurrentQuestion = useSessionStore((s) => s.setCurrentQuestion);
  const clearBin = useSessionStore((s) => s.clearBin);
  const nextQuestion = useSessionStore((s) => s.nextQuestion);
  const startRound = useSessionStore((s) => s.startRound);

  const [isRoundComplete, setIsRoundComplete] = useState(false);
  const [roundScore, setRoundScore] = useState(0);
  const [history, setHistory] = useState<ReadonlyArray<'correct' | 'incorrect'>>(
    [],
  );

  // Локальный счётчик правильных ответов в раунде — нужен для решения
  // «выдавать стикер vs показать failure» при достижении 10 вопросов.
  const correctCountRef = useRef(0);

  // Дискриминированное сужение: экран compose должен видеть только
  // ComposeQuestion. Если в сессии лежит вопрос другого режима (например,
  // на короткий миг после переключения экрана) — отдаём `null` и
  // компонент рендерит «загрузка / пусто».
  const question: ComposeQuestion | null =
    currentQuestion && currentQuestion.kind === 'compose'
      ? currentQuestion
      : null;

  /**
   * Создать новую compose-задачу и поставить её активной.
   *
   * Очищаем корзину перед заменой вопроса, чтобы старые плитки в bin
   * не «пересчитались» против нового target и не дали ложный
   * `invalid`/`correct` на одном кадре.
   */
  const startNewQuestion = useCallback(() => {
    const range = rangeFor(level);
    const puzzle = generateComposePuzzle(range, createRNG(Date.now()));
    clearBin();
    setCurrentQuestion(puzzle);
  }, [level, clearBin, setCurrentQuestion]);

  /**
   * Полный сброс раунда: индекс ←0, корзина очищена, новая первая
   * задача. Используется как при первом монтировании, так и после
   * `RewardOverlay`, когда родительский экран хочет начать заново.
   */
  const startNewRound = useCallback(() => {
    setIsRoundComplete(false);
    setRoundScore(0);
    setHistory([]);
    correctCountRef.current = 0;
    startRound('compose');
    startNewQuestion();
  }, [startRound, startNewQuestion]);

  // Старт раунда при монтировании. Зависимости намеренно опущены —
  // повторные запуски делает только явный вызов `startNewRound()`.
  useEffect(() => {
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Обработка одного исхода. Чистая функция в смысле API, но с
   * сайд-эффектами в сторах — это и есть назначение хука.
   *
   * Индекс вопроса читаем напрямую из `getState()` непосредственно перед
   * `nextQuestion()`, чтобы избежать гонок: даже если callback задержался
   * в `setTimeout`, мы получим актуальное значение.
   */
  const answer = useCallback(
    (outcome: 'correct' | 'invalid') => {
      if (outcome === 'correct') {
        recordAnswer('compose', 'correct');
        correctCountRef.current += 1;
        setRoundScore(correctCountRef.current);
        setHistory((h) => [...h, 'correct']);
        const completed =
          useSessionStore.getState().questionIndex + 1;
        nextQuestion();

        if (completed >= ROUND_LENGTH) {
          // 10-й ответ → выдаём стикер только если набрано >= 5 правильных
          // (как в Arithmetic/Compare). При меньшем результате родительский
          // экран показывает FailureOverlay вместо RewardOverlay.
          if (correctCountRef.current >= PASSING_SCORE) {
            awardSticker({
              id: `sticker-compose-${Date.now()}`,
              mode: 'compose',
              earnedAt: Date.now(),
              iconKey: 'sticker-compose',
            });
          }
          setIsRoundComplete(true);
        } else {
          startNewQuestion();
        }
      } else {
        recordAnswer('compose', 'incorrect');
        setHistory((h) => [...h, 'incorrect']);
        clearBin();
      }
    },
    [
      recordAnswer,
      awardSticker,
      nextQuestion,
      clearBin,
      startNewQuestion,
    ],
  );

  /**
   * Watcher: реагирует на терминальные статусы корзины.
   *
   * Эффект работает по `bin.status`. После исхода `answer()` корзина
   * либо очищается (`invalid`), либо заменяется новой задачей
   * (`correct`+ startNewQuestion), либо остаётся в финальном состоянии
   * на показе RewardOverlay (`correct` + isRoundComplete). Во всех
   * сценариях статус становится не `correct/invalid`, поэтому
   * повторных срабатываний нет.
   */
  useEffect(() => {
    if (isRoundComplete) return;
    if (bin.status !== 'correct' && bin.status !== 'invalid') return;

    const outcome: 'correct' | 'invalid' = bin.status;
    const timer = setTimeout(() => answer(outcome), FEEDBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [bin.status, isRoundComplete, answer]);

  return {
    question,
    bin,
    questionIndex,
    roundScore,
    history,
    answer,
    startNewRound,
    startNewQuestion,
    isRoundComplete,
  };
}
