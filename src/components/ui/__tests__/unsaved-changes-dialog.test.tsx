import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnsavedChangesDialog } from '../unsaved-changes-dialog';

// ── UnsavedChangesDialog safety canon ──
// These tests lock the two semantic invariants that make this dialog safe:
//
//   1. Esc / backdrop close = "Stay here" (cancel), NEVER "Discard".
//      A future PR that wires Radix's onOpenChange to onDiscard "to save a
//      click" would silently invert the safety semantic — operators would
//      lose their edits by reflexively pressing Esc. This test makes that
//      regression a red CI run instead of a silent UX bug.
//
//   2. While `isSaving` is true, the Esc/backdrop path is also blocked.
//      The save is in flight; cancelling mid-flight would race the parent's
//      deferred-navigation handler.

describe('UnsavedChangesDialog — safety semantics', () => {
  function renderDialog(overrides: Partial<React.ComponentProps<typeof UnsavedChangesDialog>> = {}) {
    const onCancel = vi.fn();
    const onDiscard = vi.fn();
    const onSave = vi.fn();
    render(
      <UnsavedChangesDialog
        open
        onCancel={onCancel}
        onDiscard={onDiscard}
        onSave={onSave}
        {...overrides}
      />,
    );
    return { onCancel, onDiscard, onSave };
  }

  it('routes Esc keypress to onCancel, not onDiscard', () => {
    const { onCancel, onDiscard, onSave } = renderDialog();
    // Radix AlertDialog listens on document for Escape. Dispatching at the
    // document level mirrors how the user actually triggers a close.
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('blocks Esc-cancel while isSaving so the in-flight save can complete', () => {
    const { onCancel, onDiscard } = renderDialog({ isSaving: true });
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('disables both action buttons while isSaving', () => {
    renderDialog({ isSaving: true });
    expect(screen.getByRole('button', { name: /stay here/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /discard changes/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save & continue/i })).toBeDisabled();
  });

  it('disables Save when saveDisabled is true even if not saving', () => {
    renderDialog({ saveDisabled: true });
    expect(screen.getByRole('button', { name: /save & continue/i })).toBeDisabled();
    // Cancel/Discard remain available — operator can still escape the form.
    expect(screen.getByRole('button', { name: /stay here/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /discard changes/i })).not.toBeDisabled();
  });

  it('wires button clicks to their respective handlers', () => {
    const { onCancel, onDiscard, onSave } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /discard changes/i }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /save & continue/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /stay here/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
