import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
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
  Lock, 
  Clock, 
  Key, 
  AlertTriangle,
  Save,
  Loader2,
  FileText,
  Download,
} from 'lucide-react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { 
  usePlatformSecuritySettings, 
  useUpdatePlatformSecuritySettings,
  type PlatformSecuritySettings as SecuritySettings,
} from '@/hooks/usePlatformSecuritySettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PlatformSecurityTab() {
  const { data: settings, isLoading } = usePlatformSecuritySettings();
  const updateSettings = useUpdatePlatformSecuritySettings();
  const [localSettings, setLocalSettings] = useState<Partial<SecuritySettings>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isForceLoggingOut, setIsForceLoggingOut] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const updateField = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate(localSettings, {
      onSuccess: () => setHasChanges(false),
    });
  };

  const handleForceLogout = async () => {
    if (!confirm('Are you sure you want to log out all platform users? This action cannot be undone.')) {
      return;
    }

    setIsForceLoggingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke('force-logout-platform-users');
      
      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success(`Successfully logged out ${data.affected_users} platform users`);
      } else {
        throw new Error(data?.error || 'Failed to force logout users');
      }
    } catch (err) {
      console.error('Force logout error:', err);
      toast.error('Failed to force logout users');
    } finally {
      setIsForceLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full bg-slate-800" />
        <Skeleton className="h-48 w-full bg-slate-800" />
        <Skeleton className="h-48 w-full bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Policies */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-violet-400" />
            Password Policies
          </PlatformCardTitle>
          <PlatformCardDescription>
            Configure password requirements for all users
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Minimum Password Length</Label>
              <p className="text-sm text-slate-400">Minimum number of characters required</p>
            </div>
            <Input
              type="number"
              min={8}
              max={32}
              value={localSettings.min_password_length ?? 12}
              onChange={(e) => updateField('min_password_length', parseInt(e.target.value) || 12)}
              className="w-20 bg-slate-800 border-slate-700 text-white text-center"
            />
          </div>

          <SecurityToggle
            label="Require Special Characters"
            description="Passwords must include !@#$%^&* etc."
            checked={localSettings.require_special_chars ?? true}
            onCheckedChange={(v) => updateField('require_special_chars', v)}
          />

          <SecurityToggle
            label="Require Mixed Case"
            description="Passwords must include uppercase and lowercase"
            checked={localSettings.require_mixed_case ?? true}
            onCheckedChange={(v) => updateField('require_mixed_case', v)}
          />

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Password Expiry</Label>
              <p className="text-sm text-slate-400">Days until password must be changed (0 = never)</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={365}
                value={localSettings.password_expiry_days ?? 90}
                onChange={(e) => updateField('password_expiry_days', parseInt(e.target.value) || 0)}
                className="w-20 bg-slate-800 border-slate-700 text-white text-center"
              />
              <span className="text-slate-400 text-sm">days</span>
            </div>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Session Management */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-violet-400" />
            Session Management
          </PlatformCardTitle>
          <PlatformCardDescription>
            Control user session behavior
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Session Timeout</Label>
              <p className="text-sm text-slate-400">Auto-logout after inactivity</p>
            </div>
            <Select 
              value={String(localSettings.session_timeout_minutes ?? 30)} 
              onValueChange={(v) => updateField('session_timeout_minutes', parseInt(v))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Max Concurrent Sessions</Label>
              <p className="text-sm text-slate-400">Number of devices that can be logged in simultaneously</p>
            </div>
            <Input
              type="number"
              min={1}
              max={10}
              value={localSettings.max_concurrent_sessions ?? 3}
              onChange={(e) => updateField('max_concurrent_sessions', parseInt(e.target.value) || 3)}
              className="w-20 bg-slate-800 border-slate-700 text-white text-center"
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 font-medium">Force Logout All Users</span>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              This will immediately log out all platform users. Use in case of security incidents.
            </p>
            <PlatformButton 
              variant="destructive" 
              size={tokens.button.card}
              onClick={handleForceLogout}
              disabled={isForceLoggingOut}
            >
              {isForceLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                'Force Logout All'
              )}
            </PlatformButton>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Two-Factor Authentication */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-violet-400" />
            Two-Factor Authentication
          </PlatformCardTitle>
          <PlatformCardDescription>
            Require 2FA for additional security
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <SecurityToggle
            label="Require 2FA for Platform Admins"
            description="Platform owners, admins, and support must use 2FA"
            checked={localSettings.require_2fa_platform_admins ?? true}
            onCheckedChange={(v) => updateField('require_2fa_platform_admins', v)}
          />

          <SecurityToggle
            label="Require 2FA for Organization Admins"
            description="Organization super admins must use 2FA"
            checked={localSettings.require_2fa_org_admins ?? false}
            onCheckedChange={(v) => updateField('require_2fa_org_admins', v)}
          />
        </PlatformCardContent>
      </PlatformCard>

      {/* Security Audit */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-400" />
            Security Audit
          </PlatformCardTitle>
          <PlatformCardDescription>
            View and export security event logs
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <p className="text-white font-medium">Recent Security Events</p>
              <p className="text-sm text-slate-400">View login attempts, role changes, and other security events</p>
            </div>
            <PlatformButton variant="secondary" size={tokens.button.card}>
              <FileText className="h-4 w-4 mr-2" />
              View Log
            </PlatformButton>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <p className="text-white font-medium">Export Audit Log</p>
              <p className="text-sm text-slate-400">Download security events for the last 30 days</p>
            </div>
            <PlatformButton variant="secondary" size={tokens.button.card}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </PlatformButton>
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
                Save Security Settings
              </>
            )}
          </PlatformButton>
        </div>
      )}
    </div>
  );
}

interface SecurityToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SecurityToggle({ label, description, checked, onCheckedChange }: SecurityToggleProps) {
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
