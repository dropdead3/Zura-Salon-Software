/**
 * Sticky Footer Bar editor.
 *
 * The bar itself lives in `src/components/layout/StickyFooterBar.tsx` and
 * historically had no operator-facing knobs (always on except `/booking`,
 * always every active location's phone, always literal "Book consult"). This
 * editor exposes:
 *   - global enable/disable
 *   - CTA text + URL
 *   - phone numbers toggle + ordered location allow-list
 *   - scroll-show threshold
 *   - additional pathname exclusions (`/booking` stays implicit)
 *
 * Mirrors the structure of `FooterCTAEditor` so save/preview wiring stays
 * uniform across Site Chrome editors.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, PanelBottomClose, GripVertical } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import {
  useStickyFooterBarConfig,
  type StickyFooterBarConfig,
  DEFAULT_STICKY_FOOTER_BAR,
} from '@/hooks/useSectionConfig';
import { useActiveLocations } from '@/hooks/useLocations';
import { Checkbox } from '@/components/ui/checkbox';
import { UrlInput } from './inputs/UrlInput';
import { ToggleInput } from './inputs/ToggleInput';
import { CharCountInput } from './inputs/CharCountInput';
import { SliderInput } from './inputs/SliderInput';
import { useDebounce } from '@/hooks/use-debounce';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import { useDirtyState } from '@/hooks/useDirtyState';
import { EditorCard } from './EditorCard';
import { cn } from '@/lib/utils';

export function StickyFooterBarEditor() {
  const __saveTelemetry = useSaveTelemetry('sticky-footer-bar-editor');
  const { data, isLoading, update } = useStickyFooterBarConfig();
  const [localConfig, setLocalConfig] =
    useState<StickyFooterBarConfig>(DEFAULT_STICKY_FOOTER_BAR);
  // Drives the preview bridge — debounce avoids flooding postMessage on
  // every keystroke. The save handler still uses the live value.
  const debouncedConfig = useDebounce(localConfig, 300);

  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useActiveLocations();
  const phoneLocations = useMemo(
    () => locations.filter((l) => !!l.phone),
    [locations],
  );

  usePreviewBridge('section_sticky_footer_bar', debouncedConfig);

  // Canonical dirty-state wiring — broadcasts `editor-dirty-state` so the
  // editor shell's Save/UnsavedChanges UI activates as soon as any field
  // diverges from the server snapshot. Without this the Save button stays
  // dormant and toggle changes appear to "do nothing".
  useDirtyState(localConfig, data);

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      // Normalize page_exclusions: strip blanks, trim, ensure leading `/`,
      // dedupe. Keeps the persisted shape predictable for the runtime.
      const normalized: StickyFooterBarConfig = {
        ...localConfig,
        page_exclusions: Array.from(
          new Set(
            localConfig.page_exclusions
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p) => (p.startsWith('/') ? p : `/${p}`)),
          ),
        ),
      };
      await update(normalized);
      setLocalConfig(normalized);
      toast.success('Sticky Footer Bar saved');
      clearPreviewOverride(
        'section_sticky_footer_bar',
        effectiveOrganization?.id ?? null,
      );
      __saveTelemetry.event('save-success');
      triggerPreviewRefresh();
      __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, effectiveOrganization?.id, __saveTelemetry]);

  useEditorSaveAction(handleSave);

  const updateField = <K extends keyof StickyFooterBarConfig>(
    field: K,
    value: StickyFooterBarConfig[K],
  ) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_STICKY_FOOTER_BAR);
    toast.info('Reset to defaults — save to apply');
  };

  // Toggle a single location ID in the allow-list. Preserves order:
  // newly checked IDs append to the end, unchecks remove in place.
  const toggleLocation = (id: string) => {
    setLocalConfig((prev) => {
      const exists = prev.visible_location_ids.includes(id);
      return {
        ...prev,
        visible_location_ids: exists
          ? prev.visible_location_ids.filter((x) => x !== id)
          : [...prev.visible_location_ids, id],
      };
    });
  };

  const moveLocation = (id: string, direction: -1 | 1) => {
    setLocalConfig((prev) => {
      const ids = [...prev.visible_location_ids];
      const idx = ids.indexOf(id);
      if (idx === -1) return prev;
      const next = idx + direction;
      if (next < 0 || next >= ids.length) return prev;
      [ids[idx], ids[next]] = [ids[next], ids[idx]];
      return { ...prev, visible_location_ids: ids };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Helper-text gating: when the bar is disabled site-wide, dim the rest
  // of the controls so operators understand they're inert until re-enabled.
  const dimWhenDisabled = !localConfig.enabled
    ? 'opacity-50 pointer-events-none'
    : '';

  return (
    <div className="space-y-6">
      <EditorCard
        title="Sticky Footer Bar"
        icon={PanelBottomClose}
        description="Floating call-bar that appears as visitors scroll past the hero. Drives phone calls and bookings without interrupting the layout."
        headerActions={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={handleReset}
            title="Reset to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        }
      >
        <ToggleInput
          label="Enable Sticky Footer Bar"
          value={localConfig.enabled}
          onChange={(value) => updateField('enabled', value)}
          description={
            localConfig.enabled
              ? 'Bar renders site-wide except on /booking and any pages you exclude below.'
              : 'Bar is hidden on every page. Re-enable to surface the floating CTA.'
          }
        />

        <div className={cn('space-y-6 transition-opacity', dimWhenDisabled)}>
          {/* CTA */}
          <div className="space-y-3 pt-4 border-t border-border/30">
            <h4 className="font-display text-xs tracking-wide text-muted-foreground">
              CALL TO ACTION
            </h4>
            <CharCountInput
              label="Button Text"
              value={localConfig.cta_text}
              onChange={(value) => updateField('cta_text', value)}
              maxLength={30}
              placeholder="Book consult"
              description="Label on the primary CTA button."
            />
            <UrlInput
              label="Button URL"
              value={localConfig.cta_url}
              onChange={(value) => updateField('cta_url', value)}
              placeholder="/booking"
              description="Where the CTA links to. Internal paths start with /."
            />
          </div>

          {/* Phone numbers */}
          <div className="space-y-3 pt-4 border-t border-border/30">
            <h4 className="font-display text-xs tracking-wide text-muted-foreground">
              PHONE NUMBERS
            </h4>
            <ToggleInput
              label="Show Phone Numbers"
              value={localConfig.show_phone_numbers}
              onChange={(value) => updateField('show_phone_numbers', value)}
              description="Display location phone tiles to the left of the CTA."
            />

            {localConfig.show_phone_numbers && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Visible Locations</Label>
                  {localConfig.visible_location_ids.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => updateField('visible_location_ids', [])}
                    >
                      Show all
                    </Button>
                  )}
                </div>

                {phoneLocations.length === 0 ? (
                  <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border/60 px-3 py-3">
                    No active locations have a phone number set yet. Add a
                    phone in Locations to surface it here.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {localConfig.visible_location_ids.length === 0
                        ? 'Showing every active location with a phone (default).'
                        : `Showing ${localConfig.visible_location_ids.length} of ${phoneLocations.length} location${phoneLocations.length === 1 ? '' : 's'}, in this order.`}
                    </p>

                    {/* Selected (ordered) first, then the rest as add-able */}
                    <div className="space-y-1">
                      {localConfig.visible_location_ids
                        .map((id) => phoneLocations.find((l) => l.id === id))
                        .filter((l): l is NonNullable<typeof l> => !!l)
                        .map((loc, idx, arr) => (
                          <div
                            key={loc.id}
                            className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5"
                          >
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            <Checkbox
                              checked
                              onCheckedChange={() => toggleLocation(loc.id)}
                              aria-label={`Hide ${loc.name}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {loc.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {loc.phone}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={idx === 0}
                                onClick={() => moveLocation(loc.id, -1)}
                                title="Move up"
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={idx === arr.length - 1}
                                onClick={() => moveLocation(loc.id, 1)}
                                title="Move down"
                              >
                                ↓
                              </Button>
                            </div>
                          </div>
                        ))}

                      {phoneLocations
                        .filter(
                          (l) => !localConfig.visible_location_ids.includes(l.id),
                        )
                        .map((loc) => (
                          <div
                            key={loc.id}
                            className="flex items-center gap-2 rounded-md border border-border/40 px-2 py-1.5"
                          >
                            <span className="w-3.5" />
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => toggleLocation(loc.id)}
                              aria-label={`Show ${loc.name}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{loc.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {loc.phone}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Visibility rules */}
          <div className="space-y-4 pt-4 border-t border-border/30">
            <h4 className="font-display text-xs tracking-wide text-muted-foreground">
              VISIBILITY
            </h4>
            <SliderInput
              label="Show after scrolling"
              value={localConfig.scroll_show_after_px}
              onChange={(value) => updateField('scroll_show_after_px', value)}
              min={0}
              max={600}
              step={20}
              unit="px"
              description="The bar appears once the visitor has scrolled this far down a page. Lower values surface it sooner; 0 shows it immediately."
            />

            <div className="space-y-2">
              <Label htmlFor="page-exclusions">Hide on these pages</Label>
              <Textarea
                id="page-exclusions"
                value={localConfig.page_exclusions.join('\n')}
                onChange={(e) =>
                  updateField(
                    'page_exclusions',
                    e.target.value.split('\n'),
                  )
                }
                rows={3}
                placeholder={'/contact\n/locations/downtown'}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                One pathname per line. <code>/booking</code> is always
                excluded. Saved values are normalized to start with{' '}
                <code>/</code>.
              </p>
            </div>
          </div>
        </div>
      </EditorCard>
    </div>
  );
}
