import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── GlyphPicker ──
// Generic pill-button row of icons (+ optional "off"/"none" state).
// Lifted from EyebrowIconPicker so hero badges, announcement bars, and CTA
// chips can reuse the same affordance instead of forking it.
//
// The "active" option borrows an optional accent color so the picker doubles
// as a brand-color preview surface (e.g. eyebrow + accent in one glance).

export type GlyphPickerOption<V extends string = string> = {
  value: V;
  label: string;
  /** Lucide icon component. Pass `null` for the off/none state. */
  icon: LucideIcon | null;
};

export interface GlyphPickerProps<V extends string = string> {
  options: GlyphPickerOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name for the radiogroup (e.g. "Eyebrow icon"). */
  ariaLabel: string;
  /** Optional brand accent applied to the active glyph color. */
  accent?: string;
  /** Label rendered inside the empty-state tile. Defaults to "Off". */
  emptyLabel?: string;
  /**
   * Caption rendered under the row when the empty option is selected.
   * Provides a more legible active-state hint than the ring alone.
   */
  emptyCaption?: string;
  className?: string;
}

export function GlyphPicker<V extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  accent,
  emptyLabel = 'Off',
  emptyCaption,
  className,
}: GlyphPickerProps<V>) {
  const accentColor = accent || 'hsl(var(--primary))';
  const activeOption = options.find((o) => o.value === value);
  const showEmptyCaption = Boolean(emptyCaption) && activeOption?.icon === null;
  return (
    <div className={cn('inline-flex flex-col items-start gap-1', className)}>
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 h-9',
      )}
    >
      {options.map(({ value: optValue, label, icon: Icon }) => {
        const active = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(optValue)}
            className={cn(
              'h-7 w-7 rounded-full inline-flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground',
              active && 'bg-muted text-foreground',
            )}
            style={active && Icon ? { color: accentColor } : undefined}
          >
            {Icon ? (
              <Icon className="h-3.5 w-3.5" />
            ) : (
              <span className="text-[9px] font-display uppercase tracking-wider">
                {emptyLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
      {showEmptyCaption ? (
        <span className="pl-3 text-[10px] font-sans text-muted-foreground">
          {emptyCaption}
        </span>
      ) : null}
    </div>
  );
}
