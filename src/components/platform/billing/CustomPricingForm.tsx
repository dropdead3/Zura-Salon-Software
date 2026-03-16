import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Switch } from '@/components/ui/switch';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import type { DiscountType } from '@/hooks/useOrganizationBilling';

interface CustomPricingFormProps {
  customPriceEnabled: boolean;
  onCustomPriceEnabledChange: (enabled: boolean) => void;
  customPrice: number | null;
  onCustomPriceChange: (price: number | null) => void;
  discountType: DiscountType | null;
  onDiscountTypeChange: (type: DiscountType | null) => void;
  discountValue: number | null;
  onDiscountValueChange: (value: number | null) => void;
  discountReason: string | null;
  onDiscountReasonChange: (reason: string | null) => void;
  basePrice: number;
}

const discountReasonOptions = [
  { value: 'negotiation', label: 'Negotiated Rate' },
  { value: 'partner', label: 'Partner Discount' },
  { value: 'referral', label: 'Referral Discount' },
  { value: 'loyalty', label: 'Loyalty Discount' },
  { value: 'promotional', label: 'Promotional Offer' },
  { value: 'other', label: 'Other' },
];

export function CustomPricingForm({
  customPriceEnabled,
  onCustomPriceEnabledChange,
  customPrice,
  onCustomPriceChange,
  discountType,
  onDiscountTypeChange,
  discountValue,
  onDiscountValueChange,
  discountReason,
  onDiscountReasonChange,
  basePrice,
}: CustomPricingFormProps) {
  const { formatCurrencyWhole } = useFormatCurrency();

  return (
    <div className="space-y-4">
      {/* Custom Price Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div>
          <PlatformLabel className="text-sm font-medium">Custom Pricing</PlatformLabel>
          <p className="text-xs text-slate-500 mt-0.5">Override the standard plan price</p>
        </div>
        <Switch
          checked={customPriceEnabled}
          onCheckedChange={onCustomPriceEnabledChange}
        />
      </div>

      {customPriceEnabled && (
        <div className="space-y-4 pl-4 border-l-2 border-violet-500/30">
          {/* Custom Price Input */}
          <div className="space-y-2">
            <PlatformLabel htmlFor="customPrice">Custom Monthly Price</PlatformLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <PlatformInput
                id="customPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder={basePrice.toString()}
                value={customPrice ?? ''}
                onChange={(e) => onCustomPriceChange(e.target.value ? parseFloat(e.target.value) : null)}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-slate-500">Base price: {formatCurrencyWhole(basePrice)}/mo</p>
          </div>

          {/* OR use discount */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex-1 border-t border-slate-700" />
            <span>OR apply a discount</span>
            <div className="flex-1 border-t border-slate-700" />
          </div>

          {/* Discount Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <PlatformLabel>Discount Type</PlatformLabel>
              <Select
                value={discountType ?? 'none'}
                onValueChange={(v) => onDiscountTypeChange(v === 'none' ? null : v as DiscountType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No discount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No discount</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {discountType && (
              <div className="space-y-2">
                <PlatformLabel>Discount Value</PlatformLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {discountType === 'percentage' ? '%' : '$'}
                  </span>
                  <PlatformInput
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? 100 : undefined}
                    step={discountType === 'percentage' ? 1 : 0.01}
                    value={discountValue ?? ''}
                    onChange={(e) => onDiscountValueChange(e.target.value ? parseFloat(e.target.value) : null)}
                    className="pl-7"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Discount Reason */}
          {(customPrice !== null || discountType) && (
            <div className="space-y-2">
              <PlatformLabel>Reason for Discount</PlatformLabel>
              <Select
                value={discountReason ?? 'none'}
                onValueChange={(v) => onDiscountReasonChange(v === 'none' ? null : v)}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-slate-300">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-slate-300">Select reason</SelectItem>
                  {discountReasonOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-slate-300">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
