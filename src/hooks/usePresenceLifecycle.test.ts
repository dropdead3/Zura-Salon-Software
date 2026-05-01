import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePresenceLifecycle } from './usePresenceLifecycle';

// Helper: build a synthetic AnimationEvent whose target === currentTarget
// (the contract `onAnimationEnd` enforces to ignore bubbling children).
function rootEvent() {
  const el = document.createElement('div');
  return {
    target: el,
    currentTarget: el,
  } as unknown as React.AnimationEvent<HTMLElement>;
}

function childBubblingEvent() {
  const root = document.createElement('div');
  const child = document.createElement('span');
  return {
    target: child,
    currentTarget: root,
  } as unknown as React.AnimationEvent<HTMLElement>;
}

describe('usePresenceLifecycle', () => {
  it('starts in the entering phase', () => {
    const { result } = renderHook(() => usePresenceLifecycle({ onExit: () => {} }));
    expect(result.current.phase).toBe('entering');
    expect(result.current.isEntering).toBe(true);
    expect(result.current.isClosing).toBe(false);
  });

  it('beginExit() flips to closing and stashes the reason', () => {
    const onExit = vi.fn();
    const { result } = renderHook(() => usePresenceLifecycle<'soft' | 'accept'>({ onExit }));

    act(() => result.current.beginExit('soft'));
    expect(result.current.phase).toBe('closing');
    expect(result.current.isClosing).toBe(true);
    // onExit must NOT fire until animationend — that's the entire point
    // of the hook (otherwise the surface unmounts mid-animation).
    expect(onExit).not.toHaveBeenCalled();
  });

  it('onAnimationEnd on the root finalizes and fires onExit with the captured reason', async () => {
    const onExit = vi.fn();
    const { result } = renderHook(() =>
      usePresenceLifecycle<'soft' | 'accept'>({ onExit }),
    );

    act(() => result.current.beginExit('soft'));
    act(() => result.current.onAnimationEnd(rootEvent()));

    // onExit is queued via microtask so React finishes processing the
    // current update before parent unmounts.
    await act(async () => {
      await Promise.resolve();
    });

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledWith('soft');
    // Phase resets to `visible` so the next entrance can replay cleanly.
    expect(result.current.phase).toBe('visible');
  });

  it('ignores animationend events bubbling up from children', async () => {
    const onExit = vi.fn();
    const { result } = renderHook(() => usePresenceLifecycle({ onExit }));

    act(() => result.current.beginExit());
    act(() => result.current.onAnimationEnd(childBubblingEvent()));

    await act(async () => { await Promise.resolve(); });

    // Child's animationend bubbled up to the root listener, but the
    // hook saw target !== currentTarget and ignored it. The popup MUST
    // stay mounted — otherwise the countdown bar's pulse animation
    // would prematurely unmount the popup.
    expect(onExit).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('closing');
  });

  it('ignores animationend when not in the closing phase', async () => {
    const onExit = vi.fn();
    const { result } = renderHook(() => usePresenceLifecycle({ onExit }));

    // Entering animation completes — should NOT trigger onExit.
    act(() => result.current.onAnimationEnd(rootEvent()));
    await act(async () => { await Promise.resolve(); });

    expect(onExit).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('entering');
  });

  it('beginExit is idempotent within a single close cycle', () => {
    const onExit = vi.fn();
    const { result } = renderHook(() =>
      usePresenceLifecycle<'soft' | 'accept'>({ onExit }),
    );

    act(() => result.current.beginExit('soft'));
    // Second begin (e.g. timer + Esc race) keeps the original reason.
    act(() => result.current.beginExit('accept'));

    // Force the finalize and confirm the FIRST reason wins.
    act(() => result.current.onAnimationEnd(rootEvent()));
    return act(async () => {
      await Promise.resolve();
      expect(onExit).toHaveBeenCalledTimes(1);
      expect(onExit).toHaveBeenCalledWith('soft');
    });
  });

  it('reset() returns the lifecycle to entering for the next cycle', async () => {
    const onExit = vi.fn();
    const { result } = renderHook(() => usePresenceLifecycle({ onExit }));

    act(() => result.current.beginExit());
    act(() => result.current.onAnimationEnd(rootEvent()));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.phase).toBe('visible');

    act(() => result.current.reset());
    expect(result.current.phase).toBe('entering');
  });

  it('exposes stable callback references across renders', () => {
    const { result, rerender } = renderHook(() =>
      usePresenceLifecycle({ onExit: () => {} }),
    );
    const firstBegin = result.current.beginExit;
    const firstEnd = result.current.onAnimationEnd;
    const firstReset = result.current.reset;
    rerender();
    expect(result.current.beginExit).toBe(firstBegin);
    expect(result.current.onAnimationEnd).toBe(firstEnd);
    expect(result.current.reset).toBe(firstReset);
  });
});
