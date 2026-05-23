// Sound_Manifest — единая точка правды для звуковых ассетов приложения.
//
// Манифест реализован как TS-объект (а не JSON), потому что Metro bundler
// требует статические `require(...)` для упаковки бинарных ассетов:
// динамическая подгрузка по строковому пути в Expo для аудио из bundle
// не работает.
//
// Замена аудиофайла = подмена файла в `assets/audio/` + правка одной
// строки `require(...)` ниже. Никаких изменений в логике приложения
// при этом не требуется (см. Requirement 10).

export type SoundId =
  | 'tap'
  | 'success'
  | 'error'
  | 'session_reward'
  | 'drag_pickup'
  | 'drag_drop';

export interface SoundManifestEntry {
  id: SoundId;
  /** Результат `require(...)` для ассета или `null`, если файл отсутствует. */
  module: number | null;
  /** Описание звука для дизайнера/поиска ассетов (Requirement 11). */
  prompt: string;
  /** Целевая максимальная длительность звука, мс. */
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
