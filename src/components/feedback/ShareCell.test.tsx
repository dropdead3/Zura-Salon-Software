/**
 * ShareCell privacy contract — three gates × four scenarios.
 *
 * Stylist Privacy Contract anchor: this is the UI half of the
 * `user_can_act_on_location` SQL gate. The hook can be silently regressed
 * (a future refactor returns true on error, drops the loading state, etc.) —
 * this test fails immediately if any gate stops protecting the button.
 *
 * Scenarios:
 *   loading + locationId set       → null
 *   canAct=false + locationId set  → null
 *   canAct=true + locationId set   → button rendered, click fires onShare
 *   locationId null (legacy row)   → button rendered (RLS at write-time
 *                                     is the backstop, hook is bypassed)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ShareCell } from './ShareCell';

vi.mock('@/hooks/useCanActOnLocation', () => ({
  useCanActOnLocation: vi.fn(),
}));

import { useCanActOnLocation } from '@/hooks/useCanActOnLocation';
const mockHook = useCanActOnLocation as unknown as ReturnType<typeof vi.fn>;

describe('ShareCell — Stylist Privacy Contract gates', () => {
  beforeEach(() => {
    cleanup();
    mockHook.mockReset();
  });

  it('renders nothing while the can-act probe is loading (no button flash)', () => {
    mockHook.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ShareCell locationId="loc-a" onShare={() => {}} />);
    expect(screen.queryByTestId('share-cell-button')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when canAct=false (fail-closed)', () => {
    mockHook.mockReturnValue({ data: false, isLoading: false });
    render(<ShareCell locationId="loc-a" onShare={() => {}} />);
    expect(screen.queryByTestId('share-cell-button')).toBeNull();
  });

  it('renders the button when canAct=true and forwards the click', () => {
    mockHook.mockReturnValue({ data: true, isLoading: false });
    const onShare = vi.fn();
    render(<ShareCell locationId="loc-a" onShare={onShare} />);
    const btn = screen.getByTestId('share-cell-button');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('renders the button for legacy rows (locationId=null) without invoking the hook gate', () => {
    // Hook still gets called (React doesn't conditionally invoke), but its
    // result is intentionally ignored — backstop is RLS at write-time.
    mockHook.mockReturnValue({ data: false, isLoading: true });
    render(<ShareCell locationId={null} onShare={() => {}} />);
    expect(screen.getByTestId('share-cell-button')).toBeInTheDocument();
  });
});
