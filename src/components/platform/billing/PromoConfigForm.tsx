import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { Sparkles } from 'lucide-react';
import { formatCurrency } from '@/hooks/useBillingCalculations';

interface PromoConfigFormProps {
  promoEnabled: boolean;
  onPromoEnabledChange: (enabled: boolean) => void;
  promoMonths: number | null;
  onPromoMonthsChange: (months: number | null) => void;
  promoPrice: number | null;
  onPromoPriceChange: (price: number | null) => void;
  basePrice: number;
}

const quickPromoOptions = [
  { months: 1, discount: 100, label: 'First month free' },
  { months: 3, discount: 50, label: '50% off first 3 months' },
  { months: 6, discount: 25, label: '25% off first 6 months' },
];

export function PromoConfigForm({
  promoEnabled,
  onPromoEnabledChange,
  promoMonths,
  onPromoMonthsChange,
  promoPrice,
  onPromoPriceChange,
  basePrice,
}: PromoConfigFormProps) {
  const applyQuickPromo = (months: number, discountPercent: number) => {
    onPromoMonthsChange(months);
    onPromoPriceChange(basePrice * (1 - discountPercent / 100));
    if (!promoEnabled) {
      onPromoEnabledChange(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Promo Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--platform-bg-card)/0.5)] border border-[hsl(var(--platform-border)/0.5)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
          <div>
            <PlatformLabel className="text-sm font-medium">Promotional Pricing</PlatformLabel>
            <p className="text-xs text-[hsl(var(--platform-foreground-subtle))] mt-0.5">Offer introductory pricing that reverts to regular rate</p>
          </div>
        </div>
        <Switch
          checked={promoEnabled}
          onCheckedChange={onPromoEnabledChange}
        />
      </div>

      {promoEnabled && (
        <div className="space-y-4 pl-4 border-l-2 border-violet-500/30">
          {/* Quick Promo Options */}
          <div className="space-y-2">
            <PlatformLabel className="text-xs text-[hsl(var(--platform-muted))]">Quick Options</PlatformLabel>
            <div className="flex flex-wrap gap-2">
              {quickPromoOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => applyQuickPromo(opt.months, opt.discount)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Promo Config */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <PlatformLabel htmlFor="promoMonths">Duration (months)</PlatformLabel>
              <PlatformInput
                id="promoMonths"
                type="number"
                min="1"
                max="24"
                placeholder="3"
                value={promoMonths ?? ''}
                onChange={(e) => onPromoMonthsChange(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <PlatformLabel htmlFor="promoPrice">Promo Price</PlatformLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--platform-muted))]">$</span>
                <PlatformInput
                  id="promoPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={basePrice.toString()}
                  value={promoPrice ?? ''}
                  onChange={(e) => onPromoPriceChange(e.target.value ? parseFloat(e.target.value) : null)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {promoMonths && promoPrice !== null && (
            <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/30">
              <p className="text-sm text-violet-300">
                <span className="font-medium">{formatCurrency(promoPrice)}/mo</span>
                <span className="text-violet-400"> for first {promoMonths} month{promoMonths > 1 ? 's' : ''}</span>
              </p>
              <p className="text-xs text-violet-400/70 mt-1">
                Then {formatCurrency(basePrice)}/mo regular rate
              </p>
              <p className="text-xs text-emerald-400 mt-2">
                Customer saves {formatCurrency((basePrice - promoPrice) * promoMonths)} during promo
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}