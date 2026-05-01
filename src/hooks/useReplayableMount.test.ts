import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReplayableMount } from './useReplayableMount';

describe('useReplayableMount', () => {
  it('starts with a stable initial key', () => {
    const { result } = renderHook(() => useReplayableMount());
    expect(typeof result.current.key).toBe('number');
    expect(result.current.key).toBe(0);
  });

  it('bumps the key when replay() is called', () => {
    const { result } = renderHook(() => useReplayableMount());
    const initial = result.current.key;
    act(() => {
      result.current.replay();
    });
    expect(result.current.key).not.toBe(initial);
    expect(result.current.key).toBe(initial + 1);
  });

  it('returns a stable replay reference across renders', () => {
    const { result, rerender } = renderHook(() => useReplayableMount());
    const firstReplay = result.current.replay;
    rerender();
    expect(result.current.replay).toBe(firstReplay);
  });

  it('produces a strictly monotonic key sequence on repeated replays', () => {
    const { result } = renderHook(() => useReplayableMount());
    const seen: number[] = [result.current.key];
    for (let i = 0; i < 5; i++) {
      act(() => result.current.replay());
      seen.push(result.current.key);
    }
    // Strictly increasing — guarantees React sees a new `key` every time
    // so the animated child always remounts.
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    }
  });
});
