# Implementation Plan: Kids Counting App

## Overview

Реализация ведётся слой за слоем снизу вверх: bootstrap → чистый domain → состояние и persistence → аудио → UI-компоненты → игровые хуки → экраны → навигация и интеграция. Чистый `domain/` слой пишется и тестируется (property-based) первым — это даёт быстрый и стабильный фидбек без эмулятора. UI и экраны опираются на готовый `theme`, готовые stores и готовый `SoundAdapter`. Финальный шаг — `BootstrapGate` + `RootNavigator` + интеграционные smoke-тесты, проверяющие, что приложение гидратируется до отрисовки Home и что цикл «раунд → стикер» работает end-to-end.

Язык реализации: **TypeScript** (зафиксирован в design.md, React Native + Expo managed workflow). Все 16 correctness properties из design.md вынесены в отдельные property-test задачи, привязанные к месту реализации.

## Tasks

- [x] 1. Bootstrap проекта
  - [x] 1.1 Инициализировать Expo + TypeScript + базовые зависимости
    - Создать Expo managed-проект с TypeScript template
    - Установить зависимости: `zustand`, `@react-native-async-storage/async-storage`, `expo-av`, `expo-haptics`, `react-native-reanimated`, `react-native-gesture-handler`, `lottie-react-native`, `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-safe-area-context`, `react-native-screens`
    - Установить dev-зависимости: `jest`, `jest-expo`, `@testing-library/react-native`, `fast-check`
    - Настроить `tsconfig.json` (strict), `babel.config.js` (reanimated plugin), `jest.config.js` (preset jest-expo)
    - Создать пустую структуру каталогов: `src/{app,screens,components,features,domain,state,audio,theme,utils}`, `assets/{audio,lottie}`, `__tests__/`
    - _Requirements: общая инфраструктура (поддерживает все требования)_

  - [x] 1.2 Определить общие типы (`src/types.ts`)
    - `GameMode`, `DifficultyLevel`, `AnswerOutcome`, `ArithmeticOp`, `CompareLabel`, `CompareSubMode`
    - `ArithmeticQuestion`, `CompareQuestion`, `ComposeQuestion`, `Question` (sum type), `Tile`
    - `Answer`, `Sticker`, `GameProgress`, `ParentStats`, `ParentLockChallenge`, `PersistedSnapshot`
    - _Requirements: 2.1, 2.2, 3.4, 4.1, 7.1, 8.1, 9.1_

  - [x] 1.3 Реализовать тему (`src/theme/index.ts`)
    - Экспортировать `colors` (#FFF8F0, #FFD93D, #6BCB77, #4D96FF, #FF6B6B, #1A1A2E + алиасы `correct`/`incorrect`)
    - Экспортировать `typography` с `numeric` (≥28pt), `buttonLabel` (≥18pt) и константами минимумов
    - Экспортировать `radii` (`button: 24`, `card: 24`, `minTouchable: 64`) и `spacing`
    - _Requirements: 1.5, 6.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 2. Чистый domain — RNG и движок сложности
  - [x] 2.1 Реализовать seedable RNG (`src/domain/rng.ts`)
    - Интерфейс `RNG` с методом `next(): number` (0..1) и хелперами `randomInt(min, max, rng)`, `pickRandomly`, `shuffle`, `sampleN`
    - Детерминированная реализация (например, mulberry32) для воспроизводимости property-тестов
    - _Requirements: общая инфраструктура для генераторов (поддерживает 2.x, 3.x, 4.x, 8.1)_

  - [x] 2.2 Реализовать `Difficulty_Engine` (`src/domain/difficulty-engine.ts`)
    - Константа `LEVELS` (1→1-5, 2→1-10, 3→1-15, 4→1-20)
    - Функция `evaluate({ level, window }, next): { level, window, changed }` — окно ≤10, при `accuracy > 0.8` и `level < 4` → +1 уровень, окно очищается; при `accuracy < 0.5` и `level > 1` → −1 уровень, окно очищается; иначе окно `slice(-10)`, уровень не меняется
    - Функция `rangeFor(level): { min, max }`
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

  - [x]* 2.3 Property-тест для Difficulty_Engine
    - **Property 3: Difficulty engine transitions are bounded and threshold-driven**
    - **Validates: Requirements 2.5, 2.6, 2.7**

- [x] 3. Чистый domain — генераторы заданий
  - [x] 3.1 Реализовать генератор дистракторов (`src/domain/generators/distractor.ts`)
    - `generateDistractors(correct, count, rng): number[]` — пул `±1, ±2`, фильтр отрицательных и дубликатов, расширение `+3, +4, ...` если пул короче `count`, возврат неотрицательных уникальных чисел
    - _Requirements: 2.3_

  - [x]* 3.2 Property-тест для distractor (часть Property 2)
    - **Property 2 (часть про дистракторы): non-negative, pairwise distinct, базовый пул ±1/±2 при достаточной длине**
    - **Validates: Requirements 2.3**

  - [x] 3.3 Реализовать генератор арифметических задач (`src/domain/generators/arithmetic.ts`)
    - `generateArithmeticQuestion(range, rng): ArithmeticQuestion` — выбор `op ∈ {add, sub}`, операнды в `range`, при `sub` с отрицательным результатом перестановка операндов, выбор `optionCount ∈ {3, 4}`, сборка `options` из `correctAnswer + distractors` и shuffle
    - _Requirements: 2.1, 2.2, 2.3, 2.8_

  - [x]* 3.4 Property-тест для arithmetic generator
    - **Property 1: Arithmetic question is well-formed** + **Property 2: Arithmetic answer options are valid (целостный тест на собранный вопрос)**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.8**

  - [x] 3.5 Реализовать compare-генератор (`src/domain/generators/compare.ts`)
    - `generateCompareQuestion(range, recentLabels, rng): CompareQuestion` — подсчёт частоты меток в `recentLabels` (≤9), выбор метки с минимальной частотой, генерация чисел `left, right` так, чтобы соотношение давало выбранную метку, фиксированный `options: ['greater', 'less', 'equal']`
    - _Requirements: 3.4, 3.5, 3.6_

  - [x]* 3.6 Property-тест для compare generator
    - **Property 5: Compare question is well-formed and balanced**
    - **Validates: Requirements 3.4, 3.5, 3.6**

  - [x] 3.7 Реализовать compose-генератор (`src/domain/generators/compose.ts`)
    - `generateComposePuzzle(range, rng): ComposePuzzle` — выбор `target ∈ [2, range.max]`, построение валидной пары `(a, b)` где `a + b == target`, добавление 4 наполнителей через `sampleN`, shuffle и маппинг в `Tile[]`
    - _Requirements: 4.1, 4.7_

  - [x]* 3.8 Property-тест для compose generator
    - **Property 6: Compose puzzle has at least one valid pair**
    - **Validates: Requirements 4.1, 4.7**

  - [x] 3.9 Реализовать классификатор корзины (`src/domain/generators/classify-bin.ts`)
    - `classifyBin(bin, target): 'empty' | 'partial' | 'correct' | 'invalid'` — `empty` при пустых tiles, `correct` при `sum == target`, `invalid` при `sum > target`, иначе `partial`
    - _Requirements: 4.3, 4.4, 4.5_

  - [x]* 3.10 Property-тест для classify-bin
    - **Property 7: Compose bin classification matches sum vs target**
    - **Validates: Requirements 4.3, 4.4, 4.5**

- [x] 4. Чистый domain — Parent_Lock и стикеры
  - [x] 4.1 Реализовать генератор Parent_Lock (`src/domain/parent-lock.ts`)
    - `generateParentLockChallenge(rng): ParentLockChallenge` — операнды `a, b ∈ [10, 99]`, операция `mul` или `sub`, корректное вычисление `correctAnswer`
    - Чистая функция-валидатор `isCorrect(challenge, input): boolean`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x]* 4.2 Property-тест для parent-lock
    - **Property 11: Parent lock unlocks iff input matches** (часть про генерацию и валидатор)
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 4.3 Реализовать группировку стикеров (`src/domain/stickers.ts`)
    - `groupByMode(stickers): Record<GameMode, Sticker[]>` — разделение коллекции по режимам без потерь
    - _Requirements: 7.3_

  - [x]* 4.4 Property-тест для stickers grouping
    - **Property 10: Sticker grouping preserves all stickers**
    - **Validates: Requirements 7.3**

