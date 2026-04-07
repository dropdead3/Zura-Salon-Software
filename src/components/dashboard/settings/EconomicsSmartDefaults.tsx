/**
 * EconomicsSmartDefaults — "Zura computed these" card for first-time setup.
 * Shows auto-detected assumptions with source badges and accept/adjust flow.
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Sparkles, Check, Pencil, DollarSign, Percent, Clock, TrendingUp, Loader2, Palette, X, RotateCcw } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import type { EconomicsAssumptions } from '@/hooks/useCommissionEconomics';
import type { AutoDetectResult, SourceType } from '@/hooks/useAutoDetectEconomics';
import { BENCHMARKS } from '@/hooks/useAutoDetectEconomics';

interface EconomicsSmartDefaultsProps {
  detection: AutoDetectResult;
  onAccept: (assumptions: EconomicsAssumptions) => void;
  isSaving: boolean;
}

const SOURCE_BADGE: Record<SourceType, { label: string; className: string }> = {
  data: { label: 'From your data', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  estimate: { label: 'Industry avg', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

interface FieldConfig {
  key: keyof EconomicsAssumptions;
  label: string;
  description: string;
  tooltip: string;
  icon: typeof DollarSign;
  format: (v: number) => string;
  prefix?: string;
  suffix?: string;
  inputType: 'dollar' | 'percent' | 'number';
  min: number;
  max: number;
  step: number;
}

const FIELDS: FieldConfig[] = [
  {
    key: 'overhead_per_stylist',
    label: 'Overhead / Stylist',
    description: 'Your fixed monthly cost for each stylist — rent, utilities, insurance, supplies.',
    tooltip: 'Divide your total monthly fixed costs (rent, utilities, insurance, supplies, front desk) by the number of stylists.',
    icon: DollarSign,
    format: (v) => `$${v.toLocaleString()}/mo`,
    prefix: '$',
    inputType: 'dollar',
    min: 0,
    max: 20000,
    step: 100,
  },
  {
    key: 'product_cost_pct',
    label: 'Product Cost',
    description: 'How much of your service revenue goes to color, chemicals, and backbar.',
    tooltip: 'Chemical and backbar costs as a percentage of service revenue. Color-heavy salons typically run 10–15%, cut-focused salons 5–8%.',
    icon: Percent,
    format: (v) => `${(v * 100).toFixed(1)}%`,
    suffix: '%',
    inputType: 'percent',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: 'target_margin_pct',
    label: 'Target Margin',
    description: 'The profit you want left after paying all costs and commissions.',
    tooltip: 'Most salons operate at 8–15% net margin. "Sustainable" is 10–12%, "Growth" is 15–18%.',
    icon: TrendingUp,
    format: (v) => `${(v * 100).toFixed(0)}%`,
    suffix: '%',
    inputType: 'percent',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: 'hours_per_month',
    label: 'Hours / Month',
    description: 'Average booked hours per stylist — used to calculate hourly wage costs.',
    tooltip: 'A full-time stylist working 5 days × 8 hours = 160 hrs/mo. This is used to model hourly wage costs against commission revenue.',
    icon: Clock,
    format: (v) => `${v} hrs`,
    suffix: 'hrs',
    inputType: 'number',
    min: 40,
    max: 300,
    step: 8,
  },
];

export function EconomicsSmartDefaults({ detection, onAccept, isSaving }: EconomicsSmartDefaultsProps) {
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [localValues, setLocalValues] = useState<EconomicsAssumptions>({ ...detection.suggestions });

  const handleFieldChange = useCallback((key: keyof EconomicsAssumptions, raw: number, inputType: string) => {
    const value = inputType === 'percent' ? raw / 100 : raw;
    setLocalValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleAccept = () => {
    onAccept(isAdjusting ? localValues : detection.suggestions);
  };

  const handleCancelAdjust = () => {
    setLocalValues({ ...detection.suggestions });
    setIsAdjusting(false);
  };

  const { stylistCount, totalAppointmentHours, colorHeavy, hasChemicalData } = detection.details;

  // Build a human-readable data summary
  const dataSummaryParts: string[] = [];
  if (stylistCount > 0) dataSummaryParts.push(`${stylistCount} stylist${stylistCount !== 1 ? 's' : ''}`);
  if (totalAppointmentHours > 100) dataSummaryParts.push(`${Math.round(totalAppointmentHours).toLocaleString()} appointment hours`);
  if (hasChemicalData) dataSummaryParts.push('chemical tracking data');

  const dataSummary = dataSummaryParts.length > 0
    ? `Based on ${dataSummaryParts.join(', ')} over the last 90 days`
    : 'Based on industry averages for salons like yours';

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={cn(tokens.card.iconBox, 'bg-primary/10')}>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>ZURA COMPUTED THESE FOR YOU</CardTitle>
            <CardDescription>{dataSummary}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-4 gap-4">
          {FIELDS.map((field) => {
            const value = isAdjusting ? localValues[field.key] : detection.suggestions[field.key];
            const source = detection.sources[field.key];
            const benchmark = BENCHMARKS[field.key];
            const Icon = field.icon;
            const displayValue = field.inputType === 'percent' ? Math.round(value * 100) : value;

            return (
              <div
                key={field.key}
                className="p-4 rounded-xl border bg-card/60 space-y-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{field.label}</span>
                    <MetricInfoTooltip description={field.tooltip} />
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] h-5 shrink-0', SOURCE_BADGE[source].className)}>
                    {SOURCE_BADGE[source].label}
                  </Badge>
                </div>

                {isAdjusting ? (
                  <div className="space-y-1">
                    <div className="relative">
                      {field.prefix && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {field.prefix}
                        </span>
                      )}
                      <Input
                        type="number"
                        value={displayValue}
                        onChange={e => handleFieldChange(field.key, Number(e.target.value), field.inputType)}
                        className={cn(field.prefix && 'pl-7', field.suffix && 'pr-10')}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                      />
                      {field.suffix && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {field.suffix}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">{benchmark.label}</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-lg font-medium text-foreground font-display tracking-wide">
                      {field.format(value)}
                    </span>
                    <p className="text-[10px] text-muted-foreground/50 mt-1 leading-relaxed">{field.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contextual insights */}
        <div className="space-y-2">
          {hasChemicalData && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5 shrink-0" />
              Product cost calculated from actual chemical tracking data over 90 days.
            </div>
          )}
          {colorHeavy && !hasChemicalData && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
              <Palette className="w-3.5 h-3.5 shrink-0" />
              Your service mix is color-heavy — product cost estimated at the higher end of the range.
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleAccept}
            disabled={isSaving}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {isAdjusting ? 'Save & Continue' : 'Accept & Continue'}
          </Button>
          {!isAdjusting ? (
            <Button
              variant="outline"
              onClick={() => setIsAdjusting(true)}
              className="gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Adjust First
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={handleCancelAdjust}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * EconomicsDataBanner — Shown for returning users when detected data
 * differs from saved assumptions.
 */
interface EconomicsDataBannerProps {
  detection: AutoDetectResult;
  savedAssumptions: EconomicsAssumptions;
  onUpdate: (key: keyof EconomicsAssumptions, value: number) => void;
  onReconfigure: () => void;
}

export function EconomicsDataBanner({ detection, savedAssumptions, onUpdate, onReconfigure }: EconomicsDataBannerProps) {
  const diffs: { key: keyof EconomicsAssumptions; label: string; savedDisplay: string; detectedDisplay: string; detectedValue: number }[] = [];

  // Only show diffs for data-sourced values
  if (detection.sources.product_cost_pct === 'data') {
    const saved = savedAssumptions.product_cost_pct;
    const detected = detection.suggestions.product_cost_pct;
    if (Math.abs(saved - detected) > 0.005) {
      diffs.push({
        key: 'product_cost_pct',
        label: 'product cost',
        savedDisplay: `${(saved * 100).toFixed(1)}%`,
        detectedDisplay: `${(detected * 100).toFixed(1)}%`,
        detectedValue: detected,
      });
    }
  }

  if (detection.sources.hours_per_month === 'data') {
    const saved = savedAssumptions.hours_per_month;
    const detected = detection.suggestions.hours_per_month;
    if (Math.abs(saved - detected) > 5) {
      diffs.push({
        key: 'hours_per_month',
        label: 'hours/month',
        savedDisplay: `${saved}`,
        detectedDisplay: `${detected}`,
        detectedValue: detected,
      });
    }
  }

  // Even if no diffs, still show a reconfigure option
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
      {diffs.length > 0 && (
        <div className="space-y-2">
          {diffs.map(diff => (
            <div key={diff.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  Your actual {diff.label} is{' '}
                  <span className="text-foreground font-medium">~{diff.detectedDisplay}</span>
                  {' '}(saved: {diff.savedDisplay})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs shrink-0 ml-3"
                onClick={() => onUpdate(diff.key, diff.detectedValue)}
              >
                Update
              </Button>
            </div>
          ))}
        </div>
      )}
      {diffs.length === 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            Your assumptions are aligned with your data.
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs text-muted-foreground"
            onClick={onReconfigure}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reconfigure
          </Button>
        </div>
      )}
      {diffs.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs text-muted-foreground"
            onClick={onReconfigure}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reconfigure all
          </Button>
        </div>
      )}
    </div>
  );
}
