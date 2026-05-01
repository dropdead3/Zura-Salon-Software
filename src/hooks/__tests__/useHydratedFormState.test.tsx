import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHydratedFormState } from '../useHydratedFormState';

interface Settings {
  appearance: 'modal' | 'banner' | 'corner-card';
  headline: string;
  enabled: boolean;
}

const DEFAULTS: Settings = {
  appearance: 'modal',
  headline: '',
  enabled: false,
};

describe('useHydratedFormState', () => {
  it('populates form from the first non-null settings payload', () => {
    let settings: Settings | null = null;
    const { result, rerender } = renderHook(() =>
      useHydratedFormState(settings, DEFAULTS),
    );

    expect(result.current.formData).toEqual(DEFAULTS);
    expect(result.current.hasHydrated).toBe(false);

    settings = { appearance: 'banner', headline: 'Hello', enabled: true };
    rerender();

    expect(result.current.formData).toEqual(settings);
    expect(result.current.savedSnapshot).toEqual(settings);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasHydrated).toBe(true);
  });

  it('preserves operator edits across a refetch with identical payload', () => {
    // Initial server payload.
    let settings: Settings | null = {
      appearance: 'modal',
      headline: 'Saved headline',
      enabled: true,
    };
    const { result, rerender } = renderHook(() =>
      useHydratedFormState(settings, DEFAULTS),
    );

    // Hydrated.
    expect(result.current.formData.appearance).toBe('modal');

    // Operator edits Appearance.
    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        appearance: 'corner-card',
      }));
    });
    expect(result.current.formData.appearance).toBe('corner-card');
    expect(result.current.isDirty).toBe(true);

    // A refetch lands with a *new object reference* but identical content
    // (e.g. cache invalidation triggered by a sibling save). This is the
    // exact scenario that previously clobbered the operator's appearance
    // change because the refs-based dirty check read stale values.
    settings = { appearance: 'modal', headline: 'Saved headline', enabled: true };
    rerender();

    // Operator's appearance edit must survive.
    expect(result.current.formData.appearance).toBe('corner-card');
    expect(result.current.formData.headline).toBe('Saved headline');
    expect(result.current.isDirty).toBe(true);
  });

  it('reproduces the post-save Appearance race: edit immediately after Save survives the refetch', () => {
    // Initial saved state: modal.
    let settings: Settings | null = {
      appearance: 'modal',
      headline: 'Free Haircut',
      enabled: true,
    };
    const { result, rerender } = renderHook(() =>
      useHydratedFormState(settings, DEFAULTS),
    );

    // 1. Operator changes a field and "saves" — savedSnapshot moves to match.
    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        headline: 'New Headline',
      }));
    });
    act(() => {
      result.current.setSavedSnapshot(result.current.formData);
    });
    expect(result.current.isDirty).toBe(false);

    // 2. Operator immediately changes Appearance (race window: refetch hasn't
    //    landed yet).
    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        appearance: 'corner-card',
      }));
    });
    expect(result.current.formData.appearance).toBe('corner-card');
    expect(result.current.isDirty).toBe(true);

    // 3. Post-save query refetch lands — same content as the just-saved
    //    payload, but a new object reference (because react-query rebuilt it
    //    from a fresh fetch). With the old refs-based logic, this would clobber
    //    the in-flight Appearance edit and reset the dirty flag.
    settings = {
      appearance: 'modal',
      headline: 'New Headline',
      enabled: true,
    };
    rerender();

    // 4. Appearance edit must survive; dirty pill must remain visible.
    expect(result.current.formData.appearance).toBe('corner-card');
    expect(result.current.isDirty).toBe(true);
    // Snapshot reflects the (re-)saved payload so dirty-state arithmetic
    // is correct against the freshly committed server state.
    expect(result.current.savedSnapshot).toEqual(settings);
  });

  it('snapshot identity is preserved when refetch payload matches existing snapshot', () => {
    let settings: Settings | null = {
      appearance: 'modal',
      headline: 'A',
      enabled: false,
    };
    const { result, rerender } = renderHook(() =>
      useHydratedFormState(settings, DEFAULTS),
    );

    const snapshotBefore = result.current.savedSnapshot;

    // Same content, new object reference.
    settings = { appearance: 'modal', headline: 'A', enabled: false };
    rerender();

    expect(result.current.savedSnapshot).toBe(snapshotBefore);
  });
});
