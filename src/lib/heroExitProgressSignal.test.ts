/**
 * Hero exit-progress signal — pub/sub correctness guard.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  publishHeroExitProgress,
  clearHeroExitProgress,
  readHeroExitProgress,
  subscribeHeroExitProgress,
} from './heroExitProgressSignal';

describe('heroExitProgressSignal', () => {
  beforeEach(() => clearHeroExitProgress());

  it('publishes and reads the latest value', () => {
    publishHeroExitProgress(0.42);
    expect(readHeroExitProgress()).toBe(0.42);
  });

  it('clamps published values to [0, 1]', () => {
    publishHeroExitProgress(-0.5);
    expect(readHeroExitProgress()).toBe(0);
    publishHeroExitProgress(1.7);
    expect(readHeroExitProgress()).toBe(1);
  });

  it('returns null after clear', () => {
    publishHeroExitProgress(0.5);
    clearHeroExitProgress();
    expect(readHeroExitProgress()).toBeNull();
  });

  it('notifies subscribers on change and on clear', () => {
    const calls: Array<number | null> = [];
    const unsub = subscribeHeroExitProgress((v) => calls.push(v));
    publishHeroExitProgress(0.25);
    publishHeroExitProgress(0.75);
    clearHeroExitProgress();
    unsub();
    publishHeroExitProgress(0.9); // ignored after unsub
    // Initial null + two publishes + clear
    expect(calls).toEqual([null, 0.25, 0.75, null]);
  });

  it('coalesces duplicate publishes', () => {
    const calls: number[] = [];
    const unsub = subscribeHeroExitProgress((v) => {
      if (v !== null) calls.push(v);
    });
    publishHeroExitProgress(0.3);
    publishHeroExitProgress(0.3);
    publishHeroExitProgress(0.3);
    unsub();
    expect(calls).toEqual([0.3]);
  });
});
