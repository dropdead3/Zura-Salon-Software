/**
 * SectionTextColorsEditor — universal per-section color override editor.
 *
 * Models the same shape Hero already uses (`HeroTextColors`) but renders only
 * the slots a given section actually has. Each section editor declares its
 * own slot list (e.g. FAQ has `heading + eyebrow + question + answer + accent`,
 * Testimonials adds `star`, Footer CTA adds primary/secondary button colors).
 *
 * SHARED INPUT: every row is a `<ThemeAwareColorInput>` — reuses the canonical
 * theme-token swatches, "in-use" swatches, custom hex picker, and the
 * resolution-scope contract (resolves against the WEBSITE theme, not the
 * dashboard `<html>`). Do NOT roll a new color picker.
 *
 * EMPTY = INHERIT: an empty / undefined value means "fall back to the active
 * theme's foreground" — exactly the same semantics as Hero's text_colors.
 * Empty keys are stripped on every change so dirty-state stays clean and the
 * Save bar doesn't activate from `'' === undefined` churn.
 *
 * This is the layer the `Per-Section Color Editing` plan slots into; section
 * editors wire in 5 lines:
 *
 *   <SectionTextColorsEditor
 *     value={localConfig.text_colors}
 *     onChange={(v) => updateField('text_colors', v)}
 *     slots={FAQ_COLOR_SLOTS}
 *   />
 */
import { useState, type ReactNode } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Palette, RotateCcw } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ThemeAwareColorInput } from '@/components/dashboard/website-editor/inputs/ThemeAwareColorInput';
import { SectionSubhead } from '@/components/dashboard/website-editor/SectionSubhead';
import type { SectionTextColors, SectionColorSlotKey } from '@/lib/sectionTextColors';

export type { SectionTextColors, SectionColorSlotKey };

export interface SectionColorSlot {
  key: SectionColorSlotKey;
  label: string;
  /** Optional group heading. Slots sharing a group render under one subhead. */
  group?: string;
  /** Optional helper text rendered under the label. */
  hint?: string;
}

interface SectionTextColorsEditorProps {
  value: SectionTextColors | undefined;
  onChange: (next: SectionTextColors) => void;
  slots: readonly SectionColorSlot[];
  /** Compact = collapsible inline panel (e.g. inside a slide row).
   *  Full = standalone EditorCard-style block. */
  compact?: boolean;
  /** Title rendered when not compact (and on the collapsible toggle). */
  title?: string;
  /** Helper paragraph rendered below the title when not compact. */
  description?: string;
  /** Inheritance hint shown when the operator hasn't picked anything. */
  inheritanceHint?: ReactNode;
}

export function SectionTextColorsEditor({
  value,
  onChange,
  slots,
  compact = false,
  title = 'Section Colors',
  description,
  inheritanceHint,
}: SectionTextColorsEditorProps) {
  const colors = value ?? {};
  const [open, setOpen] = useState(!compact);

  const update = (key: SectionColorSlotKey, next: string | undefined) => {
    const merged: SectionTextColors = { ...colors, [key]: next };
    // Strip empty keys so dirty-state stays clean and inheritance works.
    (Object.keys(merged) as SectionColorSlotKey[]).forEach((k) => {
      if (!merged[k]) delete merged[k];
    });
    onChange(merged);
  };

  const hasAny = Object.values(colors).some((v) => !!v);

  // Group slots in declaration order. Slots without a group form a single
  // anonymous "Text" block at the top.
  const grouped: { group: string | null; slots: SectionColorSlot[] }[] = [];
  for (const slot of slots) {
    const groupKey = slot.group ?? null;
    const last = grouped[grouped.length - 1];
    if (last && last.group === groupKey) {
      last.slots.push(slot);
    } else {
      grouped.push({ group: groupKey, slots: [slot] });
    }
  }

  const body = (
    <div className="space-y-4">
      {grouped.map((block, idx) => (
        <div
          key={`${block.group ?? 'text'}-${idx}`}
          className={idx > 0 ? 'space-y-3 pt-3 border-t border-border/40' : 'space-y-3'}
        >
          {block.group && <SectionSubhead>{block.group}</SectionSubhead>}
          {block.slots.map((slot) => (
            <div key={slot.key} className="space-y-1">
              <ThemeAwareColorInput
                label={slot.label}
                value={colors[slot.key]}
                onChange={(v) => update(slot.key, v)}
              />
              {slot.hint && (
                <p className="text-[11px] text-muted-foreground">{slot.hint}</p>
              )}
            </div>
          ))}
        </div>
      ))}

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
          {inheritanceHint ?? 'Inherits the active site theme. Pick any color above to override.'}
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
            <span>{title}</span>
            {hasAny && (
              <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/70">Custom</span>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">{body}</CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="space-y-3 pt-4 border-t border-border/30">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">{title}</h4>
        {hasAny && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/60">
            Custom
          </span>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {body}
    </div>
  );
}
