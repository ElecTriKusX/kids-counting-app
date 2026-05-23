# Design Document

## Overview

Kids Counting App — это однопользовательское офлайн-приложение на **React Native + Expo** для детей 4–6 лет. Приложение состоит из трёх игровых режимов (Arithmetic, Compare, Compose), системы поощрений (анимации + звуки + наклейки), родительского раздела с парент-локом и слоя локального персистентного состояния.

Архитектура выстроена вокруг трёх ключевых принципов:

1. **Чистая логика отделена от UI.** Генераторы вопросов, движок сложности, классификаторы ответов — это чистые функции, легко покрываемые property-based тестами.
2. **Состояние централизовано в zustand.** Один корневой store с тремя слайсами (`progress`, `difficulty`, `stickers`), плюс эфемерный игровой store для текущей сессии.
3. **Ассеты конфигурируются, не хардкодятся.** `Sound_Manifest` и `theme` — единые точки правды для звуков и визуала. Подмена файлов и палитры не требует правок в логике.

Платформа: Expo SDK (managed), TypeScript строгий, целевая ОС iOS/Android. Сетевые вызовы отсутствуют.

---

## Architecture

### High-level diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                              App.tsx                                 │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  GestureHandlerRootView → SafeAreaProvider → NavigationCt.   │    │
│  │  ┌──────────────────────┐    ┌──────────────────────────┐    │    │
│  │  │   BootstrapGate      │ →  │   RootStackNavigator     │    │    │
│  │  │ (hydrate Progress)   │    │ (Home / modes / parent)  │    │    │
│  │  └──────────────────────┘    └──────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │ zustand stores  │  │  Sound Adapter   │  │ Persistence Layer  │   │
│  │  - progress     │  │  (expo-av wrap)  │  │ (AsyncStorage +    │   │
│  │  - session      │  │                  │  │  debounced writer) │   │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  Pure domain modules (no RN imports):                       │     │
│  │  difficulty-engine, generators (arithmetic / compare /      │     │
│  │  compose), distractor, parent-lock, scoring                 │     │
│  └────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

### Слои

| Слой | Содержимое | Зависимости |
|---|---|---|
| `app/` | Точка входа, навигация, BootstrapGate | RN, Navigation, store |
| `screens/` | Экранные компоненты | components, store, hooks |
| `components/` | Переиспользуемые UI-блоки (Button, Card, NumericText, Tile, Bin) | theme, reanimated |
| `features/` | Логика конкретных режимов: hooks + view-models | domain, store |
| `domain/` | **Чистая логика**: генераторы, difficulty-engine, scoring | только TS, без RN |
| `state/` | zustand-стор и persistence | AsyncStorage, debounce |
| `audio/` | Sound_Manifest + SoundAdapter (expo-av) | expo-av |
| `theme/` | Цвета, типографика, размеры | — |

Чистый слой `domain/` не импортирует RN, expo-av или AsyncStorage. Это позволяет покрыть его property-based тестами в Node-окружении.

---

## Navigation

Используется `@react-navigation/native` + `@react-navigation/native-stack`. Один **Stack Navigator** на всё приложение — это проще для аудитории, чем табы или drawer.

```ts
// app/RootNavigator.tsx
export type RootStackParamList = {
  Home: undefined;
  Arithmetic: undefined;
  Compare: undefined;
  Compose: undefined;
  StickerCollection: undefined;
  ParentLock: undefined;
  ParentSection: undefined;
};
```

Правила навигации:

- Заголовки stack по умолчанию **скрыты** (`headerShown: false`). Каждый экран сам рисует крупную кнопку «домой» в углу — детям проще, чем системный back-arrow.
- Переход `Home → ParentLock → ParentSection`. На `ParentSection` можно попасть только через успешный `ParentLock` — для этого `ParentLock` после правильного ответа делает `navigation.replace('ParentSection')`. Кнопка «назад» с `ParentSection` ведёт на `Home`.
- Анимации переходов выключены или используются дефолтные fade. Время до открытия экрана — менее 500мс (Req 1.4) — обеспечивается тем, что экраны лёгкие и не делают сетевых вызовов.

```
Home ──► Arithmetic
     ──► Compare ──► (внутренний state-машина: objects ↔ digits)
     ──► Compose
     ──► StickerCollection
     ──► ParentLock ──(correct)──► ParentSection
                    ──(wrong)───► ParentLock (новая задача)
```

---

## State Management (zustand)

Архитектура — **два store-а**:

1. **`useProgressStore`** — персистентное состояние (хранится в AsyncStorage).
2. **`useSessionStore`** — эфемерное состояние текущей игры (текущий вопрос, плитки в корзине, и т.п., не персистится).

### Progress_Store

```ts
// state/progress-store.ts
interface ProgressState {
  // Sticker_Collection
  stickers: Sticker[];

  // Difficulty per mode
  difficulty: {
    arithmetic: DifficultyLevel; // 1..4 → диапазоны 1-5/1-10/1-15/1-20
    compare: DifficultyLevel;
    compose: DifficultyLevel;
  };

  // Скользящие окна последних 10 ответов (для Difficulty_Engine)
  answerWindow: {
    arithmetic: AnswerOutcome[]; // длина <= 10
    compare: AnswerOutcome[];
    compose: AnswerOutcome[];
  };

  // Compare sub-mode counter (для переключения objects→digits после 5 заданий)
  compareSubMode: 'objects' | 'digits';
  compareObjectsCompleted: number; // 0..5

  // Аггрегированная статистика для Parent_Section
  stats: Record<GameMode, ParentStats>;

  // Флаг ручного override от родителя
  manualDifficultyOverride: Partial<Record<GameMode, DifficultyLevel>>;

  // Hydration flag — true после успешной загрузки из AsyncStorage
  hydrated: boolean;
}

interface ProgressActions {
  recordAnswer(mode: GameMode, outcome: AnswerOutcome): void;
  awardSticker(sticker: Sticker): void;
  setManualDifficulty(mode: GameMode, level: DifficultyLevel): void;
  resetAll(): void;
  hydrate(snapshot: PersistedSnapshot): void;
  advanceCompareSubMode(): void;
}
```

