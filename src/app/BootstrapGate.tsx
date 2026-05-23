import React, { useEffect } from 'react';
import { useProgressStore } from '../state/progress-store';
import { loadSnapshot, defaultSnapshot } from '../state/persistence';
import { soundAdapter } from '../audio/sound-adapter';
import SplashScreen from './SplashScreen';

interface Props { children: React.ReactNode }

export default function BootstrapGate({ children }: Props) {
  const hydrated = useProgressStore((s) => s.hydrated);
  const hydrate = useProgressStore((s) => s.hydrate);

  useEffect(() => {
    (async () => {
      const [snapshot] = await Promise.all([
        loadSnapshot(),
        soundAdapter.preload(),
      ]);
      hydrate(snapshot ?? defaultSnapshot());
    })();
  }, [hydrate]);

  if (!hydrated) return <SplashScreen />;
  return <>{children}</>;
}
