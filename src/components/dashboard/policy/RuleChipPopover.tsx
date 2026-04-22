/**
 * RuleChipPopover (Wave 28.15)
 *
 * Inline pill that renders the *humanized* current value of a single rule
 * field inside policy prose. Clicking the chip opens a small popover that
 * mounts the same `PolicyRuleField` control the Expert form uses, so the
 * editing affordance is identical regardless of surface.
 *
 * Doctrine: chips are a presentation choice, not a new data path. The
 * underlying schema field, validators, and rule values are the source of
 * truth — the chip just removes the ceremony of a separate form.
 */
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PolicyRuleField } from './PolicyRuleField';
import type { RuleField } from '@/lib/policy/configurator-schemas';
import type { PolicyAudience } from '@/hooks/policy/usePolicyData';
import { humanize } from '@/lib/policy/render-starter-draft';

interface Props {
  field: RuleField;
  value: unknown;
  audience: PolicyAudience;
  onChange: (next: unknown) => void;
  /** Optional disabled state for archived policies. */
  disabled?: boolean;
}

export function RuleChipPopover({ field, value, audience, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);

  // Honor field-level `humanizeAs` overrides so booleans can read as
  // "required / not required" inside the surrounding sentence rather than
  // the generic "yes / no". Falls through to the shared humanize helper.
  const humanizeKey =
    value === null || value === undefined ? '' : String(value);
  const display =
    field.humanizeAs && humanizeKey in field.humanizeAs
      ? field.humanizeAs[humanizeKey]
      : humanize(value);
  const isUnset = value === null || value === undefined || value === '';

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5',
            'font-sans text-sm leading-tight align-baseline',
            'border border-primary/30 bg-primary/10 text-foreground',
            'hover:bg-primary/15 hover:border-primary/40 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            isUnset && 'border-dashed text-muted-foreground italic',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
          aria-label={`Edit ${field.label}`}
        >
          <span className="whitespace-nowrap">{isUnset ? `set ${field.label.toLowerCase()}` : display}</span>
          <ChevronDown className="w-3 h-3 self-center text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-4 space-y-3">
        <div className="space-y-1">
          <p className="font-display text-[10px] tracking-wider uppercase text-muted-foreground">
            Inline rule
          </p>
        </div>
        <PolicyRuleField
          field={field}
          value={draft}
          audience={audience}
          onChange={setDraft}
        />
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="font-sans"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
            className="font-sans"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
