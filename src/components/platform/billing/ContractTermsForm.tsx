import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { Calendar, FileText, RefreshCw } from 'lucide-react';
import type { BillingCycle } from '@/hooks/useOrganizationBilling';
import { getBillingCycleLabel, getContractLengthLabel } from '@/hooks/useBillingCalculations';

interface ContractTermsFormProps {
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  contractLengthMonths: number;
  onContractLengthChange: (months: number) => void;
  contractStartDate: string | null;
  onContractStartDateChange: (date: string | null) => void;
  autoRenewal: boolean;
  onAutoRenewalChange: (enabled: boolean) => void;
  trialDays: number;
  onTrialDaysChange: (days: number) => void;
}

const billingCycleOptions: { value: BillingCycle; discount: number }[] = [
  { value: 'monthly', discount: 0 },
  { value: 'quarterly', discount: 5 },
  { value: 'semi_annual', discount: 10 },
  { value: 'annual', discount: 20 },
];

const contractLengthOptions = [
  { value: 1, label: 'Month-to-Month' },
  { value: 6, label: '6 Months' },
  { value: 12, label: '1 Year' },
  { value: 24, label: '2 Years' },
  { value: 36, label: '3 Years' },
];

const trialOptions = [
  { value: 0, label: 'No trial' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
];

export function ContractTermsForm({
  billingCycle,
  onBillingCycleChange,
  contractLengthMonths,
  onContractLengthChange,
  contractStartDate,
  onContractStartDateChange,
  autoRenewal,
  onAutoRenewalChange,
  trialDays,
  onTrialDaysChange,
}: ContractTermsFormProps) {
  return (
    <div className="space-y-6">
      {/* Billing Cycle */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
          <PlatformLabel className="text-sm font-medium">Billing Cycle</PlatformLabel>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {billingCycleOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onBillingCycleChange(opt.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                billingCycle === opt.value
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.3)] hover:border-[hsl(var(--platform-border))]'
              }`}
            >
              <p className="font-medium text-[hsl(var(--platform-foreground))] text-sm">
                {getBillingCycleLabel(opt.value)}
              </p>
              {opt.discount > 0 && (
                <p className="text-xs text-emerald-400 mt-1">
                  Save {opt.discount}%
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contract Length & Start Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
            <PlatformLabel>Contract Length</PlatformLabel>
          </div>
          <Select
            value={contractLengthMonths.toString()}
            onValueChange={(v) => onContractLengthChange(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contractLengthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <PlatformLabel htmlFor="contractStart">Contract Start Date</PlatformLabel>
          <PlatformInput
            id="contractStart"
            type="date"
            value={contractStartDate ?? ''}
            onChange={(e) => onContractStartDateChange(e.target.value || null)}
          />
        </div>
      </div>

      {/* Trial Period */}
      <div className="space-y-2">
        <PlatformLabel>Trial Period</PlatformLabel>
        <Select
          value={trialDays.toString()}
          onValueChange={(v) => onTrialDaysChange(parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {trialOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
          Billing will begin after the trial ends, when the account is activated
        </p>
      </div>

      {/* Auto Renewal */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--platform-bg-card)/0.5)] border border-[hsl(var(--platform-border)/0.5)]">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
          <div>
            <PlatformLabel className="text-sm font-medium">Auto-Renewal</PlatformLabel>
            <p className="text-xs text-[hsl(var(--platform-foreground-subtle))] mt-0.5">
              Automatically renew at end of contract
            </p>
          </div>
        </div>
        <Switch
          checked={autoRenewal}
          onCheckedChange={onAutoRenewalChange}
        />
      </div>
    </div>
  );
}