`recordAnswer` инкапсулирует логику Difficulty_Engine: добавляет ответ в окно, обрезает окно до 10 элементов, запускает оценку и при необходимости меняет уровень сложности.

### Session_Store

```ts
// state/session-store.ts
interface SessionState {
  mode: GameMode | null;
  currentQuestion: Question | null;
  questionIndex: number; // 0..9 (Round = 10 вопросов)
  composeBin: ComposeBin; // только для Compose
  parentLockChallenge: ParentLockChallenge | null;
}
```

Session не персистится — при выходе на Home сбрасывается. Это намеренно: дети редко возвращаются ровно в ту же задачу, важнее сохранять долгосрочный прогресс.

### Difficulty_Engine state

`Difficulty_Engine` — **чистая функция**, живущая в `domain/difficulty-engine.ts`. State, на котором она работает, — это часть `Progress_Store`:

- `level: 1..4` (карта в Difficulty_Range — см. ниже).
- `window: AnswerOutcome[]` — длина 0..10.

Сама функция:

```ts
// domain/difficulty-engine.ts
export const LEVELS: ReadonlyArray<{ level: DifficultyLevel; max: number }> = [
  { level: 1, max: 5 },
  { level: 2, max: 10 },
  { level: 3, max: 15 },
  { level: 4, max: 20 },
];

export interface EngineInput {
  level: DifficultyLevel;
  window: AnswerOutcome[];
}

export interface EngineOutput {
  level: DifficultyLevel;
  window: AnswerOutcome[];
  changed: boolean;
}

export function evaluate(input: EngineInput, next: AnswerOutcome): EngineOutput {
  const window = [...input.window, next].slice(-10);
  if (window.length < 10) {
    return { level: input.level, window, changed: false };
  }
  const correct = window.filter((o) => o === 'correct').length;
  const accuracy = correct / window.length;

  if (accuracy > 0.8 && input.level < 4) {
    return { level: (input.level + 1) as DifficultyLevel, window: [], changed: true };
  }
  if (accuracy < 0.5 && input.level > 1) {
    return { level: (input.level - 1) as DifficultyLevel, window: [], changed: true };
  }
  return { level: input.level, window, changed: false };
}

export function rangeFor(level: DifficultyLevel): { min: number; max: number } {
  const found = LEVELS.find((l) => l.level === level)!;
  return { min: 1, max: found.max };
}
```

Ключевые свойства:

- При смене уровня окно очищается — иначе следующая оценка ещё 9 раз будет на старом уровне.
- Пороги (`> 0.8` и `< 0.5`) точные, а не `>=`/`<=` — соответствует формулировке в требованиях («превышает 80», «опускается ниже 50»).
- На границах (`level=1` при низком accuracy, `level=4` при высоком) уровень не меняется, но окно тоже обрезается до 10 — иначе окно будет расти бесконечно. **Решение:** на границах окно сохраняется как есть (последние 10), `changed=false`. Это позволяет немедленно отреагировать, как только тренд изменится.

### Sticker_Collection

```ts
// часть Progress_Store
stickers: Sticker[];
```

Группировка по `mode` для отображения — чистая функция в `domain/stickers.ts`:

```ts
export function groupByMode(stickers: Sticker[]): Record<GameMode, Sticker[]> {
  return stickers.reduce(
    (acc, s) => {
      acc[s.mode].push(s);
      return acc;
    },
    { arithmetic: [], compare: [], compose: [] } as Record<GameMode, Sticker[]>,
  );
}
```

---

## Sound_Manifest и SoundAdapter

### Манифест

Манифест — это **TS-объект**, а не JSON-файл, потому что Metro bundler требует статические `require(...)` для упаковки бинарных ассетов. Динамическая подгрузка по строковому пути в Expo не работает для аудио из bundle.

```ts
// audio/sound-manifest.ts
export type SoundId =
  | 'tap'
  | 'success'
  | 'error'
  | 'session_reward'
  | 'drag_pickup'
  | 'drag_drop';

export interface SoundManifestEntry {
  id: SoundId;
  module: number | null; // require(...) ассета или null если файл отсутствует
  prompt: string; // Описание для дизайнера/поиска ассетов (Req 11)
  maxDurationMs: number;
}

export const SOUND_MANIFEST: Record<SoundId, SoundManifestEntry> = {
  tap: {
    id: 'tap',
    module: require('../../assets/audio/tap.mp3'),
    prompt:
      'Короткий мягкий звук тапа, похожий на хлопок или звон монетки, длительность не более 200мс, без резких высоких частот',
    maxDurationMs: 200,
  },
  success: {
    id: 'success',
    module: require('../../assets/audio/success.mp3'),
    prompt:
      'Весёлый детский звук успеха, ксилофон или колокольчик, восходящая мелодия из 2–3 нот, длительность 0.8–1.5с',
    maxDurationMs: 1500,
  },
  error: {
    id: 'error',
    module: require('../../assets/audio/error.mp3'),
    prompt:
      'Нейтральный мягкий звук ошибки, низкий деревянный тон или короткое «ой», без резких частот и негативной окраски, до 500мс',
    maxDurationMs: 500,
  },
  session_reward: {
    id: 'session_reward',
    module: require('../../assets/audio/session_reward.mp3'),
    prompt:
      'Праздничный детский фанфар-звук с колокольчиками или мягкими духовыми, 1.5–2.5с',
    maxDurationMs: 2500,
  },
  drag_pickup: {
    id: 'drag_pickup',
    module: require('../../assets/audio/drag_pickup.mp3'),
    prompt:
      'Лёгкий «поп» или короткий деревянный стук при подъёме плитки, до 150мс',
    maxDurationMs: 150,
  },
  drag_drop: {
    id: 'drag_drop',
    module: require('../../assets/audio/drag_drop.mp3'),
    prompt:
      'Мягкий «клик» или приземление при опускании плитки в корзину, до 200мс',
    maxDurationMs: 200,
  },
};
```

