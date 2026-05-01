import { describe, it, expect } from 'vitest';
import { stableStringify, isStructurallyEqual } from '../stableStringify';

/**
 * Contract tests for stableStringify.
 *
 * The whole point of this helper is that semantically-equal objects with
 * different key insertion order produce identical strings — the property
 * `JSON.stringify` does NOT guarantee. Every test below is a regression
 * gate against someone "optimizing" stableStringify back to a thin wrapper
 * around `JSON.stringify`.
 *
 * Doctrine anchor: mem://architecture/site-settings-event-ownership.md
 * Lint rule: src/test/lint-rule-dirty-state.test.ts
 */
describe('stableStringify', () => {
  it('produces the same string for objects with different key insertion order', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it('is recursively stable for nested objects', () => {
    const a = { outer: { y: 2, x: 1 }, top: 0 };
    const b = { top: 0, outer: { x: 1, y: 2 } };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('is stable for arrays of objects (preserves array order, sorts inner keys)', () => {
    const a = [{ a: 1, b: 2 }, { c: 3, d: 4 }];
    const b = [{ b: 2, a: 1 }, { d: 4, c: 3 }];
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('does NOT treat reordered arrays as equal (array order is semantic)', () => {
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });

  it('handles null, undefined, primitives, and empty containers', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(undefined)).toBe(undefined as unknown as string);
    // ^ JSON.stringify(undefined) returns undefined; mirroring that is fine
    //   because `isStructurallyEqual(undefined, undefined)` still works
    //   (both sides produce the same value).
    expect(stableStringify('hi')).toBe('"hi"');
    expect(stableStringify(42)).toBe('42');
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify({})).toBe('{}');
    expect(stableStringify([])).toBe('[]');
  });

  it('distinguishes objects with different values at the same key', () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });

  it('distinguishes objects with different keys', () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ b: 1 }));
  });
});

describe('isStructurallyEqual', () => {
  it('treats reordered keys as equal (the regression this exists to prevent)', () => {
    // The naive `JSON.stringify(a) === JSON.stringify(b)` check would
    // return false here. This is the exact case that left
    // "Unsaved changes" stuck on after save in the hero editor.
    expect(isStructurallyEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('handles the editor-config shape: spread-of-defaults vs spread-of-defaults-and-db-row', () => {
    const DEFAULTS = { headline: 'X', subheadline: '', cta: 'Book' };
    const local = { ...DEFAULTS, subheadline: 'hello' };
    // Simulate what `{ ...DEFAULTS, ...dbRow }` produces when dbRow's keys
    // arrive in a different order than DEFAULTS.
    const dbRow = { cta: 'Book', subheadline: 'hello', headline: 'X' };
    const server = { ...DEFAULTS, ...dbRow };
    expect(isStructurallyEqual(local, server)).toBe(true);
  });

  it('returns false when values genuinely differ', () => {
    expect(isStructurallyEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('returns false when one side is null/undefined', () => {
    expect(isStructurallyEqual({ a: 1 }, null)).toBe(false);
    expect(isStructurallyEqual({ a: 1 }, undefined)).toBe(false);
  });
});
