/**
 * HeroTextColorsEditor — color overrides for hero headline, subheadline, and
 * both CTA buttons. Empty values fall back to auto-contrast (white text on
 * media backgrounds, theme foreground otherwise). Used at the section level
 * and reused inside each slide row to override section-level values.
 */
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Palette, RotateCcw } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import type { HeroTextColors } from '@/hooks/useSectionConfig';
import { ThemeAwareColorInput } from '@/components/dashboard/website-editor/inputs/ThemeAwareColorInput';
import { SectionSubhead } from '@/components/dashboard/website-editor/SectionSubhead';

// Shim that preserves the legacy `<ColorRow label value onChange />` API
// used throughout this file. Behind the scenes it's the canonical
// `<ThemeAwareColorInput>` so every row gets the theme + in-use swatches
// — and so the eslint single-ownership doctrine for `<input type="color">`
// stays satisfied (no native picker lives in this file anymore).
function ColorRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  placeholder?: string;
}) {
  return (
    <ThemeAwareColorInput
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

interface HeroTextColorsEditorProps {
  value: HeroTextColors | undefined;
  onChange: (next: HeroTextColors) => void;
  /** Compact = inline inside SlideRow; full = standalone EditorCard-style. */
  compact?: boolean;
  /** Title shown when not compact. */
  title?: string;
  /** Description shown when not compact. */
  description?: string;
}

export function HeroTextColorsEditor({
  value,
  onChange,
  compact = false,
  title = 'Text & Buttons',
  description,
}: HeroTextColorsEditorProps) {
  const colors = value ?? {};
  const [open, setOpen] = useState(!compact);

  const update = (key: keyof HeroTextColors, next: string | undefined) => {
    const merged = { ...colors, [key]: next };
    // Strip empty keys so dirty-state stays clean and inheritance works.
    Object.keys(merged).forEach((k) => {
      if (!merged[k as keyof HeroTextColors]) delete merged[k as keyof HeroTextColors];
    });
    onChange(merged);
  };

  const hasAny = Object.values(colors).some((v) => !!v);

  const body = (
    <div className="space-y-4">
      {/* Order mirrors the live hero render stack: eyebrow → headline →
          subheadline → notes. Buttons follow in their own subheaded blocks. */}
      <div className="space-y-3">
        <SectionSubhead>Text</SectionSubhead>
        <ColorRow label="Eyebrow" value={colors.eyebrow} onChange={(v) => update('eyebrow', v)} />
        <ColorRow label="Headline" value={colors.headline} onChange={(v) => update('headline', v)} />
        <ColorRow label="Subheadline" value={colors.subheadline} onChange={(v) => update('subheadline', v)} />
        <ColorRow label="Notes (below buttons)" value={colors.notes} onChange={(v) => update('notes', v)} />
      </div>

      <div className="space-y-3 pt-3 border-t border-border/40">
        <SectionSubhead>Primary Button</SectionSubhead>
        <ColorRow label="Background" value={colors.primary_button_bg} onChange={(v) => update('primary_button_bg', v)} />
        <ColorRow label="Text" value={colors.primary_button_fg} onChange={(v) => update('primary_button_fg', v)} />
        <ColorRow
          label="Hover Background"
          value={colors.primary_button_hover_bg}
          onChange={(v) => update('primary_button_hover_bg', v)}
        />
      </div>

      <div className="space-y-3 pt-3 border-t border-border/40">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-display">Secondary Button</p>
        <ColorRow
          label="Border"
          value={colors.secondary_button_border}
          onChange={(v) => update('secondary_button_border', v)}
        />
        <ColorRow label="Text" value={colors.secondary_button_fg} onChange={(v) => update('secondary_button_fg', v)} />
        <ColorRow
          label="Hover Background"
          value={colors.secondary_button_hover_bg}
          onChange={(v) => update('secondary_button_hover_bg', v)}
        />
      </div>

      {hasAny && (
        <Button
          variant="outline"
          size={tokens.button.card}
          className="w-full gap-1.5 text-xs"
          onClick={() => onChange({})}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset all colors
        </Button>
      )}

      {!hasAny && (
        <p className="text-[11px] text-muted-foreground italic">
          Auto-contrast active — text turns white when a background photo or video is set, otherwise inherits the site theme.
        </p>
      )}
    </div>
  );

  if (compact) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
            <Palette className="h-3.5 w-3.5" />
            <span>Text &amp; Button Colors</span>
            {hasAny && <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/70">Custom</span>}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">{body}</CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">{title}</h4>
        {hasAny && <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/60">Custom</span>}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {body}
    </div>
  );
}