- [x] 5. Чекпоинт — domain слой
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. State слой — zustand stores
  - [x] 6.1 Реализовать `useProgressStore` (`src/state/progress-store.ts`)
    - Поля: `stickers`, `difficulty` per mode, `answerWindow` per mode, `compareSubMode`, `compareObjectsCompleted`, `stats`, `manualDifficultyOverride`, `hydrated`
    - Действия: `recordAnswer(mode, outcome)` (вызывает `evaluate` из difficulty-engine и обновляет окно/уровень), `awardSticker`, `setManualDifficulty`, `resetAll`, `hydrate(snapshot)`, `advanceCompareSubMode`
    - Селектор `effectiveLevel(mode) = manualDifficultyOverride[mode] ?? difficulty[mode]`
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 3.3, 7.1, 7.4, 8.5, 8.6, 8.7, 9.1_

  - [x]* 6.2 Property-тест: round completion awards exactly one sticker
    - **Property 9: Round completion awards exactly one sticker**
    - **Validates: Requirements 7.1**

  - [x]* 6.3 Property-тест: `resetAll` очищает stats и stickers
    - **Property 12: Reset clears stats and stickers**
    - **Validates: Requirements 8.7**

  - [x]* 6.4 Property-тест: `advanceCompareSubMode` переключает после 5 заданий
    - **Property 4: Compare sub-mode advances after exactly 5 object tasks**
    - **Validates: Requirements 3.3**

  - [x] 6.5 Реализовать `useSessionStore` (`src/state/session-store.ts`)
    - Эфемерный store: `mode`, `currentQuestion`, `questionIndex` (0..9), `composeBin`, `parentLockChallenge`
    - Действия: `startRound(mode)`, `setCurrentQuestion`, `nextQuestion`, `addTileToBin`, `clearBin`, `setParentLockChallenge`
    - _Requirements: 4.3, 4.4, 4.5, 7.1, 8.1_

