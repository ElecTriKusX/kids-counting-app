import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          replayAsync: jest.fn(),
          unloadAsync: jest.fn(),
          stopAsync: jest.fn(),
          setVolumeAsync: jest.fn(),
          getStatusAsync: jest.fn().mockResolvedValue({}),
        },
      }),
    },
  },
}));

// Mock the sound adapter so preload() resolves immediately
jest.mock('../../src/audio/sound-adapter', () => ({
  soundAdapter: {
    preload: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock background music
jest.mock('../../src/audio/background-music', () => ({
  backgroundMusic: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    setVolume: jest.fn().mockResolvedValue(undefined),
  },
  BG_VOLUME_NORMAL: 0.6,
  BG_VOLUME_QUIET: 0.25,
  BG_VOLUME_MUTE: 0,
}));

// Mock fonts hook so it returns true immediately (тесту не нужно ждать загрузки)
jest.mock('../../src/hooks/useAppFonts', () => ({
  useAppFonts: () => true,
  getNunitoFamily: () => 'System',
}));

// Mock AppState
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Override SplashScreen to use our stub
jest.mock('../../src/app/SplashScreen', () => {
  const RN = require('react-native');
  const ReactLib = require('react');
  return () =>
    ReactLib.createElement(RN.Text, { testID: 'splash-screen' }, 'Splash');
});

import BootstrapGate from '../../src/app/BootstrapGate';

const HomeStub = () => <Text testID="home-screen">Home</Text>;

describe('Smoke test 14.1: BootstrapGate hydrates store before rendering Home', () => {
  // Splash минимально 5 секунд — используем real timers с короткими await,
  // чтобы Promise.all с асинхронными моками разрешился корректно.
  it('shows splash initially, then renders children after hydration', async () => {
    const { getByTestId, queryByTestId } = render(
      <BootstrapGate>
        <HomeStub />
      </BootstrapGate>,
    );

    // Initially shows splash
    expect(getByTestId('splash-screen')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();

    // Ждём 5+ секунд реального времени (мин. длительность splash)
    await waitFor(
      () => {
        expect(queryByTestId('splash-screen')).toBeNull();
        expect(getByTestId('home-screen')).toBeTruthy();
      },
      { timeout: 8000 },
    );
  }, 12000);
});
