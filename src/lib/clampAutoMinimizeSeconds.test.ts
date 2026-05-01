import { describe, it, expect } from 'vitest';
import {
  clampAutoMinimizeSeconds,
  coerceAutoMinimizeMs,
  AUTO_MINIMIZE_MIN_SECONDS,
  AUTO_MINIMIZE_MAX_SECONDS,
  AUTO_MINIMIZE_MIN_MS,
  AUTO_MINIMIZE_MAX_MS,
  AUTO_MINIMIZE_DEFAULT_MS,
} from './clampAutoMinimizeSeconds';

describe('clampAutoMinimizeSeconds (read-path)', () => {
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

describe('coerceAutoMinimizeMs (write-path)', () => {
  it('preserves explicit null (operator disabled)', () => {
    expect(coerceAutoMinimizeMs(null)).toBeNull();
  });

  it('treats empty string and undefined as disabled', () => {
    expect(coerceAutoMinimizeMs('')).toBeNull();
    expect(coerceAutoMinimizeMs(undefined)).toBeNull();
  });

  it('falls back to default ms for non-finite garbage', () => {
    expect(coerceAutoMinimizeMs(NaN)).toBe(AUTO_MINIMIZE_DEFAULT_MS);
    expect(coerceAutoMinimizeMs(Infinity)).toBe(AUTO_MINIMIZE_DEFAULT_MS);
    expect(coerceAutoMinimizeMs('not-a-number')).toBe(AUTO_MINIMIZE_DEFAULT_MS);
  });

  it('clamps to the [5000, 60000] ms window', () => {
    expect(coerceAutoMinimizeMs(0)).toBe(AUTO_MINIMIZE_MIN_MS);
    expect(coerceAutoMinimizeMs(-5000)).toBe(AUTO_MINIMIZE_MIN_MS);
    expect(coerceAutoMinimizeMs(120000)).toBe(AUTO_MINIMIZE_MAX_MS);
  });

  it('snaps to whole seconds', () => {
    expect(coerceAutoMinimizeMs(15400)).toBe(15000);
    expect(coerceAutoMinimizeMs(15600)).toBe(16000);
  });

  it('accepts numeric strings (Input type=number contract)', () => {
    expect(coerceAutoMinimizeMs('15000')).toBe(15000);
    expect(coerceAutoMinimizeMs('30000')).toBe(30000);
    expect(coerceAutoMinimizeMs('999999')).toBe(AUTO_MINIMIZE_MAX_MS);
  });

  it('is idempotent (round-trip safe for backfill)', () => {
    const inputs: Array<number | string | null | undefined> = [
      null, '', undefined, NaN, 0, 5000, 15000, 60000, 120000, '15000', '999999',
    ];
    for (const input of inputs) {
      const once = coerceAutoMinimizeMs(input);
      const twice = coerceAutoMinimizeMs(once);
      expect(twice).toBe(once);
    }
  });

  it('produces values that read-path clamp accepts unchanged', () => {
    // The contract that retires the read-path's defensive branches once
    // the column is backfilled: any coerced value, when run through the
    // read-path clamp, returns the same seconds-equivalent without
    // entering the non-finite or out-of-range branch.
    const samples = [null, 0, 5000, 15000, 60000, 120000, NaN, '7500', ''];
    for (const sample of samples) {
      const ms = coerceAutoMinimizeMs(sample);
      const seconds = clampAutoMinimizeSeconds(ms);
      if (ms === null) {
        expect(seconds).toBeNull();
      } else {
        expect(seconds).toBe(ms / 1000);
      }
    }
  });
});