Если файл отсутствует, `module` устанавливается в `null` — это явный, типизированный признак «звука нет». Замена аудио = подмена файла + правка одной строки `require`.

### SoundAdapter (expo-av)

Адаптер скрывает expo-av API и делает контракт `play(id)` тотальным: для любого ID не должно быть исключений.

```ts
// audio/sound-adapter.ts
import { Audio } from 'expo-av';
import { SOUND_MANIFEST, SoundId } from './sound-manifest';

class SoundAdapter {
  private cache: Partial<Record<SoundId, Audio.Sound>> = {};
  private loadingPromises: Partial<Record<SoundId, Promise<Audio.Sound | null>>> = {};

  async preload(): Promise<void> {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
    await Promise.all(
      (Object.keys(SOUND_MANIFEST) as SoundId[]).map((id) => this.load(id).catch(() => null)),
    );
  }

  private async load(id: SoundId): Promise<Audio.Sound | null> {
    if (this.cache[id]) return this.cache[id]!;
    if (this.loadingPromises[id]) return this.loadingPromises[id]!;

    const entry = SOUND_MANIFEST[id];
    if (!entry?.module) return null; // файл отсутствует — не падаем

    const p = (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(entry.module, { shouldPlay: false });
        this.cache[id] = sound;
        return sound;
      } catch {
        return null; // повреждённый файл — не падаем
      }
    })();
    this.loadingPromises[id] = p;
    return p;
  }

  async play(id: string): Promise<void> {
    try {
      // Невалидный id, отсутствующий файл, ошибки воспроизведения — все случаи безопасны
      if (!(id in SOUND_MANIFEST)) return;
      const sound = await this.load(id as SoundId);
      if (!sound) return;
      await sound.replayAsync();
    } catch {
      // Тихо проглатываем — Req 5.3, 10.3
    }
  }

  async unloadAll(): Promise<void> {
    await Promise.all(Object.values(this.cache).map((s) => s?.unloadAsync().catch(() => null)));
    this.cache = {};
    this.loadingPromises = {};
  }
}

export const soundAdapter = new SoundAdapter();
```

Контракт:

- `play(id)` **никогда** не throw. Любые ошибки expo-av проглатываются.
- `play(id)` для отсутствующего ID или отсутствующего файла — no-op.
- Повторное воспроизведение через `replayAsync` — мгновенный re-trigger без задержки на load.
- `preload()` вызывается один раз в `BootstrapGate` параллельно с гидратацией Progress_Store.

---

## Difficulty Engine — детали алгоритма

Скользящее окно реализовано как массив `AnswerOutcome[]` с обрезкой до последних 10 элементов через `slice(-10)`.

| Условие | Действие |
|---|---|
| `window.length < 10` | Только добавляем ответ, уровень не меняем |
| `window.length === 10 && correct/10 > 0.8 && level < 4` | `level += 1`, `window = []` |
| `window.length === 10 && correct/10 < 0.5 && level > 1` | `level -= 1`, `window = []` |
| Иначе | Без изменений уровня; окно как было (последние 10) |

Маппинг `level → range`:

| level | Difficulty_Range |
|---|---|
| 1 | 1–5 |
| 2 | 1–10 |
| 3 | 1–15 |
| 4 | 1–20 |

Стартовое значение для всех режимов — `level = 1` (Req 2.4). Manual override от Parent_User (Req 8.5–8.6) пишется в `manualDifficultyOverride[mode]`. При входе в режим действует приоритет:

```ts
const effectiveLevel = manualDifficultyOverride[mode] ?? difficulty[mode];
```

Manual override не блокирует автоматические переходы — он только устанавливает текущий уровень. Если родитель явно зафиксировал уровень и хочет, чтобы он не менялся, в Parent_Section есть переключатель «Закрепить уровень» (опциональный — описан в задачах).

---

## Distractor Generator (Arithmetic_Mode)

```ts
// domain/generators/distractor.ts
export function generateDistractors(correct: number, count: 2 | 3, rng: RNG): number[] {
  // Кандидаты со смещением ±1 и ±2, без отрицательных, без дубликата правильного ответа
  const pool = [correct - 2, correct - 1, correct + 1, correct + 2]
    .filter((v) => v >= 0 && v !== correct);

  // Уникальный пул (на случай если correct=0: -2,-1 отфильтровались, остаются 1,2)
  const unique = Array.from(new Set(pool));

  if (unique.length >= count) {
    return shuffle(unique, rng).slice(0, count);
  }

  // Edge case: рядом с нулём пул может быть короче 3.
  // Расширяем зеркально через +3, +4, … но никогда не используем отрицательные.
  const extension: number[] = [];
  let delta = 3;
  while (unique.length + extension.length < count) {
    const candidate = correct + delta;
    if (!unique.includes(candidate) && candidate !== correct) extension.push(candidate);
    delta += 1;
  }
  return shuffle([...unique, ...extension], rng).slice(0, count);
}
```

Свойства:

- Все возвращаемые значения **неотрицательные**.
- Все попарно различны и различны с `correct`.
- Базовый пул (≤±2) исчерпывается перед расширением — Req 2.3 соблюдён в типичном случае. Расширение нужно только для маленьких `correct` (например, `correct = 0` даёт пул `[1, 2]`, а нужно 3 дистрактора — берём `3`).

Количество вариантов ответа:

