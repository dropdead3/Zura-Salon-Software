import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';

export interface ManagerOrderDiscount {
  type: 'pct' | 'amt';
  value: number;
  reason: string;
}

interface CartDiscountSectionProps {
  /** Net subtotal after line-level discounts but before order-level discount */
  baseSubtotal: number;
  current: ManagerOrderDiscount | null;
  /** Whether this user can apply a manager-level order discount */
  canApply: boolean;
  onApply: (discount: ManagerOrderDiscount) => void;
  onClear: () => void;
}

const REASONS = ['Manager Comp', 'Service Recovery', 'Loyalty', 'Other'] as const;

export function CartDiscountSection({
  baseSubtotal,
  current,
  canApply,
  onApply,
  onClear,
}: CartDiscountSectionProps) {
  const { formatCurrency } = useFormatCurrency();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<'pct' | 'amt'>(current?.type ?? 'pct');
  const [value, setValue] = useState<string>(current?.value.toString() ?? '');
  const [reason, setReason] = useState<string>(current?.reason ?? 'Manager Comp');
  const [otherReason, setOtherReason] = useState('');

  const handleApply = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;
    if (type === 'pct' && numValue > 100) return;
    const finalReason = reason === 'Other' ? otherReason.trim() || 'Other' : reason;
    onApply({ type, value: numValue, reason: finalReason });
    setEditing(false);
  };

  const handleClear = () => {
    onClear();
    setValue('');
    setEditing(false);
  };

  if (!canApply && !current) return null;

  if (current && !editing) {
    const amount =
      current.type === 'pct' ? baseSubtotal * (current.value / 100) : current.value;
    return (
      <div className="flex items-center justify-between text-sm rounded-md bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">Manager Discount</span>
          <span className="text-xs text-muted-foreground">· {current.reason}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium tabular-nums">−{formatCurrency(amount)}</span>
          {canApply && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditing(true)}
        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Tag className="h-3 w-3 mr-1.5" />
        Add Manager Discount
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Manager Discount</Label>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setEditing(false)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType('pct')}
          className={cn(
            'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
            type === 'pct'
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border text-muted-foreground hover:bg-muted/50',
          )}
        >
          Percent
        </button>
        <button
          type="button"
          onClick={() => setType('amt')}
          className={cn(
            'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
            type === 'amt'
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border text-muted-foreground hover:bg-muted/50',
          )}
        >
          Amount
        </button>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {type === 'pct' ? '%' : '$'}
        </span>
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className="pl-7 h-9 text-sm"
          min={0}
          max={type === 'pct' ? 100 : undefined}
          step="0.01"
        />
      </div>
      <Select value={reason} onValueChange={setReason}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REASONS.map((r) => (
            <SelectItem key={r} value={r} className="text-sm">
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {reason === 'Other' && (
        <Input
          value={otherReason}
          onChange={(e) => setOtherReason(e.target.value)}
          placeholder="Specify reason"
          className="h-9 text-sm"
        />
      )}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0}
          className="h-8 px-3 text-xs"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
