import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { DollarSign } from 'lucide-react';

interface SetupFeesFormProps {
  setupFee: number;
  onSetupFeeChange: (fee: number) => void;
  setupFeePaid: boolean;
  onSetupFeePaidChange: (paid: boolean) => void;
}

export function SetupFeesForm({
  setupFee,
  onSetupFeeChange,
  setupFeePaid,
  onSetupFeePaidChange,
}: SetupFeesFormProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
        <PlatformLabel className="text-sm font-medium">Setup / Migration Fee</PlatformLabel>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <PlatformLabel htmlFor="setupFee" className="text-xs text-[hsl(var(--platform-foreground-muted))]">Amount</PlatformLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--platform-foreground-muted))]">$</span>
            <PlatformInput
              id="setupFee"
              type="number"
              min="0"
              step="0.01"
              value={setupFee}
              onChange={(e) => onSetupFeeChange(parseFloat(e.target.value) || 0)}
              className="pl-7"
            />
          </div>
        </div>

        <div className="flex items-end">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--platform-bg-card)/0.5)] border border-[hsl(var(--platform-border)/0.5)] w-full">
            <Switch
              checked={setupFeePaid}
              onCheckedChange={onSetupFeePaidChange}
            />
            <span className="text-sm text-[hsl(var(--platform-foreground)/0.85)]">
              {setupFeePaid ? 'Already Paid' : 'Not Paid'}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
        One-time fee for onboarding, data migration, or setup services
      </p>
    </div>
  );
}