```ts
// 3 или 4 варианта (Req 2.2)
const optionCount = pickRandomly([3, 4], rng);
const distractorCount = optionCount - 1; // 2 или 3
const options = shuffle([correct, ...generateDistractors(correct, distractorCount as 2 | 3, rng)], rng);
```

---

## Compare Mode generator

```ts
// domain/generators/compare.ts
export type CompareLabel = 'greater' | 'less' | 'equal';

export interface CompareQuestion {
  left: number;
  right: number;
  correct: CompareLabel;
  options: ['greater', 'less', 'equal']; // всегда три, фиксированный порядок отображения
}

export function generateCompareQuestion(
  range: { min: number; max: number },
  recentLabels: CompareLabel[], // последние ≤9 правильных ответов
  rng: RNG,
): CompareQuestion;
```

Балансировка распределения (Req 3.6) через **подсчёт частоты в окне**:

1. В окне последних 9 заданий считаем сколько раз каждая метка была корректной.
2. Выбираем метку с минимальной частотой (при равенстве — случайно).
3. Генерируем числа `left, right` так, чтобы их соотношение давало выбранную метку.

Это не чисто-случайная генерация, а **управляемая** — поэтому в любом окне ≤9 заданий каждая метка появляется примерно одинаково часто (в среднем 3 ± 1).

---

## Compose Mode generator

```ts
// domain/generators/compose.ts
export interface ComposePuzzle {
  target: number;
  tiles: Tile[]; // 4–6 плиток
}

export function generateComposePuzzle(
  range: { min: number; max: number },
  rng: RNG,
): ComposePuzzle {
  const target = randomInt(2, range.max, rng);
  // Выбираем валидную пару (a, b) такую что a + b == target и оба в диапазоне
  const a = randomInt(1, Math.min(target - 1, range.max), rng);
  const b = target - a;
  // Заполняем оставшиеся плитки случайными числами из диапазона
  const filler = sampleN(1, range.max, 4, rng);
  return { target, tiles: shuffle([a, b, ...filler], rng).map(toTile) };
}
```

Гарантия Req 4.7: пара `(a, b)` строится первой, остальные плитки — наполнители.

### Drag-and-drop (react-native-gesture-handler + reanimated)

- Плитка — `Animated.View` с `useSharedValue` для `translateX/translateY`.
- Жест — `Gesture.Pan()` из `react-native-gesture-handler`.
- При завершении жеста проверяется hit-test против корзины (BoundingBox корзины запоминается через `onLayout`).
- При попадании плитка добавляется в `composeBin`, проигрывается `drag_drop`.
- При промахе плитка spring-анимацией возвращается на исходную позицию.

```ts
// features/compose/useTileGesture.ts
const pan = Gesture.Pan()
  .onBegin(() => {
    soundAdapter.play('drag_pickup');
    Haptics.selectionAsync();
  })
  .onUpdate((e) => {
    translateX.value = e.translationX;
    translateY.value = e.translationY;
  })
  .onEnd((e) => {
    const dropped = isInsideBin(tileLayout, binLayout, e);
    if (dropped) {
      runOnJS(addTileToBin)(tile);
      soundAdapter.play('drag_drop');
    } else {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  });
```

Состояние корзины:

```ts
// state/session-store.ts
interface ComposeBin {
  tiles: Tile[]; // ≤ 2 (для пары a+b)
  sum: number;  // computed, всегда равен sum(tiles)
  status: 'empty' | 'partial' | 'correct' | 'invalid';
}
```

Классификатор (чистая функция):

```ts
export function classifyBin(bin: ComposeBin, target: number): ComposeBin['status'] {
  if (bin.tiles.length === 0) return 'empty';
  if (bin.sum === target) return 'correct';
  if (bin.sum > target) return 'invalid';
  return 'partial';
}
```

Поведение:
- `correct` → Answer_Feedback (success), переход к следующей задаче (Req 4.4).
- `invalid` → Answer_Feedback (error), плитки возвращаются на исходные позиции (Req 4.5), корзина очищается.
- `partial` → ждём вторую плитку.

---

## Screen designs

### Home

- Layout: вертикальная колонка из 3 крупных кнопок режимов сверху, ниже две меньшие кнопки (Sticker_Collection, Parent).
- Каждая кнопка: иконка (emoji или Lottie-loop) + крупная подпись.
- Кнопка Parent визуально отличается (меньше, в углу) — чтобы не привлекать внимание ребёнка.

### Arithmetic

```
┌──────────────────────────────────┐
│ [home]              ●●●○○○○○○○ │ ← прогресс раунда (10 точек)
│                                  │
│            5 + 3 = ?             │
│                                  │
│   ┌──────┐  ┌──────┐  ┌──────┐  │
│   │  7   │  │  8   │  │  9   │  │
│   └──────┘  └──────┘  └──────┘  │
└──────────────────────────────────┘
```

Логика: `useArithmeticGame()` хук читает `effectiveLevel`, генерирует вопрос, по нажатию вызывает `recordAnswer` и анимирует обратную связь.

### Compare

Тот же layout, что Arithmetic, но:
- Сверху — либо две группы объектов (objects), либо две крупные цифры (digits).
- Снизу — три фиксированные кнопки: «>», «<», «=».
- В store отслеживается `compareObjectsCompleted`. Когда достигает 5 — `advanceCompareSubMode()` переключает в digits.

### Compose

```
┌──────────────────────────────────┐
│ [home]            Собери: 7      │
│                                  │
│      ╔══════════════════╗        │
│      ║   корзина        ║        │ ← drop zone
│      ║   [3] + [?]      ║        │
│      ╚══════════════════╝        │
│                                  │
│   [2]  [3]  [4]  [5]  [6]  [1]  │ ← draggable tiles
└──────────────────────────────────┘
```

### StickerCollection

