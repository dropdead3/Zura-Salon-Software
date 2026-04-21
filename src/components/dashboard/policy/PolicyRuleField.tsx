/**
 * Schema-driven rule field renderer (Wave 28.4)
 *
 * Renders one field of a configurator schema. Pure UI — value is owned by parent.
 *
 * Wave 28.13.x — also renders an optional provenance helper line beneath the
 * standard `helper` text when `field.provenance` is declared in the schema.
 * The line documents origin (Prefilled), surface (where it renders), and
 * edit contract (operator edits are sacred). See `buildProvenanceLine`.
 */
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { cn } from '@/lib/utils';
import type { RuleField } from '@/lib/policy/configurator-schemas';
import {
  buildProvenanceLine,
  type PolicyAudience,
} from '@/lib/policy/build-provenance-line';

interface PolicyRuleFieldProps {
  field: RuleField;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Policy audience — drives the surface sentence in the provenance helper. */
  audience?: PolicyAudience;
  /**
   * Wave 28.14.1 — In the questionnaire context the provenance helper renders
   * as a right-side column on `xl+` viewports so it never pushes the input
   * downward. Default `inline` preserves Expert-view behavior unchanged.
   */
  helperPlacement?: 'inline' | 'side';
}

function ProvenanceHelper({
  field,
  audience,
  sideMode = false,
}: {
  field: RuleField;
  audience: PolicyAudience;
  sideMode?: boolean;
}) {
  const line = buildProvenanceLine(field, audience);
  if (!line) return null;
  return (
    <div
      className={cn(
        'flex items-start gap-2 flex-wrap',
        sideMode
          ? 'rounded-lg border border-border/50 bg-muted/30 p-3'
          : 'border-t border-border/40 pt-2 mt-1',
      )}
    >
      {line.showPrefilledBadge && (
        <Badge
          variant="outline"
          className="font-display text-[10px] tracking-wider uppercase px-1.5 py-0 h-4 leading-none"
        >
          Prefilled
        </Badge>
      )}
      <p className="font-sans text-xs text-muted-foreground flex-1 min-w-0 leading-relaxed">
        {line.segments.map((seg, i) =>
          seg.kind === 'token' ? (
            <code
              key={i}
              className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted text-foreground"
            >
              {seg.value}
            </code>
          ) : (
            <span key={i}>{seg.value}</span>
          ),
        )}
      </p>
    </div>
  );
}

export function PolicyRuleField({ field, value, onChange, audience = 'internal', helperPlacement = 'inline' }: PolicyRuleFieldProps) {
  const id = `pf-${field.key}`;

  const labelEl = (
    <Label htmlFor={id} className="font-sans text-sm flex items-center gap-1">
      {field.label}
      {field.required && <span className="text-destructive">*</span>}
      {field.unit && <span className="text-muted-foreground font-sans text-xs">({field.unit})</span>}
      {field.tooltip && <MetricInfoTooltip description={field.tooltip} />}
    </Label>
  );

  const helperEl = field.helper ? (
    <p className="font-sans text-xs text-muted-foreground mt-1">{field.helper}</p>
  ) : null;

  const provenanceLine = buildProvenanceLine(field, audience);
  const provenanceEl = <ProvenanceHelper field={field} audience={audience} />;

  /**
   * `side` placement: the input occupies a left column (max-w-[640px] for
   * comfortable reading width) and the provenance helper floats as a slim
   * right column on xl+ viewports. Below xl, falls back to stacked.
   * Only activates when there's actually provenance content to show.
   */
  const sideMode = helperPlacement === 'side' && !!provenanceLine;
  const wrap = (input: React.ReactNode) => {
    if (!sideMode) {
      return (
        <>
          {input}
          {helperEl}
          {provenanceEl}
        </>
      );
    }
    return (
      <>
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px] gap-4 xl:gap-6 items-start">
          <div className="min-w-0 max-w-[640px]">
            {input}
            {helperEl}
          </div>
          <div className="xl:pt-1">
            <ProvenanceHelper field={field} audience={audience} sideMode />
          </div>
        </div>
      </>
    );
  };

  switch (field.type) {
    case 'number':
    case 'currency':
    case 'percent': {
      const num = typeof value === 'number' ? value : value === undefined || value === null ? '' : Number(value);
      return (
        <div className="space-y-1.5">
          {labelEl}
          <div className="relative">
            {field.type === 'currency' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-sans text-sm">$</span>
            )}
            <Input
              id={id}
              type="number"
              inputMode="decimal"
              value={num}
              placeholder={field.placeholder}
              onChange={(e) => {
                const v = e.target.value;
                onChange(v === '' ? null : Number(v));
              }}
              className={cn('font-sans', field.type === 'currency' && 'pl-7')}
            />
            {field.type === 'percent' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-sans text-sm">%</span>
            )}
          </div>
          {helperEl}
          {provenanceEl}
        </div>
      );
    }

    case 'text':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            id={id}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="font-sans"
          />
          {helperEl}
          {provenanceEl}
        </div>
      );

    case 'longtext':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Textarea
            id={id}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="font-sans min-h-[80px]"
          />
          {helperEl}
          {provenanceEl}
        </div>
      );

    case 'select':
    case 'role':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Select
            value={typeof value === 'string' ? value : ''}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger id={id} className="font-sans">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="font-sans">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helperEl}
          {provenanceEl}
        </div>
      );

    case 'multiselect': {
      const arr: string[] = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (val: string) => {
        if (arr.includes(val)) onChange(arr.filter((v) => v !== val));
        else onChange([...arr, val]);
      };
      return (
        <div className="space-y-1.5">
          {labelEl}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border p-3 bg-muted/30">
            {field.options?.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer font-sans text-sm"
              >
                <Checkbox
                  checked={arr.includes(opt.value)}
                  onCheckedChange={() => toggle(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          {helperEl}
          {provenanceEl}
        </div>
      );
    }

    case 'boolean':
      return (
        <div className="flex items-start justify-between gap-4 py-1">
          <div className="flex-1">
            {labelEl}
            {helperEl}
            {provenanceEl}
          </div>
          <Switch
            id={id}
            checked={value === true}
            onCheckedChange={(v) => onChange(v)}
          />
        </div>
      );

    default:
      return null;
  }
}
