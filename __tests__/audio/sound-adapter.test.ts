// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: { replayAsync: jest.fn().mockResolvedValue(undefined), unloadAsync: jest.fn().mockResolvedValue(undefined) },
      }),
    },
  },
}));

import fc from 'fast-check';
import { soundAdapter } from '../../src/audio/sound-adapter';

describe('Property 8: SoundAdapter is total', () => {
  it('play() never throws for any string id', async () => {
    await fc.assert(fc.asyncProperty(fc.string(), async (id) => {
      await expect(soundAdapter.play(id)).resolves.not.toThrow();
    }));
  });

  it('play() never throws for valid sound ids', async () => {
    const ids = ['tap', 'success', 'error', 'session_reward', 'drag_pickup', 'drag_drop'];
    for (const id of ids) {
      await expect(soundAdapter.play(id)).resolves.not.toThrow();
    }
  });

  it('play() never throws for empty string', async () => {
    await expect(soundAdapter.play('')).resolves.not.toThrow();
  });

  it('play() never throws for unknown id', async () => {
    await expect(soundAdapter.play('nonexistent_sound_xyz')).resolves.not.toThrow();
  });
});
