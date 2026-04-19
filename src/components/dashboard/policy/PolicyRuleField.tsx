/**
 * Schema-driven rule field renderer (Wave 28.4)
 *
 * Renders one field of a configurator schema. Pure UI — value is owned by parent.
 */
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { RuleField } from '@/lib/policy/configurator-schemas';

interface PolicyRuleFieldProps {
  field: RuleField;
  value: unknown;
  onChange: (next: unknown) => void;
}

export function PolicyRuleField({ field, value, onChange }: PolicyRuleFieldProps) {
  const id = `pf-${field.key}`;

  const labelEl = (
    <Label htmlFor={id} className="font-sans text-sm flex items-center gap-1">
      {field.label}
      {field.required && <span className="text-destructive">*</span>}
      {field.unit && <span className="text-muted-foreground font-sans text-xs">({field.unit})</span>}
    </Label>
  );

  const helperEl = field.helper ? (
    <p className="font-sans text-xs text-muted-foreground mt-1">{field.helper}</p>
  ) : null;

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
        </div>
      );
    }

    case 'boolean':
      return (
        <div className="flex items-start justify-between gap-4 py-1">
          <div className="flex-1">
            {labelEl}
            {helperEl}
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
