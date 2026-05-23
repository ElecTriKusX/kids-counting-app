/**
 * Shared TypeScript types for Kids Counting App.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md` → "Data Models".
 * The pure `domain/` layer, `state/` layer, and UI all consume these types,
 * so they live at `src/types.ts` (no RN/expo imports allowed here).
 */

/**
 * Three top-level game modes the child can launch from Home.
 */
export type GameMode = 'arithmetic' | 'compare' | 'compose';

/**
 * Difficulty level index used by the Difficulty_Engine.
 *
 * The engine maps each level to a closed numeric range:
 *  - 1 → 1..5
 *  - 2 → 1..10
 *  - 3 → 1..15
 *  - 4 → 1..20
 *
 * Modeled as a literal union (not `number`) so the compiler rejects
 * out-of-range levels at the call site (e.g. `level + 1` past 4).
 */
export type DifficultyLevel = 1 | 2 | 3 | 4;

/**
 * Outcome of a single answer. Used by Difficulty_Engine to compute the
 * rolling accuracy over the last ≤10 answers per mode.
 */
export type AnswerOutcome = 'correct' | 'incorrect';

/**
 * Arithmetic operation. Only addition and subtraction are produced for
 * this age group; the generator swaps operands so subtraction never
 * yields a negative result.
 */
export type ArithmeticOp = 'add' | 'sub';

/**
 * The three possible answers in Compare_Mode.
 */
export type CompareLabel = 'greater' | 'less' | 'equal';

/**
 * Compare_Mode has two presentational sub-modes that auto-advance:
 *  - `objects` — two visual groups of objects to compare
 *  - `digits`  — two large numerals to compare
 *
 * The store advances `objects → digits` after exactly 5 completed
 * tasks in `objects`.
 */
export type CompareSubMode = 'objects' | 'digits';

/**
 * Single draggable tile in Compose_Mode.
 */
export interface Tile {
  id: string;
  value: number;
}

/**
 * Arithmetic_Mode question.
 *
 * `options` always contains `correctAnswer` plus 2 or 3 distractors
 * (so length is 3 or 4) — see Req 2.2.
 */
export interface ArithmeticQuestion {
  kind: 'arithmetic';
  id: string;
  a: number;
  b: number;
  op: ArithmeticOp;
  correctAnswer: number;
  options: number[];
}

/**
 * Compare_Mode question.
 *
 * `subMode` controls how `left`/`right` are rendered (objects vs digits)
 * but the underlying numeric comparison is identical.
 */
export interface CompareQuestion {
  kind: 'compare';
  id: string;
  subMode: CompareSubMode;
  left: number;
  right: number;
  correct: CompareLabel;
}

/**
 * Compose_Mode puzzle: pick two tiles whose values sum to `target`.
 *
 * The generator guarantees at least one valid pair `(a, b)` exists in
 * `tiles` with `a + b === target` (Req 4.7).
 */
export interface ComposeQuestion {
  kind: 'compose';
  id: string;
  target: number;
  tiles: Tile[];
}

/**
 * Discriminated union of all question types. Narrow on the `kind`
 * field — never on `mode` — so each branch's specific fields become
 * type-safe (e.g. only `ArithmeticQuestion` has `options`).
 */
export type Question = ArithmeticQuestion | CompareQuestion | ComposeQuestion;

/**
 * A single answer event recorded for stats and Difficulty_Engine input.
 *
 * `raw` holds whatever the child actually selected (number for
 * arithmetic, `CompareLabel` string for compare, etc.) — kept loose so
 * any mode can persist it without a per-mode answer subtype.
 */
export interface Answer {
  questionId: string;
  mode: GameMode;
  outcome: AnswerOutcome;
  /** Epoch milliseconds. */
  answeredAt: number;
  raw?: string | number;
}

/**
 * Sticker awarded after completing a 10-question Round in any mode.
 *
 * `iconKey` indirects into the icon library used by
 * `StickerCollectionScreen` so the rendering layer can swap visuals
 * without touching persisted data.
 */
export interface Sticker {
  id: string;
  mode: GameMode;
  /** Epoch milliseconds. */
  earnedAt: number;
  iconKey: string;
}

/**
 * Per-mode progress snapshot. Lives inside `Progress_Store` and feeds
 * both Difficulty_Engine (`level` + `answerWindow`) and Parent_Section
 * stats (`totalAnswered` etc.).
 */
export interface GameProgress {
  mode: GameMode;
  level: DifficultyLevel;
  /** Sliding window of last ≤10 outcomes used by Difficulty_Engine. */
  answerWindow: AnswerOutcome[];
  totalAnswered: number;
  totalCorrect: number;
  roundsCompleted: number;
}

/**
 * Aggregated per-mode statistics displayed on the Parent_Section
 * cards.
 *
 * `totalAnswered` and `totalCorrect` are running totals over the
 * entire history (not the Difficulty_Engine sliding window) so the
 * Parent_Section's `accuracy = totalCorrect / totalAnswered` is a
 * lifetime metric that survives level changes. The sliding window
 * lives in `ProgressState.answerWindow` and is consumed only by the
 * Difficulty_Engine.
 */
export interface ParentStats {
  mode: GameMode;
  roundsCompleted: number;
  /** Lifetime number of answers recorded for this mode. */
  totalAnswered: number;
  /** Lifetime number of correct answers for this mode. */
  totalCorrect: number;
  /** Fraction in `[0, 1]`; `0` when `totalAnswered === 0`. */
  accuracy: number;
  currentRange: { min: number; max: number };
  /** True when Parent_User has explicitly pinned a level. */
  manualOverride: boolean;
}

/**
 * Parent_Lock arithmetic challenge gating access to Parent_Section.
 *
 * Operands are restricted to two-digit numbers (10..99) and the
 * operation is `mul` or `sub` — beyond a 4–6 year old child's
 * arithmetic ability (Req 8.1).
 */
export interface ParentLockChallenge {
  /** 10..99 */
  a: number;
  /** 10..99 */
  b: number;
  op: 'mul' | 'sub';
  correctAnswer: number;
}

/**
 * Shape persisted to AsyncStorage under key `kca:progress:v1`.
 *
 * `version: 1` is a literal so future schema changes can be detected
 * by `validateSnapshot` and migrated (or fall back to defaults — Req
 * 9.4). Excludes ephemeral fields like `hydrated`.
 */
export interface PersistedSnapshot {
  version: 1;
  stickers: Sticker[];
  difficulty: Record<GameMode, DifficultyLevel>;
  answerWindow: Record<GameMode, AnswerOutcome[]>;
  compareSubMode: CompareSubMode;
  compareObjectsCompleted: number;
  stats: Record<GameMode, ParentStats>;
  manualDifficultyOverride: Partial<Record<GameMode, DifficultyLevel>>;
}
