import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Loader2, Eye, RotateCcw, Gift, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { EditorCard } from './EditorCard';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useEditorDirtyState } from '@/hooks/useEditorDirtyState';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import {
  usePromotionalPopup,
  useUpdatePromotionalPopup,
  DEFAULT_PROMO_POPUP,
  type PromotionalPopupSettings,
  type PopupSurface,
} from '@/hooks/usePromotionalPopup';

const SURFACE_OPTIONS: { value: PopupSurface; label: string; description: string }[] = [
  { value: 'home', label: 'Home page', description: 'Show on the homepage only' },
  { value: 'services', label: 'Services pages', description: 'Show on service detail pages' },
  { value: 'booking', label: 'Booking surface', description: 'Show on the public booking flow' },
  { value: 'all-public', label: 'Every public page', description: 'Show site-wide (overrides others)' },
];

export function PromotionalPopupEditor() {
  const orgId = useSettingsOrgId();
  const { data: settings, isLoading } = usePromotionalPopup();
  const updateSettings = useUpdatePromotionalPopup();

  const [formData, setFormData] = useState<PromotionalPopupSettings>(DEFAULT_PROMO_POPUP);
  const [savedSnapshot, setSavedSnapshot] = useState<PromotionalPopupSettings>(DEFAULT_PROMO_POPUP);
  const [autoSaving, setAutoSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setSavedSnapshot(settings);
    }
  }, [settings]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(savedSnapshot);
  // Broadcast dirty state to the editor shell so it can:
  // (1) light up the Save button, (2) intercept Done / tab switches with the
  // unsaved-changes guard instead of silently dropping the operator's edits.
  useEditorDirtyState(isDirty);

  const handleChange = <K extends keyof PromotionalPopupSettings>(
    field: K,
    value: PromotionalPopupSettings[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSurface = (surface: PopupSurface, checked: boolean) => {
    setFormData((prev) => {
      const next = new Set(prev.showOn);
      if (checked) next.add(surface);
      else next.delete(surface);
      return { ...prev, showOn: Array.from(next) as PopupSurface[] };
    });
  };

  const handleSave = useCallback(async () => {
    try {
      await updateSettings.mutateAsync(formData);
      setSavedSnapshot(formData);
      toast.success('Promotional popup saved');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      toast.error(`Failed to save: ${msg}`);
    }
  }, [formData, updateSettings]);

  useEditorSaveAction(handleSave);

  // Auto-save for the binary Enable toggle — operators expect a switch to
  // "just work" without hunting for Save. We persist immediately, refresh
  // the preview, and skip the dirty-state path for this single field.
  const handleEnableToggle = useCallback(
    async (checked: boolean) => {
      const next = { ...formData, enabled: checked };
      setFormData(next);
      setAutoSaving(true);
      try {
        await updateSettings.mutateAsync(next);
        setSavedSnapshot(next);
        toast.success(checked ? 'Popup enabled' : 'Popup disabled');
        triggerPreviewRefresh();
      } catch (err) {
        // Roll back optimistic state on failure
        setFormData((prev) => ({ ...prev, enabled: !checked }));
        const msg = err instanceof Error ? err.message : 'unknown error';
        toast.error(`Failed to update: ${msg}`);
      } finally {
        setAutoSaving(false);
      }
    },
    [formData, updateSettings],
  );

  const handlePreviewNow = useCallback(() => {
    triggerPreviewRefresh();
    toast.success('Preview reloaded — popup will trigger immediately');
  }, []);

  const handleResetSession = useCallback(() => {
    if (typeof window === 'undefined' || !orgId) return;
    try {
      // Clear all per-org promo dismissal records + session sentinel
      const prefix = `zura.promo.${orgId}.`;
      const toDelete: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) toDelete.push(k);
      }
      toDelete.forEach((k) => window.localStorage.removeItem(k));
      window.sessionStorage.removeItem('zura.promo.session');
      triggerPreviewRefresh();
      toast.success(`Cleared ${toDelete.length} dismissal record(s) — preview reloaded`);
    } catch (err) {
      toast.error('Could not reset session storage');
    }
  }, [orgId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EditorCard
      title="Promotional Popup"
      icon={Megaphone}
      description="Show a one-time offer to website visitors. Accept routes them to booking with the offer code attached; decline dismisses based on your frequency cap."
    >
      {/* Enable + QA actions */}
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="promo-enabled" className="text-base font-medium">
              Show Promotional Popup
            </Label>
            <p className="text-sm text-muted-foreground">
              Toggle the popup on or off across the public site. Saves automatically.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {autoSaving && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" />
            )}
            <Switch
              id="promo-enabled"
              checked={formData.enabled}
              disabled={autoSaving}
              onCheckedChange={handleEnableToggle}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewNow}
            className="gap-2"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview popup now
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetSession}
            className="gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset popup session
          </Button>
          <p className="font-sans text-[11px] text-muted-foreground ml-auto">
            QA only — preview ignores frequency caps
          </p>
        </div>
      </div>

      {isDirty && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5">
          <p className="font-sans text-xs text-foreground">
            <span className="font-display uppercase tracking-wider text-[10px] text-primary mr-2">
              Unsaved
            </span>
            Press <strong>Save</strong> to keep this draft. Visitors won't see it until you{' '}
            <strong>Publish</strong> from Website Hub.
          </p>
        </div>
      )}

      {/* Content */}
      <Section title="Content">
        <Field label="Headline" hint="Keep it short — appears in display type.">
          <Input
            value={formData.headline}
            onChange={(e) => handleChange('headline', e.target.value)}
            placeholder="Free Haircut with Any Color Service"
          />
        </Field>
        <Field label="Body">
          <Textarea
            value={formData.body}
            onChange={(e) => handleChange('body', e.target.value)}
            rows={3}
            placeholder="Book a color appointment this month and your haircut is on us."
          />
        </Field>
        <Field label="Disclaimer (optional)" hint="Legal fine print — shown below the buttons.">
          <Textarea
            value={formData.disclaimer ?? ''}
            onChange={(e) => handleChange('disclaimer', e.target.value)}
            rows={2}
            placeholder="New clients only. Cannot be combined with other offers."
          />
        </Field>
        <Field label="Image URL (optional)">
          <Input
            value={formData.imageUrl ?? ''}
            onChange={(e) => handleChange('imageUrl', e.target.value)}
            placeholder="https://..."
          />
        </Field>
      </Section>

      {/* Offer + CTAs */}
      <Section title="Offer & Call to Action">
        <Field
          label="Offer code"
          hint="Attached to the booking URL when a visitor accepts (e.g. FREECUT). Recorded for the team."
        >
          <Input
            value={formData.offerCode}
            onChange={(e) => handleChange('offerCode', e.target.value.toUpperCase())}
            placeholder="FREECUT"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Accept button label">
            <Input
              value={formData.ctaAcceptLabel}
              onChange={(e) => handleChange('ctaAcceptLabel', e.target.value)}
              placeholder="Claim Offer"
            />
          </Field>
          <Field label="Decline button label">
            <Input
              value={formData.ctaDeclineLabel}
              onChange={(e) => handleChange('ctaDeclineLabel', e.target.value)}
              placeholder="No thanks"
            />
          </Field>
        </div>
      </Section>

      {/* Behavior */}
      <Section title="Behavior">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Appearance">
            <Select
              value={formData.appearance}
              onValueChange={(v) => handleChange('appearance', v as PromotionalPopupSettings['appearance'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="modal">Centered modal</SelectItem>
                <SelectItem value="banner">Top banner</SelectItem>
                <SelectItem value="corner-card">Bottom-right card</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Trigger">
            <Select
              value={formData.trigger}
              onValueChange={(v) => handleChange('trigger', v as PromotionalPopupSettings['trigger'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediately on load</SelectItem>
                <SelectItem value="delay">After a delay</SelectItem>
                <SelectItem value="scroll">After scrolling</SelectItem>
                <SelectItem value="exit-intent">On exit intent (desktop)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        {(formData.trigger === 'delay' || formData.trigger === 'scroll') && (
          <Field
            label={formData.trigger === 'delay' ? 'Delay (milliseconds)' : 'Scroll distance (pixels)'}
          >
            <Input
              type="number"
              min={0}
              value={formData.triggerValueMs ?? ''}
              onChange={(e) =>
                handleChange('triggerValueMs', e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder={formData.trigger === 'delay' ? '4000' : '600'}
            />
          </Field>
        )}
        <Field
          label="Frequency cap"
          hint="How often the same visitor sees the popup."
        >
          <Select
            value={formData.frequency}
            onValueChange={(v) => handleChange('frequency', v as PromotionalPopupSettings['frequency'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="once">Once ever (until they clear cookies)</SelectItem>
              <SelectItem value="once-per-session">Once per browsing session</SelectItem>
              <SelectItem value="daily">Once per day</SelectItem>
              <SelectItem value="always">Every page load (testing only)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Reminder button position"
          hint="Where the floating reminder appears after a visitor closes the popup. Flip to bottom-left if a chat widget already lives in the right corner."
        >
          <Select
            value={formData.fabPosition ?? 'bottom-right'}
            onValueChange={(v) => handleChange('fabPosition', v as PromotionalPopupSettings['fabPosition'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-right">Bottom right</SelectItem>
              <SelectItem value="bottom-left">Bottom left</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      {/* Targeting */}
      <Section title="Where it shows">
        <div className="space-y-2">
          {SURFACE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer"
            >
              <Checkbox
                checked={formData.showOn.includes(opt.value)}
                onCheckedChange={(c) => toggleSurface(opt.value, c === true)}
              />
              <div className="flex-1 min-w-0">
                <div className="font-sans text-sm text-foreground">{opt.label}</div>
                <div className="font-sans text-xs text-muted-foreground">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </Section>

      {/* Schedule */}
      <Section title="Schedule (optional)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Starts at" hint="Leave blank for immediate.">
            <Input
              type="datetime-local"
              value={toLocalInput(formData.startsAt)}
              onChange={(e) => handleChange('startsAt', fromLocalInput(e.target.value))}
            />
          </Field>
          <Field label="Ends at" hint="Leave blank for no end.">
            <Input
              type="datetime-local"
              value={toLocalInput(formData.endsAt)}
              onChange={(e) => handleChange('endsAt', fromLocalInput(e.target.value))}
            />
          </Field>
        </div>
      </Section>

      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
        <strong className="font-display uppercase tracking-wider text-[10px] text-foreground">
          Note
        </strong>
        <p className="mt-1">
          The offer code is recorded on the booking URL so your team can honor it at checkout.
          Discount mechanics (e.g. line-item adjustments) are configured separately under your
          service pricing rules.
        </p>
      </div>
    </EditorCard>
  );
}

// ── Layout helpers ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-display uppercase tracking-wider text-xs text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-sans text-sm">{label}</Label>
      {children}
      {hint && <p className="font-sans text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── datetime-local <-> ISO helpers ──

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