- [x] 7. State слой — persistence
  - [x] 7.1 Реализовать сериализацию и валидатор (`src/state/persistence.ts` — функции `serialize`, `deserialize`, `validateSnapshot`)
    - `serialize(state): PersistedSnapshot` — выбор только персистентных полей, исключая `hydrated` и computed
    - `deserialize(snapshot): Partial<ProgressState>` — обратное преобразование
    - `validateSnapshot(value): value is PersistedSnapshot` — проверка version, типов и обязательных полей
    - Константа `STORAGE_KEY = 'kca:progress:v1'`
    - _Requirements: 9.1, 8.6_

  - [x]* 7.2 Property-тест: round-trip сериализация
    - **Property 13: Progress_Store round-trips through serialization**
    - **Validates: Requirements 9.1, 8.6**

  - [x] 7.3 Реализовать debounced AsyncStorage writer (`src/state/persistence.ts` — подписка на store)
    - Подписка на `useProgressStore` через `subscribe`; при `state.hydrated === true` запускать debounce 500мс перед записью
    - `AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(state)))`
    - Hook на `AppState` для синхронного flush при выходе в background
    - _Requirements: 9.2, 7.4_

  - [x]* 7.4 Property-тест: дебаунс сходимости в окне ≤1с
    - **Property 14: Persisted state converges within debounce window**
    - **Validates: Requirements 9.2, 7.4**

  - [x] 7.5 Реализовать `loadSnapshot` (`src/state/persistence.ts` — гидратация)
    - `loadSnapshot(): Promise<PersistedSnapshot | null>` — try/catch вокруг `AsyncStorage.getItem` и `JSON.parse`, валидация через `validateSnapshot`, возврат `null` при любом сбое
    - `defaultSnapshot(): PersistedSnapshot` — стартовое состояние (level=1 для всех режимов, пустые windows, пустая коллекция)
    - _Requirements: 9.3, 9.4_

  - [x]* 7.6 Property-тест: тотальность гидратации
    - **Property 15: Hydration is total**
    - **Validates: Requirements 9.4**

- [x] 8. Audio слой
  - [x] 8.1 Реализовать `Sound_Manifest` (`src/audio/sound-manifest.ts`)
    - Тип `SoundId = 'tap' | 'success' | 'error' | 'session_reward' | 'drag_pickup' | 'drag_drop'`
    - Объект `SOUND_MANIFEST` с записями `{ id, module: require(...) | null, prompt, maxDurationMs }` для каждого ID
    - Промты (Req 11) сохраняются в поле `prompt` каждой записи
    - _Requirements: 10.1, 10.2, 10.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 8.2 Реализовать `SoundAdapter` (`src/audio/sound-adapter.ts`)
    - Класс с методами `preload()`, `play(id: string)`, `unloadAll()`
    - `preload()` параллельно загружает все звуки через `Audio.Sound.createAsync`, ловит ошибки на каждый файл независимо
    - `play(id)` — тотальная: `try/catch` вокруг всего, no-op для невалидного id, отсутствующего `module`, ошибок expo-av
    - Singleton `soundAdapter`
    - _Requirements: 5.2, 5.3, 6.2, 6.4, 7.2, 10.1, 10.3_

  - [x]* 8.3 Property-тест: тотальность `SoundAdapter`
    - **Property 8: Sound adapter is total**
    - **Validates: Requirements 5.3, 10.3**

