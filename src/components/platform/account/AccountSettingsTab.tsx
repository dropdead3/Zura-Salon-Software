import { useState, useEffect } from 'react';
import { EmailBrandingSection } from './EmailBrandingSection';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  Bell, 
  Flag, 
  Globe, 
  Save,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { MapPin } from 'lucide-react';
import { useOrganizationWithStats } from '@/hooks/useOrganizations';
import { useLocations } from '@/hooks/useLocations';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AccountSettingsTabProps {
  organizationId: string;
}

interface OrgSettings {
  feature_flags: {
    enable_75_hard: boolean;
    enable_client_portal: boolean;
    enable_online_booking: boolean;
    enable_inventory: boolean;
  };
  notifications: {
    email_digest: 'daily' | 'weekly' | 'monthly' | 'never';
    sms_reminders: boolean;
  };
  defaults: {
    default_location_id: string | null;
    timezone: string;
    currency: string;
    locale: string;
  };
}

const defaultSettings: OrgSettings = {
  feature_flags: {
    enable_75_hard: true,
    enable_client_portal: false,
    enable_online_booking: false,
    enable_inventory: false,
  },
  notifications: {
    email_digest: 'weekly',
    sms_reminders: true,
  },
  defaults: {
    default_location_id: null,
    timezone: 'America/New_York',
    currency: 'USD',
    locale: 'en',
  },
};

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
];

const currencies = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'NZD', label: 'New Zealand Dollar (NZ$)' },
  { value: 'MXN', label: 'Mexican Peso (MX$)' },
  { value: 'BRL', label: 'Brazilian Real (R$)' },
];

const locales = [
  { value: 'en', label: 'English' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

export function AccountSettingsTab({ organizationId }: AccountSettingsTabProps) {
  const queryClient = useQueryClient();
  const { data: organization, isLoading: orgLoading } = useOrganizationWithStats(organizationId);
  const { data: locations = [] } = useLocations(organizationId);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from organization
  useEffect(() => {
    if (organization) {
      // Load is_multi_location from organization (cast to access the field)
      const orgData = organization as any;
      setIsMultiLocation(orgData.is_multi_location ?? false);
      
      if (organization.settings) {
        const orgSettings = organization.settings as Partial<OrgSettings>;
        setSettings({
          feature_flags: {
            ...defaultSettings.feature_flags,
            ...(orgSettings.feature_flags || {}),
          },
          notifications: {
            ...defaultSettings.notifications,
            ...(orgSettings.notifications || {}),
          },
          defaults: {
            ...defaultSettings.defaults,
            ...(orgSettings.defaults || {}),
          },
        });
      }
    }
  }, [organization]);

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const parts = path.split('.');
      let current: any = newSettings;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return newSettings;
    });
    setHasChanges(true);
  };

  const handleMultiLocationChange = (checked: boolean) => {
    setIsMultiLocation(checked);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ 
          settings: JSON.parse(JSON.stringify(settings)),
          is_multi_location: isMultiLocation,
        })
        .eq('id', organizationId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['organization-with-stats', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      toast.success('Settings saved successfully');
      setHasChanges(false);
    } catch (err: any) {
      toast.error('Failed to save settings', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full bg-slate-800" />
        <Skeleton className="h-48 w-full bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Structure */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-violet-400" />
            Organization Structure
          </PlatformCardTitle>
          <PlatformCardDescription>
            Configure how the organization handles multiple locations
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <FeatureToggle
            label="Multi-Location Organization"
            description="Enable location-specific chat channels and team groupings. When disabled, the 'Locations' section in Team Chat will be hidden and only a 'general' channel will be created for new organizations."
            checked={isMultiLocation}
            onCheckedChange={handleMultiLocationChange}
          />
        </PlatformCardContent>
      </PlatformCard>

      {/* Feature Flags */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-violet-400" />
            Feature Flags
          </PlatformCardTitle>
          <PlatformCardDescription>
            Enable or disable features for this organization
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <FeatureToggle
            label="75 Hard Program"
            description="Access to the 75 Hard challenge program"
            checked={settings.feature_flags.enable_75_hard}
            onCheckedChange={(v) => updateSettings('feature_flags.enable_75_hard', v)}
          />
          <FeatureToggle
            label="Client Portal"
            description="Allow clients to book and manage appointments online"
            checked={settings.feature_flags.enable_client_portal}
            onCheckedChange={(v) => updateSettings('feature_flags.enable_client_portal', v)}
          />
          <FeatureToggle
            label="Online Booking"
            description="Enable online appointment booking"
            checked={settings.feature_flags.enable_online_booking}
            onCheckedChange={(v) => updateSettings('feature_flags.enable_online_booking', v)}
          />
          <FeatureToggle
            label="Inventory Management"
            description="Track and manage product inventory"
            checked={settings.feature_flags.enable_inventory}
            onCheckedChange={(v) => updateSettings('feature_flags.enable_inventory', v)}
          />
        </PlatformCardContent>
      </PlatformCard>

      {/* Notifications */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-violet-400" />
            Notifications
          </PlatformCardTitle>
          <PlatformCardDescription>
            Configure notification preferences
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Email Digest</Label>
              <p className="text-sm text-slate-400">How often to send summary emails</p>
            </div>
            <Select 
              value={settings.notifications.email_digest} 
              onValueChange={(v) => updateSettings('notifications.email_digest', v)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FeatureToggle
            label="SMS Reminders"
            description="Send appointment reminders via SMS"
            checked={settings.notifications.sms_reminders}
            onCheckedChange={(v) => updateSettings('notifications.sms_reminders', v)}
          />
        </PlatformCardContent>
      </PlatformCard>

      {/* Defaults */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-violet-400" />
            Defaults
          </PlatformCardTitle>
          <PlatformCardDescription>
            Default settings for this organization
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Default Location</Label>
              <p className="text-sm text-slate-400">Primary location for new operations</p>
            </div>
            <Select 
              value={settings.defaults.default_location_id || 'none'} 
              onValueChange={(v) => updateSettings('defaults.default_location_id', v === 'none' ? null : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Timezone</Label>
              <p className="text-sm text-slate-400">Default timezone for scheduling</p>
            </div>
            <Select 
              value={settings.defaults.timezone} 
              onValueChange={(v) => updateSettings('defaults.timezone', v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Currency</Label>
              <p className="text-sm text-slate-400">Currency for pricing and invoices</p>
            </div>
            <Select 
              value={settings.defaults.currency} 
              onValueChange={(v) => updateSettings('defaults.currency', v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Locale</Label>
              <p className="text-sm text-slate-400">Date and number formatting</p>
            </div>
            <Select 
              value={settings.defaults.locale ?? 'en'} 
              onValueChange={(v) => updateSettings('defaults.locale', v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locales.map(l => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Email Branding */}
      <EmailBrandingSection organizationId={organizationId} />

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end sticky bottom-4">
          <PlatformButton onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
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
