/**
 * Persistence layer for `Progress_Store`.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md` → "Persistence".
 *
 * Responsibilities:
 *  - `serialize` / `deserialize`: shape conversion between live
 *    `ProgressState` and the on-disk `PersistedSnapshot` (Req 9.1).
 *  - `validateSnapshot`: defensive type-guard so corrupt/older payloads
 *    can't crash hydration — any malformation returns `false` and
 *    `loadSnapshot` falls back to `null` (Req 9.4).
 *  - `defaultSnapshot`: the starting state used when AsyncStorage is
 *    empty or returns garbage (Req 9.4).
 *  - `loadSnapshot`: a total async loader — never throws, always
 *    resolves with either a valid snapshot or `null`.
 *  - `attachPersistence`: subscribes to `useProgressStore` and writes
 *    debounced JSON snapshots to AsyncStorage. Listens to `AppState`
 *    so a transition to background/inactive flushes the pending write
 *    immediately (Req 9.2, 7.4). Returns an unsubscribe callable that
 *    cleans up the timer and listeners.
 *
 * The module imports React Native primitives (`AppState`,
 * AsyncStorage), so it's intentionally separate from
 * `progress-store.ts` — that file stays RN-free for unit tests.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

import type {
  AnswerOutcome,
  CompareSubMode,
  DifficultyLevel,
  GameMode,
  ParentStats,
  PersistedSnapshot,
  Sticker,
} from '../types';
import { rangeFor } from '../domain/difficulty-engine';
import { useProgressStore, type ProgressState } from './progress-store';

/**
 * AsyncStorage key. The `:v1` suffix lets future schema versions
 * coexist with the current one during migration windows.
 */
export const STORAGE_KEY = 'kca:progress:v1';

/**
 * Debounce window for AsyncStorage writes (ms).
 *
 * 500 ms keeps disk pressure low while staying well under the 1 s
 * convergence ceiling from Req 9.2.
 */
const DEBOUNCE_MS = 500;

/**
 * Pick the persisted slice of `ProgressState` and stamp the schema
 * version. `hydrated` and any computed fields are intentionally
 * omitted — they're recomputed on load.
 */
export function serialize(state: ProgressState): PersistedSnapshot {
  return {
    version: 1,
    stickers: state.stickers,
    difficulty: state.difficulty,
    answerWindow: state.answerWindow,
    compareSubMode: state.compareSubMode,
    compareObjectsCompleted: state.compareObjectsCompleted,
    stats: state.stats,
    manualDifficultyOverride: state.manualDifficultyOverride,
  };
}

/**
 * Convert a snapshot into a `Partial<ProgressState>` patch. Today
 * this is essentially the identity (minus `version`) — the store's
 * `hydrate()` action is what actually applies it. Kept as a separate
 * function so future migrations can adapt older snapshots in one
 * place without touching the store.
 */
export function deserialize(snapshot: PersistedSnapshot): Partial<ProgressState> {
  return {
    stickers: snapshot.stickers,
    difficulty: snapshot.difficulty,
    answerWindow: snapshot.answerWindow,
    compareSubMode: snapshot.compareSubMode,
    compareObjectsCompleted: snapshot.compareObjectsCompleted,
    stats: snapshot.stats,
    manualDifficultyOverride: snapshot.manualDifficultyOverride,
  };
}

/* -------------------------------------------------------------------------- */
/*  Defensive validation helpers                                              */
/* -------------------------------------------------------------------------- */

/** All three game modes — used to validate per-mode record shapes. */
const GAME_MODES: readonly GameMode[] = ['arithmetic', 'compare', 'compose'];

/** Allowed difficulty levels — must match `DifficultyLevel` exactly. */
const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4];

/** Allowed answer outcomes. */
const ANSWER_OUTCOMES: readonly AnswerOutcome[] = ['correct', 'incorrect'];

