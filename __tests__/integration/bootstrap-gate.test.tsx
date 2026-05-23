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
    Sound: { createAsync: jest.fn().mockResolvedValue({ sound: { replayAsync: jest.fn(), unloadAsync: jest.fn() } }) },
  },
}));

// Mock the sound adapter so preload() resolves immediately
jest.mock('../../src/audio/sound-adapter', () => ({
  soundAdapter: { preload: jest.fn().mockResolvedValue(undefined) },
}));

// Mock AppState
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

import BootstrapGate from '../../src/app/BootstrapGate';

const HomeStub = () => <Text testID="home-screen">Home</Text>;

// Override SplashScreen to use our stub
jest.mock('../../src/app/SplashScreen', () => {
  const { Text } = require('react-native');
  return () => <Text testID="splash-screen">Splash</Text>;
});

describe('Smoke test 14.1: BootstrapGate hydrates store before rendering Home', () => {
  it('shows splash initially, then renders children after hydration', async () => {
    const { getByTestId, queryByTestId } = render(
      <BootstrapGate>
        <HomeStub />
      </BootstrapGate>
    );

    // Initially shows splash (hydrated=false)
    expect(getByTestId('splash-screen')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();

    // After hydration, shows children
    await waitFor(() => {
      expect(queryByTestId('splash-screen')).toBeNull();
      expect(getByTestId('home-screen')).toBeTruthy();
    }, { timeout: 3000 });
  });
});
