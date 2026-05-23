# Design Brief — Kids Counting App

Документ для дизайнера. Описывает, что и как нарисовать в Figma, какие иллюстрации и звуки нужны, и в каком виде передать ассеты разработчику. Все размеры — в логических точках (pt) и масштабируются под плотности iOS/Android.

---

## 1. Формат работы в Figma

### Организация файла

Создай **один Figma-файл** с такой структурой страниц:

| Страница | Содержимое |
|---|---|
| `00 — Cover` | Обложка проекта, название, версия, дата |
| `01 — Foundations` | Цвета, типографика, радиусы, отступы, иконки (всё как Styles + Variables) |
| `02 — Components` | Все UI-компоненты как Figma Components с вариантами |
| `03 — Screens` | Финальные макеты экранов (frames) |
| `04 — Flows` | Соединения между экранами стрелками (FigJam-стиль не нужен — достаточно prototype-связей) |
| `05 — Assets to export` | Все растровые/SVG/Lottie-плейсхолдеры, готовые к экспорту |

### Размер фреймов экранов

Целевая аудитория — мобильные устройства (iOS + Android), portrait only. Базовый фрейм:

- **Ширина:** 390 pt (iPhone 14 baseline)
- **Высота:** 844 pt
- Также сделай адаптацию для широкого фрейма 430×932 pt (iPhone 14 Pro Max) — для проверки тянущихся макетов.

Использовать **Auto Layout** везде, где элементы имеют одинаковые отступы. Это упростит передачу разработчику и поможет тебе самой делать варианты.

### Что обязательно как Figma Variables / Styles

- **Color Styles** — все цвета палитры с семантическими именами (`color/background`, `color/primary`, `color/success`, `color/danger`, `color/text`, `color/correct`, `color/incorrect`).
- **Text Styles** — `numeric/large`, `numeric/medium`, `button/label`, `body`, `caption`.
- **Effect Styles** — тени для карточек (мягкая, не больше 4–8% opacity).
- **Variables** — `radius/button` = 24, `radius/card` = 24, `spacing/xs..xl`, `min-touch` = 64. Это разработчик сможет сопоставить со значениями в `theme/index.ts`.

### Что отдать разработчику

- Ссылку на Figma-файл (с режимом Inspect для разработчика).
- Папку `Assets/` с экспортированными ассетами (см. раздел 9).
- Этот документ как чек-лист — отметить каждый экран и компонент после готовности.

---

## 2. Foundations — дизайн-система

### Палитра

| Роль | Hex | Использование |
|---|---|---|
| Background | `#FFF8F0` | Фон **всех** экранов. Никогда не `#FFFFFF`. |
| Primary (Yellow) | `#FFD93D` | Главные CTA, активные кнопки, акценты |
| Success (Mint) | `#6BCB77` | Кнопка/подсветка правильного ответа, иконки прогресса |
| Info (Sky) | `#4D96FF` | Вторичные кнопки, ссылки, инфо-блоки |
| Danger (Coral) | `#FF6B6B` | Подсветка неправильного ответа. **Не пугать**: использовать мягко, не доминирует. |
| Text | `#1A1A2E` | Основной текст, цифры |

Дополнительно создай оттенки (для теней, ховеров, disabled — через Figma Color Styles + tokens):
- `text/secondary` — `#1A1A2E` с opacity 0.6
- `surface/elevated` — `#FFFDF9` (для карточек, чуть светлее фона)
- `border/subtle` — `#1A1A2E` с opacity 0.08

### Типографика

Шрифт: **Nunito** (или **Comfortaa** как альтернатива). Закруглённый, тёплый, читаемый детям. Загружается через Expo Google Fonts на стороне кода — тебе достаточно использовать его в Figma.

| Style | Font Weight | Size (pt) | Line height |
|---|---|---|---|
| `numeric/hero` | 800 | 72 | 80 |
| `numeric/large` | 700 | 48 | 56 |
| `numeric/medium` | 700 | 32 | 40 |
| `button/label` | 600 | 22 | 28 |
| `body` | 400 | 18 | 26 |
| `caption` | 500 | 14 | 18 |

