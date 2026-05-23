/**
 * useGameMusicVolume — на mount экрана приглушает фоновую музыку,
 * на unmount возвращает нормальную громкость.
 *
 * Используется в игровых экранах (Arithmetic / Compare / Compose),
 * чтобы во время игры музыка не отвлекала от заданий.
 */

import { useEffect } from 'react';

import {
  backgroundMusic,
  BG_VOLUME_NORMAL,
  BG_VOLUME_QUIET,
} from '../audio/background-music';

export function useGameMusicVolume(): void {
  useEffect(() => {
    void backgroundMusic.setVolume(BG_VOLUME_QUIET);
    return () => {
      void backgroundMusic.setVolume(BG_VOLUME_NORMAL);
    };
  }, []);
}
