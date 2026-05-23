import { serialize, deserialize, validateSnapshot, defaultSnapshot, loadSnapshot } from '../../src/state/persistence';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock AppState
jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Property 13: Serialization round-trip', () => {
  it('defaultSnapshot round-trips through serialize/validateSnapshot', () => {
    const snap = defaultSnapshot();
    const json = JSON.stringify(snap);
    const parsed = JSON.parse(json);
    expect(validateSnapshot(parsed)).toBe(true);
  });

  it('validateSnapshot rejects null', () => {
    expect(validateSnapshot(null)).toBe(false);
  });

  it('validateSnapshot rejects wrong version', () => {
    const snap = { ...defaultSnapshot(), version: 2 };
    expect(validateSnapshot(snap)).toBe(false);
  });

  it('validateSnapshot rejects missing stickers', () => {
    const { stickers: _, ...snap } = defaultSnapshot();
    expect(validateSnapshot(snap)).toBe(false);
  });
});

describe('Property 15: Hydration is total', () => {
  const mockedGetItem = AsyncStorage.getItem as jest.Mock;

  it('returns null when AsyncStorage is empty', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    const result = await loadSnapshot();
    expect(result).toBeNull();
  });

  it('returns null on malformed JSON', async () => {
    mockedGetItem.mockResolvedValueOnce('not-json{{{');
    const result = await loadSnapshot();
    expect(result).toBeNull();
  });

  it('returns null on schema mismatch', async () => {
    mockedGetItem.mockResolvedValueOnce(JSON.stringify({ version: 99 }));
    const result = await loadSnapshot();
    expect(result).toBeNull();
  });

  it('returns valid snapshot when data is correct', async () => {
    const snap = defaultSnapshot();
    mockedGetItem.mockResolvedValueOnce(JSON.stringify(snap));
    const result = await loadSnapshot();
    expect(result).not.toBeNull();
    expect(result?.version).toBe(1);
  });
});