/** Allowed compare sub-modes. */
const COMPARE_SUB_MODES: readonly CompareSubMode[] = ['objects', 'digits'];

/** Narrow `unknown` to a non-null record so property access is safe. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when every member of `value` satisfies `pred`. */
function isArrayOf<T>(value: unknown, pred: (v: unknown) => v is T): value is T[] {
  return Array.isArray(value) && value.every(pred);
}

/** True when `value` is a `DifficultyLevel`. */
function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return (
    typeof value === 'number' &&
    (DIFFICULTY_LEVELS as readonly number[]).includes(value)
  );
}

/** True when `value` is an `AnswerOutcome`. */
function isAnswerOutcome(value: unknown): value is AnswerOutcome {
  return typeof value === 'string' && (ANSWER_OUTCOMES as readonly string[]).includes(value);
}

/** True when `value` is a `Sticker`-shaped object. */
function isSticker(value: unknown): value is Sticker {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.mode === 'string' &&
    (GAME_MODES as readonly string[]).includes(value.mode) &&
    typeof value.earnedAt === 'number' &&
    typeof value.iconKey === 'string'
  );
}

/**
 * True when `value` is `Record<GameMode, T>` and every per-mode
 * member is accepted by `valuePred`.
 */
function isRecordPerMode<T>(
  value: unknown,
  valuePred: (v: unknown) => v is T,
): value is Record<GameMode, T> {
  if (!isObject(value)) return false;
  return GAME_MODES.every((mode) => valuePred(value[mode]));
}

/** True when `value` is a `ParentStats` object for the given mode. */
function isParentStats(value: unknown): value is ParentStats {
  if (!isObject(value)) return false;
  if (typeof value.mode !== 'string') return false;
  if (!(GAME_MODES as readonly string[]).includes(value.mode)) return false;
  if (typeof value.roundsCompleted !== 'number') return false;
  if (typeof value.totalAnswered !== 'number') return false;
  if (typeof value.totalCorrect !== 'number') return false;
  if (typeof value.accuracy !== 'number') return false;
  if (typeof value.manualOverride !== 'boolean') return false;
  if (!isObject(value.currentRange)) return false;
  if (typeof value.currentRange.min !== 'number') return false;
  if (typeof value.currentRange.max !== 'number') return false;
  return true;
}

/**
 * True when `value` is `Partial<Record<GameMode, DifficultyLevel>>`.
 * Allows missing keys and `undefined` values — only present-and-defined
 * entries are checked against `DifficultyLevel`.
 */
function isManualOverride(
  value: unknown,
): value is Partial<Record<GameMode, DifficultyLevel>> {
  if (!isObject(value)) return false;
  return GAME_MODES.every((mode) => {
    const v = value[mode];
    return v === undefined || isDifficultyLevel(v);
  });
}

/**
 * Defensive type-guard for `PersistedSnapshot`. Returns `false` for
 * any malformation — never throws. Used by `loadSnapshot` to discard
 * corrupt payloads (Req 9.4).
 */
