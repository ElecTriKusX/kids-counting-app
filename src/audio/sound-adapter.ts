// SoundAdapter — тонкая обёртка над `expo-av`, инкапсулирующая загрузку и
// воспроизведение звуков из `Sound_Manifest`.
//
// Ключевой контракт адаптера: метод `play(id)` тотален — он не должен
// бросать исключений ни при каких входных данных:
//   - `id` отсутствует в `SOUND_MANIFEST` → no-op;
//   - запись в манифесте есть, но `module === null` (файл удалён) → no-op;
//   - загрузка через `Audio.Sound.createAsync` упала с ошибкой → no-op;
//   - повторное воспроизведение через `replayAsync` упало → no-op;
//   - любая другая ошибка `expo-av` → no-op.
//
// Это поведение задано требованиями 5.3 и 10.3 и проверяется property-тестом
// «Property 8: Sound adapter is total».
//
// Контекст:
//   - Manifest хранит результат `require(...)` ассета как `module: number | null`.
//   - `Audio.Sound.createAsync(module, options)` принимает значение `require(...)`.
//   - `replayAsync()` мгновенно перезапускает уже загруженный звук — это
//     дешевле, чем заново вызывать `createAsync` на каждый тап.

import { Audio } from 'expo-av';

import { SOUND_MANIFEST, SoundId } from './sound-manifest';

class SoundAdapter {
  /** Кеш загруженных `Audio.Sound` инстансов по идентификатору звука. */
  private cache: Partial<Record<SoundId, Audio.Sound>> = {};

  /**
   * Промисы, ожидающие завершения первичной загрузки звука. Нужны, чтобы
   * параллельные вызовы `play(id)` до завершения `createAsync` не приводили
   * к гонке и многократной загрузке одного и того же ассета.
   */
  private loadingPromises: Partial<Record<SoundId, Promise<Audio.Sound | null>>> = {};

  /**
   * Параллельно загружает все звуки манифеста. Ошибки загрузки отдельных
   * файлов проглатываются — итоговый промис всегда успешно резолвится,
   * чтобы `BootstrapGate` мог продолжить инициализацию приложения.
   *
   * Перед загрузками настраивает аудио-режим: воспроизведение в silent-режиме
   * на iOS и duck-режим на Android — звуковые эффекты приложения должны
   * звучать поверх любых других источников звука и не блокироваться
   * системным mute-переключателем.
   */
  async preload(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
    } catch {
      // Конфигурация аудио-режима не критична — продолжаем без неё.
    }

    const ids = Object.keys(SOUND_MANIFEST) as SoundId[];
    await Promise.all(ids.map((id) => this.load(id).catch(() => null)));
  }

  /**
   * Загружает один звук, кеширует его и возвращает `Audio.Sound`.
   * Возвращает `null`, если в манифесте отсутствует модуль или загрузка
   * упала с ошибкой. Повторные вызовы с тем же `id` либо возвращают
   * уже закешированный инстанс, либо ждут завершения текущей загрузки.
   */
  private async load(id: SoundId): Promise<Audio.Sound | null> {
    const cached = this.cache[id];
    if (cached) return cached;

    const inFlight = this.loadingPromises[id];
    if (inFlight) return inFlight;

    const entry = SOUND_MANIFEST[id];
    const module = entry?.module;
    if (module == null) return null;

    const promise = (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(module, {
          shouldPlay: false,
        });
        this.cache[id] = sound;
        return sound;
      } catch {
        return null;
      } finally {
        delete this.loadingPromises[id];
      }
    })();

    this.loadingPromises[id] = promise;
    return promise;
  }

  /**
   * Тотально безопасное воспроизведение звука по идентификатору.
   *
   * Сигнатура принимает произвольную строку (не `SoundId`), потому что
   * id может прийти из конфигурации/нетипизированного источника —
   * адаптер обязан корректно обработать любое значение.
   */
  async play(id: string): Promise<void> {
    try {
      if (!Object.prototype.hasOwnProperty.call(SOUND_MANIFEST, id)) {
        return;
      }
      const sound = await this.load(id as SoundId);
      if (!sound) return;
      await sound.replayAsync();
    } catch {
      // Тихо проглатываем любые ошибки expo-av — Req 5.3, 10.3.
    }
  }

  /**
   * Освобождает все загруженные ресурсы. Используется при необходимости
   * сбросить аудио-кеш (например, в тестах или при переключении профиля).
   */
  async unloadAll(): Promise<void> {
    const sounds = Object.values(this.cache);
    await Promise.all(
      sounds.map((sound) => {
        if (!sound) return null;
        return sound.unloadAsync().catch(() => null);
      }),
    );
    this.cache = {};
    this.loadingPromises = {};
  }
}

export { SoundAdapter };

/** Singleton-инстанс адаптера, используемый по всему приложению. */
export const soundAdapter = new SoundAdapter();