- [x] 9. Чекпоинт — state и audio
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Базовые UI-компоненты
  - [x] 10.1 Реализовать `PressableButton` (`src/components/PressableButton.tsx`)
    - `Pressable` обёртка с `useSharedValue` scale (0.95↔1.0), `withTiming` 120мс на каждое направление
    - Вызов `soundAdapter.play('tap')` в `onPressIn`
    - Стили из `theme`: `borderRadius >= 20`, минимальный hitSlop / minHeight=64
    - _Requirements: 1.5, 5.1, 5.2, 5.3, 12.4, 12.5_

  - [x] 10.2 Реализовать `NumericText` и `ButtonLabel` (`src/components/NumericText.tsx`, `src/components/ButtonLabel.tsx`)
    - `NumericText` — `Text` с `theme.typography.numeric` (fontSize ≥ 28)
    - `ButtonLabel` — `Text` с `theme.typography.buttonLabel` (fontSize ≥ 18)
    - Цвет текста — `theme.colors.text` (#1A1A2E)
    - _Requirements: 12.3, 12.6_

  - [x] 10.3 Реализовать `Card` и `HomeButton` (`src/components/Card.tsx`, `src/components/HomeButton.tsx`)
    - `Card` — обёртка с `borderRadius >= 20` и фоном из темы
    - `HomeButton` — крупная навигационная кнопка возврата на Home (поверх `PressableButton`)
    - _Requirements: 1.5, 12.1, 12.4_

  - [x] 10.4 Реализовать `ShakeView` (`src/components/ShakeView.tsx`)
    - Обёртка с `useSharedValue` для translateX, метод `shake()` запускает `withSequence` ±8px на 5 шагов по 50мс (~250мс total)
    - _Requirements: 6.3, 6.5_

  - [x] 10.5 Реализовать `ConfettiOverlay` (`src/components/ConfettiOverlay.tsx`)
    - Полноэкранный `LottieView` с `assets/lottie/confetti.json`, `autoPlay`, `loop={false}`, длительность 1–2с
    - Управляется prop'ом `visible` или императивным `play()`
    - `<ErrorBoundary>` фолбэк на статичную иконку (Error Handling из design)
    - _Requirements: 6.1, 6.5_

  - [x] 10.6 Реализовать `RewardOverlay` (`src/components/RewardOverlay.tsx`)
    - Полноэкранный `LottieView` с reward-анимацией ~2с
    - Вызывает `soundAdapter.play('session_reward')` при показе
    - _Requirements: 7.2_

  - [x] 10.7 Реализовать `Tile` и `Bin` (`src/components/Tile.tsx`, `src/components/Bin.tsx`)
    - `Tile` — `Animated.View` с `useSharedValue` для translateX/Y, layout-измерения через `onLayout`
    - `Bin` — drop-zone с измерением bounding box через `onLayout`, визуальное состояние `empty/partial/correct/invalid`
    - Стили из `theme` (borderRadius ≥ 20)
    - _Requirements: 4.2, 4.6, 12.4_

  - [x]* 10.8 Property-тест: компоненты соблюдают детские минимумы
    - **Property 16: Themed UI components honor child-friendly minima**
    - **Validates: Requirements 1.5, 12.4, 12.5, 12.6**

- [x] 11. Игровые хуки (features)
  - [x] 11.1 Реализовать `useArithmeticGame` (`src/features/arithmetic/useArithmeticGame.ts`)
    - Чтение `effectiveLevel` из `useProgressStore`, вызов `rangeFor` и `generateArithmeticQuestion`
    - На ответ: `recordAnswer(mode, outcome)`, анимация Answer_Feedback (confetti для correct, shake+highlight для incorrect)
    - На завершении 10-го вопроса: `awardSticker` и переход к Session_Feedback
    - _Requirements: 2.1, 2.2, 2.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_

  - [x] 11.2 Реализовать `useCompareGame` (`src/features/compare/useCompareGame.ts`)
    - Чтение `compareSubMode` и `compareObjectsCompleted` из стора
    - Генерация вопроса через `generateCompareQuestion(range, recentLabels, rng)` с подходящим `subMode`
    - Инкремент `compareObjectsCompleted` при завершении задания в `objects`; вызов `advanceCompareSubMode()` при достижении 5
    - Те же Answer_Feedback/Session_Feedback что в Arithmetic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4, 7.1_

  - [x] 11.3 Реализовать `useComposeGame` и `useTileGesture` (`src/features/compose/useComposeGame.ts`, `useTileGesture.ts`)
    - `useComposeGame` — генерация puzzle через `generateComposePuzzle`, обработка `addTileToBin`, вызов `classifyBin` на каждое изменение, реакция на `correct`/`invalid` (clear bin при invalid + возврат плиток)
    - `useTileGesture` — `Gesture.Pan()` с `onBegin` (звук `drag_pickup` + `Haptics.selectionAsync()`), `onUpdate` (translate), `onEnd` (hit-test против `binLayout`, при попадании `runOnJS(addTileToBin)` + звук `drag_drop`, при промахе `withSpring` назад)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.1, 6.2, 6.3, 6.4, 7.1_

  - [x] 11.4 Реализовать `useParentLock` (`src/features/parent/useParentLock.ts`)
    - Хранит текущий `ParentLockChallenge` в `useSessionStore`
    - Метод `submit(input)` — при совпадении возвращает `unlocked: true`, при ошибке генерирует новый challenge через `generateParentLockChallenge` и очищает ввод
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 12. Экраны
  - [x] 12.1 Реализовать `HomeScreen` (`src/screens/HomeScreen.tsx`)
    - Три крупные кнопки режимов (Arithmetic, Compare, Compose), кнопка перехода в Sticker_Collection, маленькая кнопка входа в Parent_Section
    - Все на `PressableButton` с иконками/эмодзи и `ButtonLabel`
    - Фон — `theme.colors.background`, переходы вызывают `navigation.navigate(...)` (≤500мс — переход легковесный)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 12.2_

  - [x] 12.2 Реализовать `ArithmeticScreen` (`src/screens/ArithmeticScreen.tsx`)
    - Использует `useArithmeticGame`, рендерит `NumericText` для примера, `PressableButton` обёрнутые в `ShakeView` для опций
    - Подсветка correct/incorrect цветами `theme.colors.correct`/`incorrect`
    - Прогресс раунда (10 точек) сверху
    - `ConfettiOverlay` для правильного ответа, `RewardOverlay` после 10-го вопроса
    - _Requirements: 1.4, 2.1, 2.2, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_

  - [x] 12.3 Реализовать `CompareScreen` (`src/screens/CompareScreen.tsx`)
    - Использует `useCompareGame`; в подрежиме `objects` рендерит две группы эмодзи/иконок, в `digits` — две крупные цифры (`NumericText`)
    - Три фиксированные кнопки `>`, `<`, `=` (`PressableButton` + `ButtonLabel`)
    - Те же overlays и подсветка как в Arithmetic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_

  - [x] 12.4 Реализовать `ComposeScreen` (`src/screens/ComposeScreen.tsx`)
    - Использует `useComposeGame`, `useTileGesture` для каждой плитки
    - `Bin` сверху с visual state (`empty/partial/correct/invalid`), плитки внизу через `Tile`
    - `ConfettiOverlay` при `correct`, shake/возврат плиток при `invalid`
    - `GestureHandlerRootView` оборачивает экран
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_

  - [x] 12.5 Реализовать `StickerCollectionScreen` (`src/screens/StickerCollectionScreen.tsx`)
    - Чтение `stickers` из `useProgressStore`, группировка через `groupByMode`
    - Секционная сетка `FlatList` (`numColumns=3`) на каждый mode
    - Тап по стикеру — scale-анимация и звук `tap` (через `PressableButton`)
    - _Requirements: 7.1, 7.3_

  - [x] 12.6 Реализовать `ParentLockScreen` (`src/screens/ParentLockScreen.tsx`)
    - Использует `useParentLock`; рендерит `NumericText` с задачей (`12 × 7` / `87 − 13`), числовой `TextInput`, кнопку «Готово» (`PressableButton`)
    - При корректном ответе — `navigation.replace('ParentSection')`
    - При неверном — генерация новой задачи и очистка input
    - _Requirements: 1.3, 8.1, 8.2, 8.3_

  - [x] 12.7 Реализовать `ParentSectionScreen` (`src/screens/ParentSectionScreen.tsx`)
    - Карточки статистики (`Card`) на каждый режим: количество rounds, accuracy, текущий Difficulty_Range
    - Сегментированный селектор Difficulty_Range (1–5 / 1–10 / 1–15 / 1–20) — вызывает `setManualDifficulty(mode, level)`
    - Кнопка «Сбросить» с диалогом подтверждения, на confirm — `resetAll()`
    - _Requirements: 8.4, 8.5, 8.6, 8.7_

- [x] 13. Навигация и BootstrapGate
  - [x] 13.1 Реализовать `RootNavigator` (`src/app/RootNavigator.tsx`)
    - `createNativeStackNavigator<RootStackParamList>()` с экранами Home, Arithmetic, Compare, Compose, StickerCollection, ParentLock, ParentSection
    - `screenOptions: { headerShown: false }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.2_

  - [x] 13.2 Реализовать `BootstrapGate` и `SplashScreen` (`src/app/BootstrapGate.tsx`, `src/app/SplashScreen.tsx`)
    - `BootstrapGate` параллельно вызывает `loadSnapshot()` и `soundAdapter.preload()`, затем `hydrate(snapshot ?? defaultSnapshot())`
    - До `hydrated === true` рендерит `SplashScreen`
    - `SplashScreen` — простой экран на `theme.colors.background`
    - _Requirements: 9.3, 9.4, 10.1_

  - [x] 13.3 Собрать `App.tsx` (`src/app/App.tsx`)
    - Провайдеры: `GestureHandlerRootView` → `SafeAreaProvider` → `NavigationContainer` → `BootstrapGate` → `RootNavigator`
    - Подключить persistence-подписку при инициализации (импорт side-effect из `state/persistence.ts`)
    - _Requirements: общая интеграция (1.x, 4.x, 9.x, 10.x)_

- [x] 14. Интеграционные тесты
  - [x]* 14.1 Smoke-тест: `BootstrapGate` гидратирует store до отрисовки Home
    - Проверка: при `hydrated=false` рендерится Splash, при `hydrated=true` — Home
    - **Validates: Requirements 9.3**

  - [x]* 14.2 Интеграционный тест: завершение раунда выдаёт стикер
    - Симулировать 10 ответов в одном из режимов, проверить рост `stickers` ровно на 1 и срабатывание Session_Feedback
    - **Validates: Requirements 7.1, 7.2**

- [x] 15. Финальный чекпоинт
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Задачи с `*` опциональны (тесты) и могут быть пропущены для быстрого MVP, но настоятельно рекомендуются для domain слоя — там 16 property-тестов покрывают универсальные инварианты.
- Каждое property-тестовое задание привязано к одному property из design.md и явно ссылается на проверяемые требования.
- Чистый `domain/` слой не импортирует RN/expo и тестируется в Node — это даёт быстрый прогон fast-check без эмулятора.
- Чекпоинты (5, 9, 15) предназначены для запуска всего набора тестов и сверки с пользователем перед переходом к следующему слою.
- Параллельное выполнение возможно благодаря отсутствию конфликтов по файлам внутри одной волны (см. Task Dependency Graph ниже).
- Поскольку design.md фиксирует TypeScript + React Native + Expo, шаг выбора языка пропущен (правило Fast Task workflow).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "8.1"] },
    { "id": 2, "tasks": ["2.1", "2.2", "3.9", "4.3", "6.5", "8.2", "10.2", "10.4", "10.5", "10.7"] },
    { "id": 3, "tasks": ["2.3", "3.1", "3.5", "3.7", "3.10", "4.1", "4.4", "6.1", "8.3", "10.1", "10.6"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.6", "3.8", "4.2", "6.2", "7.1", "10.3", "11.2", "11.3", "11.4"] },
    { "id": 5, "tasks": ["3.4", "6.3", "7.2", "7.3", "10.8", "11.1", "12.1", "12.3", "12.4", "12.5", "12.6", "12.7"] },
    { "id": 6, "tasks": ["6.4", "7.4", "7.5", "12.2"] },
    { "id": 7, "tasks": ["7.6", "13.1", "13.2"] },
    { "id": 8, "tasks": ["13.3"] },
    { "id": 9, "tasks": ["14.1", "14.2"] }
  ]
}
```