**Минимумы из требований:** цифры ≥ 28pt, подписи кнопок ≥ 18pt. Не нарушать.

### Радиусы и формы

- Кнопки и карточки: `radius/button` = `radius/card` = **24 pt** (не меньше 20).
- «Pill»-кнопки (для маленьких чипов): 999 pt.
- Все интерактивные элементы — **минимум 64×64 pt** тач-зоны (можно с прозрачным паддингом, чтобы визуально кнопка была меньше).

### Отступы (spacing scale)

`xs=4`, `sm=8`, `md=16`, `lg=24`, `xl=32`, `xxl=48`. Дальше использовать кратные.

### Тени

Лёгкая «детская» тень для возвышенных карточек:

```
y-offset: 4
blur: 16
color: #1A1A2E
opacity: 6%
```

Не использовать тяжёлые/глубокие тени — они утяжеляют интерфейс.

---

## 3. Список компонентов (страница `02 — Components`)

Каждый компонент — Figma Component с вариантами через свойство `state` или `variant`.

### 3.1 PressableButton (основная)

**Назначение:** главный CTA на экранах.

- **Размер:** ширина по контенту + min-width 200 pt; высота 80 pt; radius 24.
- **Состояния (variants):** `default`, `pressed` (scale 0.95), `disabled`, `correct` (фон mint), `incorrect` (фон coral).
- **Содержимое:** иконка (опц.) + Text Style `button/label`.
- **Цвет фона по умолчанию:** `primary` (#FFD93D).

### 3.2 ModeCard (карточка режима на Home)

**Назначение:** крупная цветная карточка для запуска одного из 3 режимов.

- **Размер:** 358×140 pt (на 390-фрейме).
- **Variants по mode:** `arithmetic` (mint), `compare` (sky), `compose` (yellow).
- **Содержимое:** крупная иконка/иллюстрация слева (≈100×100 pt), заголовок (`button/label`) и подпись (`body`) справа.
- Лёгкая тень + radius 24.

### 3.3 AnswerOption (кнопка варианта ответа)

**Назначение:** используется в Arithmetic и Compare для вариантов ответа.

- **Размер:** квадрат 96×96 pt (для цифр), либо 110×80 pt для меток (`>`, `<`, `=`).
- **Variants:** `default`, `selected`, `correct`, `incorrect`.
- **Содержимое:** `numeric/large` для цифр, `numeric/hero` для символов сравнения.
- **Подсветка correct/incorrect** — через цвет фона + лёгкая обводка (border 3 pt).

### 3.4 NumericDisplay (большой пример)

**Назначение:** отображение `5 + 3 = ?` в Arithmetic, `7` (target) в Compose, задачи парент-лока.

- Контейнер: прозрачный, центрированный.
- Text Style: `numeric/hero` (72 pt).
- Цвет: `text` (#1A1A2E).

### 3.5 Tile (плитка для Compose)

**Назначение:** перетаскиваемая плитка с числом.

- **Размер:** 80×80 pt, radius 24.
- **Variants:** `idle`, `dragging` (slight scale 1.05 + усиленная тень), `dropped`.
- **Содержимое:** одна цифра, `numeric/large`.
- Цвет фона: чередовать `primary`, `success`, `info` (для визуального разнообразия).

### 3.6 Bin (корзина для Compose)

**Назначение:** drop-zone сверху экрана Compose.

- **Размер:** 320×140 pt, radius 28, border dashed 3 pt.
- **Variants:** `empty` (бледный фон, явный пунктир), `partial` (показывает 1 плитку + знак `+`), `correct` (зелёная подсветка фона + мягкое свечение), `invalid` (коралловая подсветка + shake-кадр).
- **Содержимое:** в `partial` — текущая сумма + плитки внутри.

### 3.7 StickerCard

**Назначение:** карточка одной полученной наклейки в коллекции.

- **Размер:** 100×100 pt, radius 24.
- **Variants:** `arithmetic`, `compare`, `compose` (отличаются иконкой и фоновым цветом).
- **Содержимое:** иллюстрация-стикер по центру (см. Section 4).

### 3.8 ProgressDots (прогресс раунда)

**Назначение:** 10 точек сверху игровых экранов, показывающих текущий вопрос.

- 10 кружков 12×12 pt в ряд, отступ 8 pt.
- **Variants по точке:** `done` (mint, заполненный), `current` (yellow, чуть больше — 16×16), `pending` (`text` с 20% opacity, пустой).

### 3.9 HomeButton (возврат на Home)

**Назначение:** круглая кнопка-домик в углу всех нон-Home экранов.

- 56×56 pt, radius 999, фон `surface/elevated`, иконка домика 32×32 pt в центре, тень.

### 3.10 SegmentedControl (выбор сложности в Parent_Section)

- 4 сегмента: `1–5`, `1–10`, `1–15`, `1–20`. Активный — фон `primary`, текст `text`.
- Высота 56 pt, radius 24.

### 3.11 StatCard (статистика в Parent_Section)

- Карточка 358×120 pt, radius 24, фон `surface/elevated`, лёгкая тень.
- Содержимое: название режима (`button/label`), три ряда: «Раундов: N», «Точность: %», «Уровень: 1–X».

### 3.12 ConfirmDialog (подтверждение сброса)

- Модалка 320×220 pt, radius 28, центрирована.
- Заголовок, текст, две кнопки рядом: «Отмена» (info) и «Сбросить» (danger).

### 3.13 SplashScreen

- Полноэкранный фрейм с фоном `background` и большой иллюстрацией-логотипом по центру (см. промт в разделе 7).

---

## 4. Экраны (страница `03 — Screens`)

Для каждого экрана нарисуй фрейм 390×844, плюс по необходимости — варианты состояний.

### 4.1 Splash

- Полноэкранный фон `#FFF8F0`.
- Логотип/маскот по центру (см. промт ниже), под ним название «Считай-ка» (рабочее, можешь предложить лучше).

### 4.2 Home

```
┌──────────────────────────────────┐
│                          [🔒]    │ ← маленькая parent-кнопка в углу
│         Привет!                  │
│       Чем займёмся?              │
│                                  │
│   ┌──────────────────────────┐   │
│   │ ➕  Сложение и вычитание  │   │ ← ModeCard arithmetic
│   └──────────────────────────┘   │
│   ┌──────────────────────────┐   │
│   │ 🔢  Кто больше?           │   │ ← ModeCard compare
│   └──────────────────────────┘   │
│   ┌──────────────────────────┐   │
│   │ 🧩  Собери число           │   │ ← ModeCard compose
│   └──────────────────────────┘   │
│                                  │
│       ⭐ Мои наклейки             │ ← вторичная кнопка
└──────────────────────────────────┘
```

- Parent-иконка маленькая (40×40 pt), низкоконтрастная, в правом верхнем углу. Намеренно не привлекает внимание ребёнка.
- Заголовок — `numeric/medium` (32 pt), приветственный.

### 4.3 Arithmetic

Состояния (3 фрейма): `idle`, `correct-feedback`, `incorrect-feedback`.

```
┌──────────────────────────────────┐
│ [🏠]            ●●●○○○○○○○        │ ← ProgressDots
│                                  │
│                                  │
│            5  +  3  =  ?         │ ← NumericDisplay (hero 72pt)
│                                  │
│                                  │
│   ┌──────┐  ┌──────┐  ┌──────┐  │
│   │  7   │  │  8   │  │  9   │  │ ← AnswerOption × 3 (или × 4)
│   └──────┘  └──────┘  └──────┘  │
│                                  │
└──────────────────────────────────┘
```

- В `correct-feedback`: правильная кнопка зелёная (`success`), confetti overlay рисуй как отдельный полупрозрачный слой (см. раздел 6).
- В `incorrect-feedback`: выбранная кнопка коралловая (`danger`), без confetti.

### 4.4 Compare — Objects

```
┌──────────────────────────────────┐
│ [🏠]            ●●○○○○○○○○        │
│                                  │
│      🍎 🍎 🍎      🍎 🍎          │ ← две группы объектов
│      🍎 🍎                       │
│                                  │
│   ┌──────┐  ┌──────┐  ┌──────┐  │
│   │  >   │  │  <   │  │  =   │  │ ← фиксированные 3 кнопки
│   └──────┘  └──────┘  └──────┘  │
└──────────────────────────────────┘
```

- Иконки/эмодзи объектов 48×48 pt, разложены сеткой.

### 4.5 Compare — Digits

То же, но вместо групп объектов — две крупные цифры:

```
        7              5
```

- `numeric/hero` (72 pt), две цифры по центру с большим зазором.

### 4.6 Compose

Состояния (4 фрейма): `idle`, `partial` (1 плитка в корзине), `correct`, `invalid`.

```
┌──────────────────────────────────┐
│ [🏠]              Собери: 7      │ ← target в правом углу
│                                  │
│                                  │
│      ╔════════════════════╗      │
│      ║   корзина (Bin)    ║      │
│      ║   [3] + [_]  = 3   ║      │
│      ╚════════════════════╝      │
│                                  │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │
│   │2 │ │3 │ │4 │ │5 │ │6 │ │1 │  │ ← Tile × 6
│   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘  │
└──────────────────────────────────┘
```

- В `correct` — корзина зелёная, confetti overlay.
- В `invalid` — корзина коралловая, плитки в момент возврата (можно показать через Smart Animate в прототипе).

### 4.7 StickerCollection

Состояния: `empty`, `filled`.

```
┌──────────────────────────────────┐
│ [🏠]      Мои наклейки            │
│                                  │
│  Сложение и вычитание            │
│  ┌──┐ ┌──┐ ┌──┐                  │
│  │⭐│ │⭐│ │⭐│                   │ ← StickerCard × N
│  └──┘ └──┘ └──┘                  │
│                                  │
│  Кто больше                      │
│  ┌──┐                            │
│  │⭐│                             │
│  └──┘                            │
│                                  │
│  Собери число                    │
│  (пока пусто)                    │
└──────────────────────────────────┘
```

- В `empty` — большая иллюстрация и текст «Сыграй раунд, чтобы получить первую наклейку!»

### 4.8 ParentLock

```
┌──────────────────────────────────┐
│         Только для взрослых      │
│                                  │
│         Сколько будет?           │
│                                  │
│            12 × 7                │ ← numeric/hero
│                                  │
│        ┌──────────────┐          │
│        │   _____      │          │ ← числовой input
│        └──────────────┘          │
│                                  │
│           [ Готово ]             │ ← PressableButton
└──────────────────────────────────┘
```

- Состояние ошибки: input коралловый border, текст «Попробуй ещё раз», под ним новая задача.

### 4.9 ParentSection

```
┌──────────────────────────────────┐
│ [🏠]         Прогресс             │
│                                  │
│   ┌──────────────────────────┐   │
│   │ Сложение и вычитание     │   │ ← StatCard
│   │ Раундов: 12              │   │
│   │ Точность: 78%            │   │
│   │ Уровень: 1–10            │   │
│   │ ┌───┬───┬───┬───┐        │   │
│   │ │1-5│1-10*│1-15│1-20│    │   │ ← SegmentedControl
│   │ └───┴───┴───┴───┘        │   │
│   └──────────────────────────┘   │
│                                  │
│   (то же для Compare и Compose)  │
│                                  │
│        [ Сбросить прогресс ]     │ ← danger-кнопка
└──────────────────────────────────┘
```

### 4.10 ConfirmDialog (модалка)

Полупрозрачный backdrop + центрированная карточка с двумя кнопками.

---

## 5. Состояния и анимации

В Figma анимации не делаем — только статичные кадры ключевых состояний. Анимации описываются текстом для разработчика и реализуются через Reanimated/Lottie.

| Анимация | Подход | Что нужно от тебя |
|---|---|---|
| Tap-фидбек кнопки (scale 0.95 → 1.0) | Reanimated `withTiming` | — |
| Shake неправильной кнопки (±8 px, 250 мс) | Reanimated `withSequence` | — |
| Конфетти при правильном ответе | **Lottie-файл** | Найти/заказать `.json` (см. раздел 7) |
| Награда после раунда (звезда/трофей) | **Lottie-файл** | Найти/заказать `.json` (см. раздел 7) |
| Плитка летит обратно при промахе | Reanimated `withSpring` | — |
| Confetti / Reward как картинка fallback | На случай если Lottie недоступен — статичный PNG | Сделать статичные кадры конфетти и звезды |

---

## 6. Иконки и иллюстрации

Стиль: **flat illustration**, тёплый, дружелюбный, с лёгкими градиентами в палитре проекта. Без жёстких контуров. Без хоррор-элементов. Округлые формы.

### 6.1 Иконки режимов (для ModeCard и Home)

Размер исходника: 256×256 px (потом экспорт в SVG + 1x/2x/3x PNG).

| Иконка | Назначение |
|---|---|
| `icon-arithmetic` | Знаки `+` и `−` в круге, или счёты |
| `icon-compare` | Двое весов или знак `>` со стрелочками |
| `icon-compose` | Пазл из двух кусочков, складывающийся в число |
| `icon-stickers` | Звезда с блёстками |
| `icon-parent` | Замочек или ключик (нейтральный, не страшный) |
| `icon-home` | Домик с трубой |

### 6.2 Стикеры-награды (3 разновидности, по одной на режим)

Каждый стикер — округлый круглый бейдж 200×200 px с центральной иллюстрацией.

| Стикер | Иллюстрация |
|---|---|
| `sticker-arithmetic` | Звезда с цифрами |
| `sticker-compare` | Два весёлых персонажа на весах |
| `sticker-compose` | Сложенный пазл с улыбкой |

Опционально — добавить вариации внутри одного режима (5–10 разных), чтобы коллекция была разнообразнее. Сейчас — минимум 1 на режим.

### 6.3 Логотип / маскот

Иллюстрация ~400×400 px для Splash и empty-state на StickerCollection. Дружелюбный персонаж-зверёк (медвежонок, лисёнок, котёнок) с цифрой или счётами.

### 6.4 Объекты для Compare-Objects подрежима

Набор простых иллюстраций, которые группируются для визуального счёта. Уже подготовлены 5 объектов в `assets/compose-objects/`:

- 🍎 `apple.png` — яблоко
- ⭐ `star.png` — звёздочка
- 🐝 `bee.png` — пчёлка
- � `ship.png` — кораблик
- 🎈 `balloon.png` — шарик

Используем готовые PNG. Если нужно расширение набора — повторить тот же визуальный стиль.

---

## 7. Фон экранов — атмосфера и идеи

### Визуальная концепция

Базовое направление — **тёплый жёлто-золотистый** настрой. Сплошной кремовый `#FFF8F0` тоже работает, но детям интереснее, когда фон «живой». Решение — добавить **второй слой** поверх базового кремового: лёгкий паттерн или мягкий градиент с золотистым оттенком и редкими декоративными элементами.

Принципы фона, чтобы он не мешал контенту:

- **Тонкий**: opacity элементов ≤ 12%, чтобы фон оставался фоном, а не доминировал.
- **Не раздражает**: никаких контрастных линий, ярких пятен прямо под кнопками.
- **Безопасные зоны**: под текстом и кнопками паттерн либо разрежается, либо смягчается через мягкий vignette.
- **Один общий фон** на все экраны (для целостности), но допустимы локальные акценты — например, на экране успеха фон чуть «золотее».

### 6 концепций фона

#### Концепция A — «Звёздное небо» (рекомендуется)

Кремовый фон + редкие крошечные звёздочки и точки в палитре, как мягкое мерцание. Создаёт «магическую» атмосферу обучения. Хорошо сочетается с маскотом и Sticker_Collection.

```
Seamless tileable kids app background pattern, soft warm cream base color #FFF8F0,
sparse scattered tiny stars and dots in golden yellow #FFD93D, mint #6BCB77 and
sky blue #4D96FF, all elements at low opacity (8-12%), very minimal density
(approximately 1 element per 80x80 area), rounded soft shapes, no outlines,
flat illustration style, gentle and not distracting, 1024x1024 seamless tile
```

#### Концепция B — «Золотистый sunburst»

Радиальный градиент из мягкого золотистого `#FFD93D` (центр-верх, opacity 15%) к базовому кремовому по краям. Плюс едва заметные лучи-«солнце» из верхней части экрана. Создаёт ощущение тёплого утра.

```
Mobile app background, vertical 1080x2340, soft golden radial gradient,
center top warm yellow #FFD93D at 15% opacity fading smoothly to warm cream
#FFF8F0 at the bottom, very subtle sun rays radiating from top center at 5% opacity,
no harsh edges, no strong contrast, flat minimal style, kids friendly, no text
```

#### Концепция C — «Парящие математические дудлы»

Очень бледные знаки `+`, `−`, `=`, цифры 1–9 разбросаны по фону, opacity 6–8%. Образовательная атмосфера, ненавязчиво намекает на тему приложения.

```
Seamless tileable pattern for kids math app background, base color warm cream
#FFF8F0, scattered hand-drawn doodle math symbols (plus, minus, equals signs,
digits 1 to 9) in golden #FFD93D at 8% opacity, very sparse density
(2-3 symbols per 200x200 area), rounded friendly font style, no outlines,
playful and educational, 1024x1024 seamless tile
```

#### Концепция D — «Облачка и солнце»

Крупная мягкая иллюстрация: половинка солнца внизу справа + 2–3 пушистых облачка сверху, всё на базовом кремовом. Не повторяющаяся, статичная full-screen иллюстрация. Хороша для Splash и Home, а на игровых экранах можно использовать упрощённую версию (просто облака сверху).

```
Mobile app full-screen background illustration 1080x2340, warm cream #FFF8F0 base,
soft golden sun half-rising from bottom right corner in #FFD93D, two or three
fluffy rounded clouds at the top in pure white with subtle sky blue #4D96FF tint,
flat illustration style, no outlines, very gentle and warm, no text, lots of
empty space in the center for UI content, kids app
```

#### Концепция E — «Органические золотые блобы»

Современный подход: 2–3 крупные размытые цветные «капли» (blur 80–120 px) в палитре `#FFD93D`, `#6BCB77`, `#4D96FF`, opacity 10–15%, расположенные за зонами без UI. Минимализм + теплота.

```
Mobile app abstract background 1080x2340, warm cream base #FFF8F0, three large
soft blurred organic blobs in golden yellow #FFD93D, mint green #6BCB77 and sky
blue #4D96FF, heavy gaussian blur (radius 100px), each blob at 12% opacity,
positioned in corners away from center, no hard edges, modern minimal aesthetic,
calm and warm atmosphere, no text
```

#### Концепция F — «Конфетти-точки»

Мягкий праздничный паттерн: маленькие круглые точки разных цветов палитры, расставлены без агрессивных скоплений. Для Sticker_Collection и экрана награды — отлично; на игровых экранах opacity придётся ещё снизить.

```
Seamless tileable confetti dot pattern, warm cream background #FFF8F0, scattered
small circles 8-16px in palette (yellow #FFD93D, mint #6BCB77, sky #4D96FF,
coral #FF6B6B), all dots at 10% opacity, very sparse and irregular distribution
(roughly 1 dot per 60x60 area), no outlines, festive but calm, kids app,
1024x1024 seamless tile
```

### Финальное решение по фонам

| Где | Фон |
|---|---|
| Splash, Home, ParentLock, ParentSection, StickerCollection | **B (sunburst)** — чистый золотисто-жёлтый градиент сверху → кремовый к низу |
| Игровые экраны (Arithmetic, Compare, Compose) | **B + C (math doodles)** — на градиенте лежит редкий полупрозрачный паттерн со знаками `+`, `−`, `=` и цифрами 1–9, opacity 6–8% |
| Экран завершения раунда (Session_Feedback overlay) | **B + F (confetti dots, animated)** — поверх градиента слегка двигающиеся конфетти-точки в палитре |

Концепция B реализуется через `expo-linear-gradient`, никакой картинки не нужно.
Концепции C и F — через PNG-паттерн в `assets/backgrounds/` + лёгкая параллакс/floating-анимация на reanimated (для F).

### Технические требования к фону

| Что | Формат | Размер | Куда |
|---|---|---|---|
| Tileable паттерн (концепции A, C, F) | PNG | 512×512 (с tiling в коде) | `assets/backgrounds/pattern-*.png` |
| Полноэкранная иллюстрация (концепции D) | PNG @1x/2x/3x | 1080×2340 (3x base) | `assets/backgrounds/scene-*.png` |
| Градиент (концепция B) | в коде через `expo-linear-gradient` | — | без файла |
| Размытые блобы (концепция E) | SVG или PNG | по экрану | `assets/backgrounds/blob-*.png` |

Naming: `bg-pattern-stars.png`, `bg-scene-clouds.png`, `bg-blob-yellow.png` и т.д.

### Локальные акценты на отдельных экранах

- **Splash**: B (sunburst-градиент), маскот по центру.
- **Home**: B.
- **Игровые экраны** (Arithmetic / Compare / Compose): B + C — градиент + математические дудлы поверх, opacity 6–8%.
- **Session reward overlay**: B + F — конфетти-точки слегка двигаются (floating-анимация), Lottie reward поверх.
- **StickerCollection**: B.
- **ParentLock / ParentSection**: B (нейтрально, без дудлов).

---

## 8. Промты для звуков

Звуки — короткие, мягкие, без резких высоких частот. Без негативной окраски в звуке ошибки. Все идентификаторы должны совпадать с `Sound_Manifest` в коде (см. `audio/sound-manifest.ts`).

| ID | Использование | Длительность | Промт |
|---|---|---|---|
| `tap` | Звук тапа по любой кнопке | до 200 мс | `Short soft UI tap sound, like a small wooden block click or a coin chime, no harsh highs, child-friendly, 200ms, mono, 44.1kHz` |
| `success` | Правильный ответ | 0.8–1.5 с | `Cheerful kids success sound, ascending xylophone or glockenspiel melody of 2-3 notes (C-E-G), warm and friendly, no synth harshness, 1 second, mono, 44.1kHz` |
| `error` | Неправильный ответ | до 500 мс | `Neutral soft error sound for kids, low wooden tone or short gentle "uh-oh" voice, no harsh frequencies, no negative or scary tone, 400ms, mono, 44.1kHz` |
| `session_reward` | Завершение раунда (10/10) | 1.5–2.5 с | `Joyful kids fanfare with bells and soft brass, ascending celebratory melody, 2 seconds, warm and bright, no aggressive synths, mono, 44.1kHz` |
| `drag_pickup` | Поднял плитку (Compose) | до 150 мс | `Light "pop" or wooden tap sound when picking up a tile, very short and soft, 120ms, mono, 44.1kHz` |
| `drag_drop` | Положил плитку в корзину | до 200 мс | `Soft click or gentle landing sound when dropping a tile into a bin, like a small wooden "tock", 180ms, mono, 44.1kHz` |

### Где искать

- [Freesound.org](https://freesound.org/) — фильтр по CC0 / CC-BY.
- [Mixkit](https://mixkit.co/free-sound-effects/) — бесплатные эффекты.
- [ZapSplat](https://www.zapsplat.com/) — бесплатно с регистрацией.
- Генерация: ElevenLabs Sound Effects (по этим же промтам).

### Технические требования

- Формат: **MP3** (предпочтительно) или **AAC**, ~128 kbps. WAV для разработки можно, но в продакшене лучше MP3.
- Mono (моно).
- Частота 44.1 kHz.
- Нормализация: -6 dB peak (не громче).
- Имя файла должно совпадать с ID: `tap.mp3`, `success.mp3`, `error.mp3`, `session_reward.mp3`, `drag_pickup.mp3`, `drag_drop.mp3`.
- Кладутся в `assets/audio/`.

---

## 9. Структура `assets/` (текущее состояние)

Папка `assets/` уже собрана в корне проекта:

```
assets/
├── audio/
│   ├── drag_drop.mp3
│   ├── drag_pickup.mp3
│   ├── error.mp3
│   ├── session_reward.mp3
│   ├── success.mp3
│   └── tap.mp3
├── compose-objects/
│   ├── apple.png
│   ├── balloon.png
│   ├── bee.png
│   ├── ship.png
│   └── star.png
├── icons/
│   ├── icon-arithmetic.png
│   ├── icon-compare.png
│   ├── icon-compose.png
│   ├── icon-home.png
│   ├── icon-parent.png
│   └── icon-stickers.png
├── illustrations/
│   └── mascot.png
├── lottie/
│   ├── confetti.lottie
│   └── reward.lottie
└── stickers/
    ├── sticker-arithmetic.png
    ├── sticker-compare.png
    └── sticker-compose.png
```

### Что осталось добавить (из раздела 7 — фоны)

После выбора концепции фона добавить новую папку:

```
assets/
└── backgrounds/
    ├── bg-pattern-stars.png       ← если выбрали концепцию A
    ├── bg-scene-clouds.png        ← если выбрали концепцию D
    └── bg-blob-yellow.png и т.д.  ← если выбрали концепцию E
```

Концепция B (sunburst-градиент) реализуется через `expo-linear-gradient` без файлов.

### Замечания по форматам

- Иконки сейчас в **PNG** — это работает. Если будет нужна острота на больших экранах (Pro Max, планшеты), позже можно заменить на **SVG** через `react-native-svg`. Не блокер.
- Lottie — формат **`.lottie`** (новый, dotLottie). Поддерживается `lottie-react-native` начиная с v6+. Если возникнут проблемы — можно конвертировать в `.json` через [LottieFiles converter](https://lottiefiles.com/tools/lottie-to-dotlottie).
- Все звуки в `.mp3` — соответствует ожиданиям `expo-av` и манифеста.

### Чек-лист дизайна (Figma + Assets)

- [x] Аудио — все 6 файлов в `assets/audio/`
- [x] Иконки UI — 6 PNG в `assets/icons/`
- [x] Стикеры-награды — 3 PNG в `assets/stickers/`
- [x] Маскот — `mascot.png` в `assets/illustrations/`
- [x] Объекты Compare — 5 PNG в `assets/compose-objects/`
- [x] Lottie — `confetti.lottie` и `reward.lottie` в `assets/lottie/`
- [ ] Фоны — выбрать концепцию из раздела 7 и добавить файлы в `assets/backgrounds/`
- [ ] Все экраны нарисованы в Figma (Splash, Home, Arithmetic ×3, Compare-Objects, Compare-Digits, Compose ×4, StickerCollection ×2, ParentLock ×2, ParentSection, ConfirmDialog)
- [ ] Color и Text Styles в Figma названы как в разделе 2
- [ ] Все компоненты из раздела 3 нарисованы со всеми состояниями
- [ ] Лицензии используемых ассетов зафиксированы (CC0 / CC-BY / собственные)

---

## 10. Что обсудить с разработчиком

После первого захода в Figma пройтись по списку и согласовать:

1. **Точные размеры тач-зон** в коде vs визуальные размеры в макете (могут отличаться — визуальная кнопка 56 pt, но тач-зона расширена до 64).
2. **Какие иконки идут как SVG, а какие — как PNG @1x/2x/3x.** SVG предпочтительнее для UI-иконок, PNG — для иллюстраций со сложными градиентами.
3. **Lottie-файлы** — какой объём тебе придётся передать (при большом весе можно сократить количество кадров).
4. **Шрифт** — используем ли мы Nunito через Expo Google Fonts или системный шрифт. Если системный — закрепить на iOS/Android и проверить детский look.
5. **Адаптация под планшеты** — пока рассчитан только на телефон, но если внезапно понадобится планшет, обсудить заранее.
