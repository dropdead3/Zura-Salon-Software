import { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { toast } from 'sonner';

interface NewOrgDefaults {
  plan: string;
  billing_cycle: string;
  trial_days: number;
  features: {
    enable_75_hard: boolean;
    enable_client_portal: boolean;
    enable_online_booking: boolean;
    enable_inventory: boolean;
  };
  timezone: string;
  currency: string;
  default_appointment_minutes: number;
}

const DEFAULT_VALUES: NewOrgDefaults = {
  plan: 'professional',
  billing_cycle: 'monthly',
  trial_days: 14,
  features: {
    enable_75_hard: true,
    enable_client_portal: true,
    enable_online_booking: false,
    enable_inventory: false,
  },
  timezone: 'America/New_York',
  currency: 'USD',
  default_appointment_minutes: 60,
};

const PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'CAD', label: 'Canadian Dollar (CA$)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
];

export function PlatformDefaultsTab() {
  const { data: settings, isLoading } = useSiteSettings('new_org_defaults');
  const updateSettings = useUpdateSiteSetting();
  const [localSettings, setLocalSettings] = useState<NewOrgDefaults>(DEFAULT_VALUES);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...DEFAULT_VALUES, ...(settings as Partial<NewOrgDefaults>) });
    }
  }, [settings]);

  const updateField = <K extends keyof NewOrgDefaults>(key: K, value: NewOrgDefaults[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateFeature = (feature: keyof NewOrgDefaults['features'], value: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: value },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    updateSettings.mutate(
      { key: 'new_org_defaults', value: localSettings as unknown as Record<string, unknown> },
      {
        onSuccess: () => {
          setHasChanges(false);
          toast.success('Default settings saved');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full bg-slate-800" />
        <Skeleton className="h-48 w-full bg-slate-800" />
        <Skeleton className="h-48 w-full bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan & Billing Defaults */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-violet-400" />
            Plan & Billing Defaults
          </PlatformCardTitle>
          <PlatformCardDescription>
            Default subscription settings for new organizations
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Default Plan</Label>
              <Select 
                value={localSettings.plan} 
                onValueChange={(v) => updateField('plan', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map(plan => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Billing Cycle</Label>
              <Select 
                value={localSettings.billing_cycle} 
                onValueChange={(v) => updateField('billing_cycle', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map(cycle => (
                    <SelectItem key={cycle.value} value={cycle.value}>
                      {cycle.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Trial Period</Label>
              <p className="text-sm text-slate-400">Number of days for free trial</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={90}
                value={localSettings.trial_days}
                onChange={(e) => updateField('trial_days', parseInt(e.target.value) || 0)}
                className="w-20 bg-slate-800 border-slate-700 text-white text-center"
              />
              <span className="text-slate-400 text-sm">days</span>
            </div>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Feature Defaults */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle>Feature Defaults</PlatformCardTitle>
          <PlatformCardDescription>
            Which features are enabled by default for new organizations
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-3">
          <FeatureToggle
            label="75 Hard Program"
            description="Enable the 75 Hard challenge program"
            checked={localSettings.features.enable_75_hard}
            onCheckedChange={(v) => updateFeature('enable_75_hard', v)}
          />
          <FeatureToggle
            label="Client Portal"
            description="Allow clients to view their history and book online"
            checked={localSettings.features.enable_client_portal}
            onCheckedChange={(v) => updateFeature('enable_client_portal', v)}
          />
          <FeatureToggle
            label="Online Booking"
            description="Enable public online booking widget"
            checked={localSettings.features.enable_online_booking}
            onCheckedChange={(v) => updateFeature('enable_online_booking', v)}
          />
          <FeatureToggle
            label="Inventory Management"
            description="Track product inventory and sales"
            checked={localSettings.features.enable_inventory}
            onCheckedChange={(v) => updateFeature('enable_inventory', v)}
          />
        </PlatformCardContent>
      </PlatformCard>

      {/* Operational Defaults */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle>Operational Defaults</PlatformCardTitle>
          <PlatformCardDescription>
            Default operational settings for new organizations
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Timezone</Label>
              <Select 
                value={localSettings.timezone} 
                onValueChange={(v) => updateField('timezone', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Currency</Label>
              <Select 
                value={localSettings.currency} 
                onValueChange={(v) => updateField('currency', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(curr => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Default Appointment Duration</Label>
              <p className="text-sm text-slate-400">Standard appointment length in minutes</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={15}
                max={480}
                step={15}
                value={localSettings.default_appointment_minutes}
                onChange={(e) => updateField('default_appointment_minutes', parseInt(e.target.value) || 60)}
                className="w-20 bg-slate-800 border-slate-700 text-white text-center"
              />
              <span className="text-slate-400 text-sm">min</span>
            </div>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end sticky bottom-4">
          <PlatformButton onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Defaults
              </>
            )}
          </PlatformButton>
        </div>
      )}
    </div>
  );
}

interface FeatureToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function FeatureToggle({ label, description, checked, onCheckedChange }: FeatureToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
      <div>
        <Label className="text-white">{label}</Label>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
