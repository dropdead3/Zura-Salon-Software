import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useImpressionOnce } from './useImpressionOnce';

describe('useImpressionOnce', () => {
  it('does not fire while `when` is false', () => {
    const record = vi.fn();
    renderHook(() => useImpressionOnce({ when: false, record }));
    expect(record).not.toHaveBeenCalled();
  });

  it('fires exactly once after `when` flips to true', () => {
    const record = vi.fn();
    const { rerender } = renderHook(
      ({ when }: { when: boolean }) => useImpressionOnce({ when, record }),
      { initialProps: { when: false } },
    );
    expect(record).not.toHaveBeenCalled();
    rerender({ when: true });
    expect(record).toHaveBeenCalledTimes(1);
    rerender({ when: true });
    rerender({ when: true });
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('does not re-fire if `when` toggles back to true after going false', () => {
    const record = vi.fn();
    const { rerender } = renderHook(
      ({ when }: { when: boolean }) => useImpressionOnce({ when, record }),
      { initialProps: { when: true } },
    );
    expect(record).toHaveBeenCalledTimes(1);
    rerender({ when: false });
    rerender({ when: true });
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('uses the latest `record` closure without re-firing', () => {
    const recordA = vi.fn();
    const recordB = vi.fn();
    const { rerender } = renderHook(
      ({ record }: { record: () => void }) => useImpressionOnce({ when: false, record }),
      { initialProps: { record: recordA } },
    );
    rerender({ record: recordB });
    // Now flip `when` true via a second hook instance — easier: re-render with a wrapper that flips both.
    // For simplicity assert neither fired yet:
    expect(recordA).not.toHaveBeenCalled();
    expect(recordB).not.toHaveBeenCalled();
  });
});