- Группировка по режиму (заголовки секций).
- Сетка из стикеров (FlatList с `numColumns=3`).
- Тап на стикер — лёгкая scale-анимация и звук `tap`.

### ParentLock

```
┌──────────────────────────────────┐
│         Сколько будет?           │
│                                  │
│            12 × 7                │
│                                  │
│        [_____ввод_____]          │
│                                  │
│            [Готово]              │
└──────────────────────────────────┘
```

- Числа в диапазоне 10–99, операция `*` или `−` (Req 8.1).
- При неверном ответе — генерируется новая задача (Req 8.3), input очищается.
- При верном — `navigation.replace('ParentSection')`.

### ParentSection

- Карточки статистики по каждому режиму (количество Round, % правильных, текущий Difficulty_Range).
- Селектор Difficulty_Range (radio buttons или сегментированный контрол: 1–5 / 1–10 / 1–15 / 1–20).
- Кнопка «Сбросить» с диалогом подтверждения.

---

## Reward System

Три уровня поощрений реализуются разными механизмами.

### Tap_Feedback

Реализован в `components/PressableButton.tsx`:

```ts
const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

const onPressIn = () => {
  scale.value = withTiming(0.95, { duration: 120 });
  soundAdapter.play('tap');
};
const onPressOut = () => {
  scale.value = withTiming(1, { duration: 120 });
};
```

Полный цикл анимации (down + up) ≤ 240мс — укладывается в 500мс из Req 5.1.

### Answer_Feedback

