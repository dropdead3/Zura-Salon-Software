import { describe, it, expect } from 'vitest';
import {
  clampAutoMinimizeSeconds,
  AUTO_MINIMIZE_MIN_SECONDS,
  AUTO_MINIMIZE_MAX_SECONDS,
} from './clampAutoMinimizeSeconds';

describe('clampAutoMinimizeSeconds', () => {
  it('returns null when operator explicitly disables auto-minimize', () => {
    expect(clampAutoMinimizeSeconds(null)).toBeNull();
  });

  it('falls back to 15s default when value is undefined', () => {
    expect(clampAutoMinimizeSeconds(undefined)).toBe(15);
  });

  it('falls back to 15s default when value is non-finite', () => {
    expect(clampAutoMinimizeSeconds(NaN)).toBe(15);
    expect(clampAutoMinimizeSeconds(Infinity)).toBe(15);
  });

  it('clamps below the 5s floor', () => {
    expect(clampAutoMinimizeSeconds(0)).toBe(AUTO_MINIMIZE_MIN_SECONDS);
    expect(clampAutoMinimizeSeconds(1000)).toBe(AUTO_MINIMIZE_MIN_SECONDS);
    expect(clampAutoMinimizeSeconds(-5000)).toBe(AUTO_MINIMIZE_MIN_SECONDS);
  });

  it('clamps above the 60s ceiling', () => {
    expect(clampAutoMinimizeSeconds(60000)).toBe(AUTO_MINIMIZE_MAX_SECONDS);
    expect(clampAutoMinimizeSeconds(120000)).toBe(AUTO_MINIMIZE_MAX_SECONDS);
  });

  it('passes through values in the supported window', () => {
    expect(clampAutoMinimizeSeconds(5000)).toBe(5);
    expect(clampAutoMinimizeSeconds(15000)).toBe(15);
    expect(clampAutoMinimizeSeconds(30000)).toBe(30);
    expect(clampAutoMinimizeSeconds(60000)).toBe(60);
  });

  it('rounds sub-second values', () => {
    expect(clampAutoMinimizeSeconds(15400)).toBe(15);
    expect(clampAutoMinimizeSeconds(15600)).toBe(16);
  });
});