export function validateSnapshot(value: unknown): value is PersistedSnapshot {
  try {
    if (!isObject(value)) return false;
    if (value.version !== 1) return false;

    if (!isArrayOf(value.stickers, isSticker)) return false;

    if (!isRecordPerMode(value.difficulty, isDifficultyLevel)) return false;

    if (
      !isRecordPerMode<AnswerOutcome[]>(value.answerWindow, (v): v is AnswerOutcome[] =>
        isArrayOf(v, isAnswerOutcome),
      )
    ) {
      return false;
    }

    if (
      typeof value.compareSubMode !== 'string' ||
      !(COMPARE_SUB_MODES as readonly string[]).includes(value.compareSubMode)
    ) {
      return false;
    }

    if (
      typeof value.compareObjectsCompleted !== 'number' ||
      value.compareObjectsCompleted < 0
    ) {
      return false;
    }

    if (!isRecordPerMode(value.stats, isParentStats)) return false;

    if (!isManualOverride(value.manualDifficultyOverride)) return false;

    return true;
  } catch {
    // Belt-and-suspenders: a malformed proxy / getter throwing should
    // still surface as "invalid", never propagate.
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*  Defaults + load                                                           */
/* -------------------------------------------------------------------------- */

/** Build a fresh per-mode `ParentStats` anchored to level 1. */
function makeDefaultStats(mode: GameMode): ParentStats {
  return {
    mode,
    roundsCompleted: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    accuracy: 0,
    currentRange: rangeFor(1),
    manualOverride: false,
  };
}

/**
 * Starting snapshot used when AsyncStorage is empty or returns
 * garbage (Req 9.4). All modes start at level 1 with empty windows
 * and an empty sticker collection.
 */
export function defaultSnapshot(): PersistedSnapshot {
  return {
    version: 1,
    stickers: [],
    difficulty: { arithmetic: 1, compare: 1, compose: 1 },
    answerWindow: { arithmetic: [], compare: [], compose: [] },
    compareSubMode: 'objects',
    compareObjectsCompleted: 0,
    stats: {
      arithmetic: makeDefaultStats('arithmetic'),
      compare: makeDefaultStats('compare'),
      compose: makeDefaultStats('compose'),
    },
    manualDifficultyOverride: {},
  };
}

/**
 * Total async loader: returns either a validated snapshot or `null`.
 * Catches every failure mode (missing key, AsyncStorage error,
 * malformed JSON, schema mismatch) so callers can treat `null` as
 * "use defaults" without a try/catch (Req 9.4).
 */
export async function loadSnapshot(): Promise<PersistedSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!validateSnapshot(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Debounced AsyncStorage writer                                             */
/* -------------------------------------------------------------------------- */

/**
 * Subscribe to `useProgressStore` and persist debounced snapshots to
 * AsyncStorage. Also flushes any pending write when the app moves to
 * `background` or `inactive` (Req 9.2 — "in 1s after change").
 *
 * Returns a cleanup function that:
 *   1. Cancels any pending debounce timer (no flush — caller decides).
 *   2. Removes the AppState listener.
 *   3. Unsubscribes from the store.
 *
 * Designed to be called once at app boot (e.g. from `App.tsx`) and
 * disposed only on hot-reload / teardown in tests.
 */
export function attachPersistence(): () => void {
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Latest serialized payload waiting to be flushed. */
  let pendingPayload: string | null = null;

  /** Write the queued payload synchronously-from-the-caller's-POV. */
  const flush = (): void => {
    if (writeTimer !== null) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
    if (pendingPayload === null) return;
    const payload = pendingPayload;
    pendingPayload = null;
    // Fire-and-forget: AsyncStorage failures must not crash the app
    // and there's no recovery path here — the next state change will
    // queue a new write anyway.
    void AsyncStorage.setItem(STORAGE_KEY, payload).catch(() => {
      /* swallow — see comment above */
    });
  };

  const unsubscribe = useProgressStore.subscribe((state) => {
    // Don't persist anything until `BootstrapGate` has finished
    // hydrating — otherwise we'd overwrite the saved snapshot with
    // the empty initial state.
    if (!state.hydrated) return;

    pendingPayload = JSON.stringify(serialize(state));

    if (writeTimer !== null) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      writeTimer = null;
      flush();
    }, DEBOUNCE_MS);
  });

  const onAppStateChange = (status: AppStateStatus): void => {
    // Background / inactive → flush immediately so the OS can suspend
    // us without losing the latest progress.
    if (status === 'background' || status === 'inactive') {
      flush();
    }
  };

  const appStateSubscription = AppState.addEventListener('change', onAppStateChange);

  return () => {
    if (writeTimer !== null) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
    pendingPayload = null;
    appStateSubscription.remove();
    unsubscribe();
  };
}