**Правильный ответ:**
- Lottie-анимация конфетти overlay'ом по всему экрану (1–2 сек).
- Звук `success`.
- Кнопка с правильным ответом подсвечивается `colors.correct` (#6BCB77).

```ts
<LottieView source={require('@/assets/lottie/confetti.json')} autoPlay loop={false} duration={1500} />
```

**Неправильный ответ:**
- Shake-анимация выбранной кнопки: горизонтальное покачивание `±8px`, 4 цикла, total ~400мс.
- Звук `error`.
- Кнопка подсвечивается `colors.incorrect` (#FF6B6B).

```ts
const shakeX = useSharedValue(0);
shakeX.value = withSequence(
  withTiming(-8, { duration: 50 }),
  withTiming(8, { duration: 50 }),
  withTiming(-8, { duration: 50 }),
  withTiming(8, { duration: 50 }),
  withTiming(0, { duration: 50 }),
); // ~250мс — в пределах 500мс из Req 6.3
```

### Session_Feedback

При завершении 10-го вопроса в раунде (`questionIndex === 9` после ответа):

1. `awardSticker({ id, mode, earnedAt })`.
2. Полноэкранная Lottie-анимация награды (звезда/трофей).
3. Звук `session_reward`.
4. После завершения анимации (~2с) — переход обратно на Home.

---

## Persistence

### Контракт

`Progress_Store` сериализуется в JSON и пишется в AsyncStorage под ключом `kca:progress:v1`. Версия `v1` в ключе позволяет в будущем мигрировать схему.

### Гидратация (загрузка)

Реализована в `BootstrapGate`:

```ts
// app/BootstrapGate.tsx
export function BootstrapGate({ children }: { children: React.ReactNode }) {
  const hydrated = useProgressStore((s) => s.hydrated);
  const hydrate = useProgressStore((s) => s.hydrate);

  useEffect(() => {
    (async () => {
      const [snapshot] = await Promise.all([
        loadSnapshot(), // AsyncStorage.getItem + JSON.parse + validate
        soundAdapter.preload(), // параллельно
      ]);
      hydrate(snapshot ?? defaultSnapshot()); // Req 9.4: fallback к дефолтам
    })();
  }, []);

  if (!hydrated) return <SplashScreen />;
  return <>{children}</>;
}
```

Это гарантирует Req 9.3: Home не отрисуется, пока `hydrated === false`.

`loadSnapshot()`:

```ts
// state/persistence.ts
async function loadSnapshot(): Promise<PersistedSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!validateSnapshot(parsed)) return null; // схема не сошлась
    return parsed;
  } catch {
    return null; // повреждённый JSON — Req 9.4
  }
}
```

### Запись с дебаунсом

Запись подписана на `useProgressStore` через middleware-подписку:

```ts
// state/persistence.ts
let writeTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 500; // < 1с (Req 9.2 — записать в течение 1с)

useProgressStore.subscribe((state) => {
  if (!state.hydrated) return; // не пишем до завершения гидратации
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(state)));
    writeTimer = null;
  }, DEBOUNCE_MS);
});
```

Дебаунс 500мс выбран как «середина» между «не нагружать диск» и «успеть в 1с по требованию». При выходе приложения из foreground (`AppState` listener) делается синхронный flush — `clearTimeout` + немедленная запись.

`serialize(state)` фильтрует только персистентные поля (исключает `hydrated` и любые computed-поля).

---

## Theme

```ts
// theme/index.ts
export const colors = {
  background: '#FFF8F0',
  primary: '#FFD93D',
  success: '#6BCB77',
  info: '#4D96FF',
  danger: '#FF6B6B',
  text: '#1A1A2E',
  // алиасы для семантики
  correct: '#6BCB77',
  incorrect: '#FF6B6B',
} as const;

export const typography = {
  numeric: { fontSize: 48, fontWeight: '700' as const, color: colors.text },
  buttonLabel: { fontSize: 22, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 18, fontWeight: '400' as const, color: colors.text },
  // минимальные значения, на которые опирается тестовое property:
  minNumericFontSize: 28,
  minLabelFontSize: 18,
} as const;

export const radii = {
  button: 24, // ≥ 20
  card: 24,
  pill: 999,
  minTouchable: 64, // hit-area минимум
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
} as const;

export const theme = { colors, typography, radii, spacing } as const;
```

Все интерактивные компоненты (`PressableButton`, `Tile`, `Card`) **обязаны** импортировать значения из `theme`. Property-based тесты затем проверяют, что значения темы соответствуют минимумам Req 12.4–12.6.

---

## Components and Interfaces

Ниже сгруппированы ключевые программные интерфейсы — границы между слоями. Полная разбивка по файлам — в разделе «Project File Structure».

### Domain (чистая логика)

- `evaluate(input, next): EngineOutput` — Difficulty_Engine, описан выше.
- `rangeFor(level): { min, max }` — маппинг уровня в диапазон.
- `generateArithmeticQuestion(range, rng): ArithmeticQuestion` — генератор примеров.
- `generateDistractors(correct, count, rng): number[]` — генератор дистракторов.
- `generateCompareQuestion(range, recentLabels, rng): CompareQuestion` — балансированный генератор «больше/меньше/равно».
- `generateComposePuzzle(range, rng): ComposePuzzle` — генератор «собери число» с гарантией валидной пары.
- `classifyBin(bin, target): 'empty' | 'partial' | 'correct' | 'invalid'` — классификатор корзины.
- `groupByMode(stickers): Record<GameMode, Sticker[]>` — группировка коллекции наклеек.
- `generateParentLockChallenge(rng): ParentLockChallenge` — генератор парент-лока.
- `RNG` — seedable PRNG (для детерминированных property-тестов).

### State

- `useProgressStore` — zustand store с полями `ProgressState` и действиями `ProgressActions`.
- `useSessionStore` — эфемерный store текущей сессии.
- `loadSnapshot(): Promise<PersistedSnapshot | null>` — гидратация (в т.ч. fallback при повреждении).
- `serialize(state): PersistedSnapshot` / `deserialize(snapshot): Partial<ProgressState>` — round-trip сериализация.
- Подписка persistence-слоя на изменения store с дебаунсом 500мс.

### Audio

- `soundAdapter.preload()` — параллельная предзагрузка всех звуков.
- `soundAdapter.play(id: string)` — тотальная функция, не бросает исключений.
- `soundAdapter.unloadAll()` — освобождение ресурсов при unmount.

### UI components

- `PressableButton` — реализует Tap_Feedback (scale + sound).
- `ShakeView` — обёртка с горизонтальной shake-анимацией (Answer_Feedback для неправильного).
- `ConfettiOverlay` — Lottie конфетти (Answer_Feedback для правильного).
- `RewardOverlay` — Lottie награда + звук session_reward.
- `Tile`, `Bin` — Compose_Mode, drag-and-drop через gesture-handler + reanimated.
- `NumericText`, `ButtonLabel` — типографика, гарантирующая минимумы fontSize.
- `Card`, `HomeButton` — общие визуальные блоки с borderRadius из темы.

### Hooks (features)

- `useArithmeticGame()` — управление раундом из 10 примеров.
- `useCompareGame()` — управление подрежимами objects/digits и переключением.
- `useComposeGame()` — координация плиток и корзины.
- `useTileGesture()` — pan-жест для плитки.
- `useParentLock()` — логика парент-лока.

## Data Models

```ts
// types.ts

export type GameMode = 'arithmetic' | 'compare' | 'compose';

export type DifficultyLevel = 1 | 2 | 3 | 4;

export type AnswerOutcome = 'correct' | 'incorrect';

export type ArithmeticOp = 'add' | 'sub';

export type CompareLabel = 'greater' | 'less' | 'equal';

export type CompareSubMode = 'objects' | 'digits';

// Question — sum type, разделён по mode

export type Question =
  | ArithmeticQuestion
  | CompareQuestion
  | ComposeQuestion;

export interface ArithmeticQuestion {
  kind: 'arithmetic';
  id: string;
  a: number;
  b: number;
  op: ArithmeticOp;
  correctAnswer: number;
  options: number[]; // 3 или 4 элемента
}

export interface CompareQuestion {
  kind: 'compare';
  id: string;
  subMode: CompareSubMode;
  left: number;
  right: number;
  correct: CompareLabel;
}

export interface ComposeQuestion {
  kind: 'compose';
  id: string;
  target: number;
  tiles: Tile[];
}

export interface Tile {
  id: string;
  value: number;
}

// Ответ ребёнка

export interface Answer {
  questionId: string;
  mode: GameMode;
  outcome: AnswerOutcome;
  answeredAt: number; // epoch ms
  // полезные поля для статистики
  raw?: string | number; // что ребёнок выбрал
}

// Sticker — награда за раунд

export interface Sticker {
  id: string;
  mode: GameMode;
  earnedAt: number;
  iconKey: string; // ключ в иконочной библиотеке (для рендера)
}

// GameProgress — на режим

export interface GameProgress {
  mode: GameMode;
  level: DifficultyLevel;
  answerWindow: AnswerOutcome[]; // <= 10
  totalAnswered: number;
  totalCorrect: number;
  roundsCompleted: number;
}

// ParentStats — отображается в Parent_Section

export interface ParentStats {
  mode: GameMode;
  roundsCompleted: number;
  accuracy: number; // 0..1
  currentRange: { min: number; max: number };
  manualOverride: boolean;
}

// Parent_Lock challenge

export interface ParentLockChallenge {
  a: number; // 10..99
  b: number; // 10..99
  op: 'mul' | 'sub';
  correctAnswer: number;
}

// Persisted snapshot (то, что лежит в AsyncStorage)

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
```

---

## Project File Structure

```
src/
├── app/
│   ├── App.tsx                       # точка входа, провайдеры
│   ├── BootstrapGate.tsx             # гидратация Progress + preload звуков
│   ├── RootNavigator.tsx             # Stack navigator
│   └── SplashScreen.tsx
│
├── screens/
│   ├── HomeScreen.tsx
│   ├── ArithmeticScreen.tsx
│   ├── CompareScreen.tsx
│   ├── ComposeScreen.tsx
│   ├── StickerCollectionScreen.tsx
│   ├── ParentLockScreen.tsx
│   └── ParentSectionScreen.tsx
│
├── components/
│   ├── PressableButton.tsx           # tap feedback (scale + sound)
│   ├── Card.tsx
│   ├── NumericText.tsx               # шрифт ≥28
│   ├── ButtonLabel.tsx               # шрифт ≥18
│   ├── Tile.tsx                      # плитка для Compose (drag handle)
│   ├── Bin.tsx                       # корзина для Compose
│   ├── ConfettiOverlay.tsx           # Lottie конфетти
│   ├── ShakeView.tsx                 # обёртка с shake-анимацией
│   ├── RewardOverlay.tsx             # Session_Feedback
│   └── HomeButton.tsx                # крупная кнопка «домой»
│
├── features/
│   ├── arithmetic/
│   │   └── useArithmeticGame.ts
│   ├── compare/
│   │   └── useCompareGame.ts
│   ├── compose/
│   │   ├── useComposeGame.ts
│   │   └── useTileGesture.ts
│   └── parent/
│       └── useParentLock.ts
│
├── domain/                           # ЧИСТАЯ ЛОГИКА — без RN/expo
│   ├── difficulty-engine.ts
│   ├── stickers.ts
│   ├── parent-lock.ts
│   ├── scoring.ts
│   ├── rng.ts                        # детерминированный seedable RNG для тестов
│   └── generators/
│       ├── arithmetic.ts
│       ├── distractor.ts
│       ├── compare.ts
│       ├── compose.ts
│       └── classify-bin.ts
│
├── state/
│   ├── progress-store.ts             # zustand persistent store
│   ├── session-store.ts              # zustand ephemeral store
│   ├── persistence.ts                # AsyncStorage adapter + debounce
│   └── selectors.ts
│
├── audio/
│   ├── sound-manifest.ts
│   └── sound-adapter.ts
│
├── theme/
│   └── index.ts
│
├── types.ts
│
└── utils/
    ├── haptics.ts                    # обёртка над expo-haptics
    └── debounce.ts

assets/
├── audio/                            # tap.mp3, success.mp3, ...
└── lottie/                           # confetti.json, reward.json

__tests__/                            # property и example tests
├── domain/
│   ├── difficulty-engine.test.ts
│   ├── distractor.test.ts
│   ├── arithmetic-generator.test.ts
│   ├── compare-generator.test.ts
│   ├── compose-generator.test.ts
│   ├── classify-bin.test.ts
│   ├── parent-lock.test.ts
│   └── stickers.test.ts
├── state/
│   ├── persistence.test.ts
│   └── progress-store.test.ts
├── audio/
│   └── sound-adapter.test.ts
└── components/
    └── theme-bound.test.ts
```

---

## Error Handling

| Категория | Стратегия |
|---|---|
| Повреждённые данные в AsyncStorage | `loadSnapshot()` ловит исключения JSON.parse, валидирует схему через зод-подобный validator, при несовпадении возвращает `null`. `BootstrapGate` использует `defaultSnapshot()`. |
| Отсутствующий звуковой файл | `module: null` в манифесте → `SoundAdapter.play()` no-op. |
| Ошибки expo-av (load/play) | `try/catch` внутри `SoundAdapter`, тихо проглатываются. Не показываются ребёнку. |
| Ошибки Lottie | `LottieView` рендерится в `<ErrorBoundary>`, фолбэк — статичная иконка. Звук всё равно проигрывается. |
| Жесты (gesture-handler) | Если жест прервался (`.onFinalize` без `.onEnd`), плитка возвращается на исходную позицию. |
| Невозможно сгенерировать distractors (теоретически невозможно с текущим алгоритмом) | Защита: `optionCount` снижается до min(3, доступных вариантов). |
| Parent_Lock — слишком большой ввод | Поле числовое, ограничено 5 цифрами. |
| Сбой при записи в AsyncStorage | Тихо логируем (в dev — `console.warn`), повторная запись произойдёт при следующей мутации. Не блокируем UI. |

Принцип: **детский UI никогда не должен показывать ошибки**. Все исключения проглатываются и логируются (в dev). В production ошибки можно отправлять в Sentry (вне scope текущей задачи).

---

## Testing Strategy

**Двухуровневый подход:**

1. **Property-based tests** (fast-check, 100+ итераций каждое) для чистого слоя `domain/`, движка сложности, persistence и тематических компонентов. Покрывают универсальные свойства из раздела Correctness Properties.
2. **Example-based unit tests** (jest + React Native Testing Library) для конкретных UI-сценариев: рендер главного экрана, переходы навигации, отображение статистики в Parent_Section, ручной выбор сложности.

**Изоляция чистого слоя.** `domain/` не импортирует RN/expo — тесты идут в Node без эмулятора. Это даёт скорость и стабильность property-based прогонов.

**Mocks:**
- `expo-av` мокается для тестов SoundAdapter (Property 8): проверяется, что `play(id)` не бросает для произвольных ID, включая отсутствующие.
- `@react-native-async-storage/async-storage` мокается через официальный jest-mock для тестов persistence (Property 13–15).
- `expo-haptics` мокается для теста Compose-жеста (вызовы регистрируются, но не выполняются).

**Детерминизм.** Все генераторы принимают `RNG` явным параметром. В тестах используется seedable PRNG, что гарантирует воспроизводимость падений.

**Smoke tests:** один тест на запуск приложения, проверяющий что `BootstrapGate` гидратирует store до отображения Home.

**Тег property-тестов:** `Feature: kids-counting-app, Property {N}: {title}` — для удобной фильтрации в CI.

---

## Acceptance Criteria Testing Prework

См. полную таблицу классификации в prework-аналитике (zustand-стор/persistence/генераторы — PROPERTY; UI/тема/звуковые промты — EXAMPLE; bootstrap — SMOKE/EXAMPLE). Ниже — итоговые свойства после консолидации избыточных пунктов.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Arithmetic question is well-formed

For any `Difficulty_Range` and any RNG seed, the generated `ArithmeticQuestion` satisfies: `a` and `b` lie within the range, `op ∈ {add, sub}`, `correctAnswer = op(a,b)`, and `correctAnswer >= 0`.

**Validates: Requirements 2.1, 2.8**

### Property 2: Arithmetic answer options are valid

For any `ArithmeticQuestion`, `options.length ∈ {3,4}`, all options are non-negative integers, all are pairwise distinct, exactly one option equals `correctAnswer`, and every distractor lies within `{correct−2, correct−1, correct+1, correct+2}` whenever the base pool of size `optionCount−1` exists in non-negative range.

**Validates: Requirements 2.2, 2.3**

### Property 3: Difficulty engine transitions are bounded and threshold-driven

For any sequence of `AnswerOutcome` values fed to `evaluate`, after each step: the answer window contains at most 10 elements; the level stays within `{1,2,3,4}`; the level increases by exactly 1 iff the window has 10 entries and accuracy `> 0.8` and current level `< 4`; the level decreases by exactly 1 iff the window has 10 entries and accuracy `< 0.5` and current level `> 1`; otherwise the level is unchanged.

**Validates: Requirements 2.5, 2.6, 2.7**

### Property 4: Compare sub-mode advances after exactly 5 object tasks

For any sequence of completed `Compare_Objects` tasks, `compareSubMode` becomes `digits` exactly when `compareObjectsCompleted` reaches 5 (and not before).

**Validates: Requirements 3.3**

### Property 5: Compare question is well-formed and balanced

For any `Difficulty_Range` and any prefix of a compare-question stream, every generated `CompareQuestion` has both numbers in range, exactly three answer options, and the correct label `∈ {greater, less, equal}`. Furthermore, in any window of the last 9 generated questions, each correct label appears at least 2 and at most 4 times.

**Validates: Requirements 3.4, 3.5, 3.6**

### Property 6: Compose puzzle has at least one valid pair

For any `Difficulty_Range` and any RNG seed, the generated `ComposePuzzle` contains tiles such that there exists at least one pair `(t_i, t_j)` with `t_i.value + t_j.value == target`, `i ≠ j`, and the target itself lies within range.

**Validates: Requirements 4.1, 4.7**

### Property 7: Compose bin classification matches sum vs target

For any sequence of add/remove tile operations on a `ComposeBin` and any positive `target`, the bin satisfies: `bin.sum == sum(bin.tiles)`; `classifyBin(bin, target) == 'correct'` iff `bin.sum == target` and `bin.tiles.length > 0`; `classifyBin(bin, target) == 'invalid'` iff `bin.sum > target`; `classifyBin(bin, target) == 'partial'` iff `0 < bin.sum < target`.

**Validates: Requirements 4.3, 4.4, 4.5**

### Property 8: Sound adapter is total

For any string id (including ids absent from `Sound_Manifest`, ids whose `module` is null, and arbitrary unrelated strings), calling `soundAdapter.play(id)` resolves without throwing and without producing any user-visible error.

**Validates: Requirements 5.3, 10.3**

### Property 9: Round completion awards exactly one sticker

For any sequence of `N` completed rounds across any combination of game modes, the length of `Sticker_Collection` increases by exactly `N`, and each new sticker has `mode` matching the round it was awarded for.

**Validates: Requirements 7.1**

### Property 10: Sticker grouping preserves all stickers

For any list of stickers, `groupByMode(stickers)` partitions the input so that the union of all groups equals the input set, every sticker appears in exactly one group, and every sticker in group `G_m` has `mode == m`.

**Validates: Requirements 7.3**

### Property 11: Parent lock unlocks iff input matches

For any generated `ParentLockChallenge`, both operands lie in `[10,99]`, the operation is `mul` or `sub`, and `correctAnswer` equals the operation applied to the operands. For any user input: `unlocked == true` iff `input == correctAnswer`; if `unlocked == false`, a fresh challenge is generated and the previous state is replaced.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 12: Reset clears stats and stickers

For any prior `Progress_Store` state, after `resetAll()` the `stickers` array is empty, all `stats` aggregates are zeroed, and `difficulty` is reset to the initial level for every mode.

**Validates: Requirements 8.7**

### Property 13: Progress_Store round-trips through serialization

For any valid `Progress_Store` state (including manual difficulty overrides, full sticker collections, and partial answer windows), `deserialize(serialize(state))` is structurally equal to `state`.

**Validates: Requirements 9.1, 8.6**

### Property 14: Persisted state converges within debounce window

For any sequence of mutations applied to `Progress_Store`, after the debounce interval (≤ 1 second) following the last mutation, the value stored in AsyncStorage equals `serialize(currentState)`.

**Validates: Requirements 9.2, 7.4**

### Property 15: Hydration is total

For any value present at `STORAGE_KEY` in AsyncStorage (including absent, empty string, malformed JSON, JSON with missing fields, and JSON with wrong types), `loadSnapshot()` resolves without throwing, and `BootstrapGate` initializes `Progress_Store` with either the valid persisted snapshot or the default snapshot.

**Validates: Requirements 9.4**

### Property 16: Themed UI components honor child-friendly minima

For any props passed to `PressableButton`, `Card`, `NumericText`, and `ButtonLabel`, the resulting style satisfies: `borderRadius >= 20` for buttons and cards; effective hit-area is at least `64×64` points for interactive elements; `fontSize >= 28` for `NumericText`; `fontSize >= 18` for `ButtonLabel`.

**Validates: Requirements 1.5, 12.4, 12.5, 12.6**
