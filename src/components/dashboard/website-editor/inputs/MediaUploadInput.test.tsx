/**
 * MediaUploadInput — focal-point overlay consolidation.
 *
 * Verifies the upload tile doubles as a focal-point picker when the
 * `focal` prop is provided, eliminating the second-image stack we used to
 * render via a standalone `<FocalPointPicker>` below the upload tile.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaUploadInput } from './MediaUploadInput';

const baseProps = {
  value: 'https://example.com/image.jpg',
  kind: 'image' as const,
  onChange: vi.fn(),
};

describe('MediaUploadInput — focal overlay', () => {
  it('renders the crosshair handle and reset link only when focal is off-default', () => {
    const { rerender } = render(
      <MediaUploadInput
        {...baseProps}
        focal={{ x: 50, y: 50, onChange: vi.fn(), onReset: vi.fn() }}
      />,
    );
    // At default 50/50 the reset link is suppressed (matches FocalPointPicker behavior).
    expect(screen.queryByText('Reset to center')).toBeNull();

    rerender(
      <MediaUploadInput
        {...baseProps}
        focal={{ x: 25, y: 75, onChange: vi.fn(), onReset: vi.fn() }}
      />,
    );
    expect(screen.getByText('Reset to center')).toBeInTheDocument();
    expect(screen.getByText(/25%, 75%/)).toBeInTheDocument();
  });

  it('omits the focal overlay entirely when the focal prop is absent (back-compat)', () => {
    render(<MediaUploadInput {...baseProps} />);
    expect(screen.queryByText(/Reset to center/)).toBeNull();
    expect(screen.queryByText(/Focal point/)).toBeNull();
  });

  it('omits the focal overlay when explicitly disabled (e.g. fit=contain)', () => {
    render(
      <MediaUploadInput
        {...baseProps}
        focal={{ x: 25, y: 75, onChange: vi.fn(), onReset: vi.fn(), enabled: false }}
      />,
    );
    // Reset link still surfaces (operator can recover) but cursor-crosshair must not.
    const tile = screen.getByAltText('Uploaded').parentElement;
    expect(tile?.className).not.toMatch(/cursor-crosshair/);
  });
});
