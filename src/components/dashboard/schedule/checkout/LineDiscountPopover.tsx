import { useState } from 'react';
import { Percent, DollarSign, Ban, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { cn } from '@/lib/utils';
import type { CheckoutLineDiscount, CheckoutDiscountType } from '@/hooks/useCheckoutCart';

const WAIVE_REASONS = ['Comp', 'Service Recovery', 'Manager Comp', 'Other'] as const;

interface LineDiscountPopoverProps {
  current: CheckoutLineDiscount | null;
  /** Max % allowed (e.g. 20 for stylists, 100 for managers). 100 = no cap. */
  maxPercent?: number;
  /** When true, the user can choose 'waive'. */
  canWaive?: boolean;
  onApply: (discount: CheckoutLineDiscount) => void;
  onClear: () => void;
  /** Trigger button label override */
  triggerLabel?: string;
}

export function LineDiscountPopover({
  current,
  maxPercent = 100,
  canWaive = true,
  onApply,
  onClear,
  triggerLabel,
}: LineDiscountPopoverProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CheckoutDiscountType>(current?.type ?? 'pct');
  const [value, setValue] = useState<string>(
    current && current.type !== 'waive' ? String(current.value) : '',
  );
  const [reason, setReason] = useState<string>(current?.reason ?? 'Comp');
  const [otherReason, setOtherReason] = useState<string>('');

  const handleApply = () => {
    const numValue = parseFloat(value);
    if (type === 'waive') {
      const finalReason = reason === 'Other' ? otherReason.trim() || 'Other' : reason;
      onApply({ type: 'waive', value: 0, reason: finalReason });
      setOpen(false);
      return;
    }
    if (isNaN(numValue) || numValue <= 0) return;
    if (type === 'pct' && numValue > maxPercent) return;
    onApply({ type, value: numValue, reason: null });
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
    setValue('');
    setOpen(false);
  };

  const triggerText = (() => {
    if (triggerLabel) return triggerLabel;
    if (!current) return 'Discount';
    if (current.type === 'waive') return 'Waived';
    if (current.type === 'pct') return `−${current.value}%`;
    return `−$${current.value.toFixed(2)}`;
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 px-2 text-xs font-sans font-medium',
            current?.type === 'waive' && 'text-warning hover:text-warning',
            current && current.type !== 'waive' && 'text-foreground',
            !current && 'text-muted-foreground hover:text-foreground',
          )}
        >
          {triggerText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Discount Type</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setType('pct')}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                  type === 'pct'
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/50',
                )}
              >
                <Percent className="h-3 w-3" />
                Percent
              </button>
              <button
                type="button"
                onClick={() => setType('amt')}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                  type === 'amt'
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/50',
                )}
              >
                <DollarSign className="h-3 w-3" />
                Amount
              </button>
              <button
                type="button"
                onClick={() => setType('waive')}
                disabled={!canWaive}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                  type === 'waive'
                    ? 'border-warning bg-warning/10 text-warning'
                    : 'border-border text-muted-foreground hover:bg-muted/50',
                  !canWaive && 'opacity-40 cursor-not-allowed',
                )}
              >
                <Ban className="h-3 w-3" />
                Waive
              </button>
            </div>
          </div>

          {type !== 'waive' ? (
            <div>
              <Label className="text-xs text-muted-foreground">
                {type === 'pct' ? `Percent off (max ${maxPercent}%)` : 'Amount off'}
              </Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {type === 'pct' ? '%' : '$'}
                </span>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className="pl-7 h-9"
                  min={0}
                  max={type === 'pct' ? maxPercent : undefined}
                  step="0.01"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Reason (required)</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="mt-1.5 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WAIVE_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-sm">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {reason === 'Other' && (
                <Input
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Specify reason"
                  className="h-9 text-sm"
                  autoFocus
                />
              )}
              <p className="text-[11px] text-muted-foreground">
                Waiving sets the line to $0. This action is logged.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {current && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 px-2 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Remove
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleApply}
              className="ml-auto h-8 px-3 text-xs font-medium"
              disabled={
                type !== 'waive' &&
                (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0)
              }
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
