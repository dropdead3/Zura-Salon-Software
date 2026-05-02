/**
 * useEditorSubViewState contract regression.
 *
 * The hook MUST be a pure useState wrapper — no localStorage reads, no
 * writes, no module-level side effects. Any deviation strands operators
 * deep in a sub-panel on re-entry (the May 2026 HeroEditor bug).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorSubViewState } from './useEditorSubViewState';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('useEditorSubViewState — entry contract', () => {
  it('source file makes zero localStorage / sessionStorage references', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, 'useEditorSubViewState.ts'),
      'utf8',
    );
    // The doc comment is allowed to mention localStorage by name; strip
    // the leading block comment before the static check so the assertion
    // only inspects executable code.
    const code = src.replace(/^\/\*\*[\s\S]*?\*\//, '');
    expect(code).not.toMatch(/localStorage/);
    expect(code).not.toMatch(/sessionStorage/);
  });

  it('does not call Storage.getItem on mount', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    renderHook(() => useEditorSubViewState({ kind: 'hub' }));
    expect(getItemSpy).not.toHaveBeenCalled();
    getItemSpy.mockRestore();
  });

  it('does not call Storage.setItem when sub-view changes', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() =>
      useEditorSubViewState<{ kind: string; id?: string }>({ kind: 'hub' }),
    );
    act(() => {
      result.current[1]({ kind: 'global', id: 'colors' });
    });
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('returns the initial value on every fresh mount (no rehydration)', () => {
    const a = renderHook(() => useEditorSubViewState({ kind: 'hub' }));
    act(() => {
      a.result.current[1]({ kind: 'global', id: 'colors' } as { kind: string });
    });
    a.unmount();

    // Fresh mount → fresh initial. If a future contributor adds storage
    // persistence, this would return { kind: 'global', id: 'colors' }.
    const b = renderHook(() => useEditorSubViewState({ kind: 'hub' }));
    expect(b.result.current[0]).toEqual({ kind: 'hub' });
  });
});
