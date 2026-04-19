import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, TrendingUp, Info } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  useBulkUpdateServices,
  useBulkPriceImpactPreview,
  type BulkServicePatch,
} from '@/hooks/useBulkUpdateServices';
import type { Service } from '@/hooks/useServicesData';
import type { ServiceCategoryColor } from '@/hooks/useServiceCategoryColors';

interface BulkEditServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedServices: Service[];
  categories: ServiceCategoryColor[];
  organizationId: string | null | undefined;
  onComplete?: () => void;
}

type PriceMode = 'percent' | 'flat-add' | 'flat-set';
type DurationMode = 'minutes-add' | 'minutes-set';

export function BulkEditServicesDialog({
  open,
  onOpenChange,
  selectedServices,
  categories,
  organizationId,
  onComplete,
}: BulkEditServicesDialogProps) {
  const { formatCurrency } = useFormatCurrency();
  const bulkUpdate = useBulkUpdateServices();

  // Per-field "change this" toggles
  const [changePrice, setChangePrice] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceMode>('percent');
  const [priceValue, setPriceValue] = useState('');

  const [changeDuration, setChangeDuration] = useState(false);
  const [durationMode, setDurationMode] = useState<DurationMode>('minutes-add');
  const [durationValue, setDurationValue] = useState('');

  const [changeCategory, setChangeCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const [changeOnline, setChangeOnline] = useState(false);
  const [onlineValue, setOnlineValue] = useState(true);

  const [changeActive, setChangeActive] = useState(false);
  const [activeValue, setActiveValue] = useState(true);

  const [changePatchTest, setChangePatchTest] = useState(false);
  const [patchTestValue, setPatchTestValue] = useState(false);

  const ids = useMemo(() => selectedServices.map((s) => s.id), [selectedServices]);

  // Impact preview based on trailing 30-day completed volume
  const { data: impact } = useBulkPriceImpactPreview(ids, organizationId);

  const projectedMonthlyDelta = useMemo(() => {
    if (!changePrice || !impact) return null;
    const value = parseFloat(priceValue);
    if (!Number.isFinite(value)) return null;

    let delta = 0;
    for (const svc of selectedServices) {
      const volume = impact.volumeByService[svc.id] ?? 0;
      if (volume === 0) continue;
      const currentPrice = svc.price ?? 0;
      let nextPrice = currentPrice;
      if (priceMode === 'percent') nextPrice = currentPrice * (1 + value / 100);
      else if (priceMode === 'flat-add') nextPrice = currentPrice + value;
      else if (priceMode === 'flat-set') nextPrice = value;
      delta += (nextPrice - currentPrice) * volume;
    }
    return delta;
  }, [changePrice, impact, priceValue, priceMode, selectedServices]);

  const reset = () => {
    setChangePrice(false); setPriceValue(''); setPriceMode('percent');
    setChangeDuration(false); setDurationValue(''); setDurationMode('minutes-add');
    setChangeCategory(false); setNewCategory('');
    setChangeOnline(false); setOnlineValue(true);
    setChangeActive(false); setActiveValue(true);
    setChangePatchTest(false); setPatchTestValue(false);
  };

  const handleApply = () => {
    const shared: BulkServicePatch['shared'] = {};
    const perId: BulkServicePatch['perId'] = {};

    if (changeCategory && newCategory) shared.category = newCategory;
    if (changeOnline) shared.bookable_online = onlineValue;
    if (changeActive) shared.is_active = activeValue;
    if (changePatchTest) shared.patch_test_required = patchTestValue;

    if (changePrice) {
      const v = parseFloat(priceValue);
      if (Number.isFinite(v)) {
        for (const svc of selectedServices) {
          const cur = svc.price ?? 0;
          let next = cur;
          if (priceMode === 'percent') next = cur * (1 + v / 100);
          else if (priceMode === 'flat-add') next = cur + v;
          else if (priceMode === 'flat-set') next = v;
          perId[svc.id] = { ...(perId[svc.id] ?? {}), price: Math.round(next * 100) / 100 };
        }
      }
    }

    if (changeDuration) {
      const v = parseInt(durationValue, 10);
      if (Number.isFinite(v)) {
        for (const svc of selectedServices) {
          const cur = svc.duration_minutes ?? 0;
          const next = durationMode === 'minutes-add' ? cur + v : v;
          perId[svc.id] = { ...(perId[svc.id] ?? {}), duration_minutes: Math.max(0, next) };
        }
      }
    }

    bulkUpdate.mutate(
      { ids, patch: { shared, perId } },
      {
        onSuccess: () => {
          reset();
          onComplete?.();
          onOpenChange(false);
        },
      },
    );
  };

  const hasAnyChange =
    changePrice || changeDuration || changeCategory || changeOnline || changeActive || changePatchTest;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk edit services</DialogTitle>
          <DialogDescription>
            Apply changes to {selectedServices.length}{' '}
            {selectedServices.length === 1 ? 'service' : 'services'}. Toggle each field you want to change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Price */}
          <FieldBlock
            checked={changePrice}
            onCheckedChange={setChangePrice}
            label="Adjust price"
          >
            <div className="flex gap-2">
              <Select value={priceMode} onValueChange={(v) => setPriceMode(v as PriceMode)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">By percent</SelectItem>
                  <SelectItem value="flat-add">Add amount</SelectItem>
                  <SelectItem value="flat-set">Set to</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder={priceMode === 'percent' ? 'e.g. 5' : 'e.g. 10.00'}
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
              />
              <span className="flex items-center text-sm text-muted-foreground w-6">
                {priceMode === 'percent' ? '%' : '$'}
              </span>
            </div>
            {projectedMonthlyDelta !== null && (
              <div className="flex items-start gap-2 mt-2 rounded-md bg-muted/40 p-2.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    {projectedMonthlyDelta >= 0 ? 'Projected uplift' : 'Projected reduction'}:{' '}
                    {formatCurrency(Math.abs(projectedMonthlyDelta))}/mo
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Based on {impact?.totalVolume ?? 0} bookings in the last 30 days. Excludes services with no recent volume.
                  </p>
                </div>
              </div>
            )}
          </FieldBlock>

          {/* Duration */}
          <FieldBlock
            checked={changeDuration}
            onCheckedChange={setChangeDuration}
            label="Adjust duration"
          >
            <div className="flex gap-2">
              <Select value={durationMode} onValueChange={(v) => setDurationMode(v as DurationMode)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes-add">Add minutes</SelectItem>
                  <SelectItem value="minutes-set">Set to</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="5"
                placeholder="e.g. 15"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
              />
              <span className="flex items-center text-sm text-muted-foreground w-10">min</span>
            </div>
          </FieldBlock>

          {/* Category */}
          <FieldBlock
            checked={changeCategory}
            onCheckedChange={setChangeCategory}
            label="Move to category"
          >
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.category_name}>{c.category_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>

          {/* Online bookable */}
          <FieldBlock
            checked={changeOnline}
            onCheckedChange={setChangeOnline}
            label="Bookable online"
          >
            <div className="flex items-center gap-2">
              <Switch checked={onlineValue} onCheckedChange={setOnlineValue} />
              <span className="text-sm text-muted-foreground">
                {onlineValue ? 'Visible on public booking site' : 'Hidden from public booking'}
              </span>
            </div>
          </FieldBlock>

          {/* Active */}
          <FieldBlock
            checked={changeActive}
            onCheckedChange={setChangeActive}
            label="Active status"
          >
            <div className="flex items-center gap-2">
              <Switch checked={activeValue} onCheckedChange={setActiveValue} />
              <span className="text-sm text-muted-foreground">
                {activeValue ? 'Active' : 'Inactive (cannot be booked)'}
              </span>
            </div>
          </FieldBlock>

          {/* Patch test required (Wave 2 guardrail) */}
          <FieldBlock
            checked={changePatchTest}
            onCheckedChange={setChangePatchTest}
            label="Patch test required"
          >
            <div className="flex items-center gap-2">
              <Switch checked={patchTestValue} onCheckedChange={setPatchTestValue} />
              <span className="text-sm text-muted-foreground">
                {patchTestValue ? 'Block booking without valid patch test' : 'No patch test gate'}
              </span>
            </div>
          </FieldBlock>

          {!hasAnyChange && (
            <div className="flex items-start gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Toggle one or more fields above to enable bulk changes.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bulkUpdate.isPending}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!hasAnyChange || bulkUpdate.isPending}>
            {bulkUpdate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply to {selectedServices.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldBlockProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  children: React.ReactNode;
}

function FieldBlock({ checked, onCheckedChange, label, children }: FieldBlockProps) {
  return (
    <div className={cn('rounded-lg border border-border p-3 space-y-2.5 transition-colors', checked && 'bg-muted/30')}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`bulk-${label}`}
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
        />
        <Label htmlFor={`bulk-${label}`} className={cn(tokens.body.emphasis, 'cursor-pointer')}>
          {label}
        </Label>
      </div>
      {checked && <div className="pl-6">{children}</div>}
    </div>
  );
}
