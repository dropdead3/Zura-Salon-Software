import { tokens } from '@/lib/design-tokens';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';
import { DEFAULT_STYLE_OVERRIDES } from '@/components/home/SectionStyleWrapper';
import { ThemeAwareColorInput } from './inputs/ThemeAwareColorInput';
import { SectionBackgroundEditor } from './inputs/SectionBackgroundEditor';

interface SectionStyleEditorProps {
  value: Partial<StyleOverrides>;
  onChange: (overrides: Partial<StyleOverrides>) => void;
  /** Pass sectionId for image upload path context */
  sectionId?: string;
  /**
   * When true, the Container Frame switch defaults ON for sections whose
   * live renderer always renders an inset card (e.g. Brand Statement). The
   * operator can still toggle it OFF; the toggle then writes
   * `container_enabled: false` so the persisted value wins over the live
   * default.
   */
  containerDefaultEnabled?: boolean;
}

export function SectionStyleEditor({
  value,
  onChange,
  sectionId,
  containerDefaultEnabled = false,
}: SectionStyleEditorProps) {
  const merged = { ...DEFAULT_STYLE_OVERRIDES, ...value };

  const update = (key: keyof StyleOverrides, val: unknown) => {
    onChange({ ...value, [key]: val });
  };

  const hasOverrides = value && Object.keys(value).some(k => {
    const v = value[k as keyof StyleOverrides];
    return v !== undefined && v !== '' && v !== 0 && v !== 'none' && v !== 'full';
  });

  // If the operator hasn't explicitly set container_enabled, fall back to the
  // section's live default (e.g. Brand Statement renders the dark card by
  // default, so the editor should expose its controls without a toggle dance).
  //
  // Legacy drafts may carry `container_enabled: false` from before defaults
  // existed. When the section forces a container by default AND the operator
  // hasn't customized any container_* field, treat the stale `false` as
  // "use default" so the color/media editor stays reachable.
  const hasContainerOverrides = Object.keys(value).some(
    (k) => k.startsWith('container_') && k !== 'container_enabled'
  );
  const containerEnabled =
    value.container_enabled !== undefined
      ? containerDefaultEnabled && value.container_enabled === false && !hasContainerOverrides
        ? true
        : !!value.container_enabled
      : containerDefaultEnabled;

  return (
    <div className="space-y-6 py-1">
      {/* ─── Section Background ──────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-display uppercase tracking-wider text-muted-foreground">
            Section Background
          </Label>
        </div>
        <SectionBackgroundEditor
          scope="section"
          value={value}
          onChange={onChange}
          sectionId={sectionId}
        />
      </section>

      {/* ─── Container (inset frame around content) ──────────────────── */}
      <section className="space-y-3 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-display uppercase tracking-wider text-muted-foreground">
              Container Frame
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Optional inset card around the content with its own background
            </p>
          </div>
          <Switch
            checked={containerEnabled}
            onCheckedChange={(v) => update('container_enabled', v)}
          />
        </div>

        {/* Reset to section default — strips every container_* key so the
            live renderer's built-in defaults (e.g. Brand Statement's dark
            card) take over. Only shown when the operator has actually
            overridden a container field. */}
        {containerDefaultEnabled && Object.keys(value).some(k => k.startsWith('container_')) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => {
              const next: Partial<StyleOverrides> = { ...value };
              for (const k of Object.keys(next) as (keyof StyleOverrides)[]) {
                if (typeof k === 'string' && k.startsWith('container_')) delete next[k];
              }
              onChange(next);
            }}
          >
            ↺ Reset Container Frame to section default
          </Button>
        )}

        {containerEnabled && (
          <div className="space-y-4 pl-1">
            <SectionBackgroundEditor
              scope="container"
              value={value}
              onChange={onChange}
              sectionId={sectionId}
            />

            {/* Container layout */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Inner Padding ({merged.container_padding ?? 32}px)</Label>
                <Slider
                  value={[merged.container_padding ?? 32]}
                  onValueChange={([v]) => update('container_padding', v)}
                  min={0}
                  max={96}
                  step={4}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Corner Radius ({merged.container_radius ?? 16}px)</Label>
                <Slider
                  value={[merged.container_radius ?? 16]}
                  onValueChange={([v]) => update('container_radius', v)}
                  min={0}
                  max={48}
                  step={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Container Max Width</Label>
              <Select
                value={merged.container_max_width ?? 'lg'}
                onValueChange={v => update('container_max_width', v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small (672px)</SelectItem>
                  <SelectItem value="md">Medium (896px)</SelectItem>
                  <SelectItem value="lg">Large (1152px)</SelectItem>
                  <SelectItem value="xl">Extra Large (1280px)</SelectItem>
                  <SelectItem value="full">Full Width</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </section>

      {/* ─── Layout ──────────────────────────────────────────────────── */}
      <section className="space-y-4 pt-4 border-t border-border/40">
        <Label className="text-xs font-display uppercase tracking-wider text-muted-foreground">
          Layout
        </Label>

        <ThemeAwareColorInput
          label="Text Color Override"
          value={merged.text_color_override}
          onChange={(next) => update('text_color_override', next ?? '')}
          placeholder="Leave empty to inherit"
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Padding Top ({merged.padding_top}px)</Label>
            <Slider
              value={[merged.padding_top]}
              onValueChange={([v]) => update('padding_top', v)}
              min={0}
              max={200}
              step={8}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Padding Bottom ({merged.padding_bottom}px)</Label>
            <Slider
              value={[merged.padding_bottom]}
              onValueChange={([v]) => update('padding_bottom', v)}
              min={0}
              max={200}
              step={8}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Content Max Width</Label>
          <Select value={merged.max_width} onValueChange={v => update('max_width', v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small (672px)</SelectItem>
              <SelectItem value="md">Medium (896px)</SelectItem>
              <SelectItem value="lg">Large (1152px)</SelectItem>
              <SelectItem value="xl">Extra Large (1280px)</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Section Border Radius ({merged.border_radius}px)</Label>
          <Slider
            value={[merged.border_radius]}
            onValueChange={([v]) => update('border_radius', v)}
            min={0}
            max={32}
            step={4}
          />
        </div>
      </section>

      {/* Reset */}
      {hasOverrides && (
        <Button
          variant="outline"
          size={tokens.button.card}
          className="w-full text-xs"
          onClick={() => onChange({})}
        >
          Reset All Styles
        </Button>
      )}
    </div>
  );
}

/** Check if style overrides contain any active values */
export function hasActiveStyleOverrides(value?: Partial<StyleOverrides> | null): boolean {
  if (!value) return false;
  return Object.keys(value).some(k => {
    const v = value[k as keyof StyleOverrides];
    return v !== undefined && v !== '' && v !== 0 && v !== 'none' && v !== 'full';
  });
}
