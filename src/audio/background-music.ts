/**
 * BackgroundMusicAdapter — фоновая зацикленная музыка.
 *
 * Контракт:
 *  - `start()` — запустить трек на repeat. Идемпотентно: повторный
 *    вызов не создаёт второй экземпляр.
 *  - `stop()` — остановить и выгрузить.
 *  - `setVolume(level)` — плавно меняет громкость 0..1. Используется
 *    для приглушения музыки на игровых экранах (level=0.25)
 *    относительно главного экрана (level=0.6).
 *
 * Все методы тотальные — никогда не бросают, чтобы отсутствие файла
 * или ошибка expo-av не валили приложение.
 */

import { Audio, type AVPlaybackStatus } from 'expo-av';

import { SOUND_MANIFEST } from './sound-manifest';

/** Громкость на главных экранах (Home, Sticker, Splash и т.д.). */
export const BG_VOLUME_NORMAL = 0.6;
/** Приглушённая громкость во время игры. */
export const BG_VOLUME_QUIET = 0.25;
/** Полностью выключено (например, в Parent_Section). */
export const BG_VOLUME_MUTE = 0;

class BackgroundMusicAdapter {
  private sound: Audio.Sound | null = null;
  private currentVolume = BG_VOLUME_NORMAL;
  private starting = false;

  async start(): Promise<void> {
    if (this.sound !== null || this.starting) return;
    this.starting = true;
    try {
      const entry = SOUND_MANIFEST.background;
      if (!entry?.module) return;

      const { sound } = await Audio.Sound.createAsync(
        entry.module,
        {
          shouldPlay: true,
          isLooping: true,
          volume: this.currentVolume,
        },
      );
      this.sound = sound;
    } catch {
      // тихо проглатываем — фоновая музыка не критична
    } finally {
      this.starting = false;
    }
  }

  async stop(): Promise<void> {
    const s = this.sound;
    this.sound = null;
    if (s === null) return;
    try {
      await s.stopAsync().catch(() => null);
      await s.unloadAsync().catch(() => null);
    } catch {
      // ничего
    }
  }

  async setVolume(level: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, level));
    this.currentVolume = clamped;
    const s = this.sound;
    if (s === null) return;
    try {
      await s.setVolumeAsync(clamped);
    } catch {
      // ничего
    }
  }

  /** Текущий статус — для отладки/тестов. */
  async getStatus(): Promise<AVPlaybackStatus | null> {
    if (this.sound === null) return null;
    try {
      return await this.sound.getStatusAsync();
    } catch {
      return null;
    }
  }
}

export const backgroundMusic = new BackgroundMusicAdapter();
