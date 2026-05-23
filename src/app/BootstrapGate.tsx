/**
 * BootstrapGate — гейт, который держит SplashScreen пока:
 *  - грузится Progress_Store snapshot
 *  - предзагружаются звуковые эффекты
 *  - загружаются шрифты Nunito
 *  - проходит минимум 5 секунд (для приятного появления splash)
 *
 * Также при готовности всего:
 *  - Запускает фоновую музыку (на repeat, normal volume).
 */

import React, { useEffect, useState } from 'react';

import { useProgressStore } from '../state/progress-store';
import { loadSnapshot, defaultSnapshot } from '../state/persistence';
import { soundAdapter } from '../audio/sound-adapter';
import { backgroundMusic, BG_VOLUME_NORMAL } from '../audio/background-music';
import { useAppFonts } from '../hooks/useAppFonts';
import SplashScreen from './SplashScreen';

interface Props {
  children: React.ReactNode;
}

const SPLASH_MIN_DURATION_MS = 5_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function BootstrapGate({ children }: Props) {
  const hydrated = useProgressStore((s) => s.hydrated);
  const hydrate = useProgressStore((s) => s.hydrate);
  const fontsLoaded = useAppFonts();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        (async () => {
          const snapshot = await loadSnapshot();
          if (cancelled) return;
          hydrate(snapshot ?? defaultSnapshot());
        })(),
        soundAdapter.preload(),
        sleep(SPLASH_MIN_DURATION_MS),
      ]);
      if (cancelled) return;
      setSplashDone(true);

      // Запускаем фоновую музыку после того, как пользователь увидит Home
      void backgroundMusic.start();
      void backgroundMusic.setVolume(BG_VOLUME_NORMAL);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = hydrated && fontsLoaded && splashDone;
  if (!ready) return <SplashScreen />;
  return <>{children}</>;
}
