import { useState, useEffect } from 'react';
import { AlertTriangle, Eye, EyeOff, Save, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { useUpdateOrganization, type Organization } from '@/hooks/useOrganizations';

interface MigrationCredentials {
  crm_username: string;
  crm_password: string;
  updated_at?: string;
}

interface MigrationCredentialsCardProps {
  organizationId: string;
  organization: Organization;
}

export function MigrationCredentialsCard({ organizationId, organization }: MigrationCredentialsCardProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [initialUsername, setInitialUsername] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);
  
  const updateOrg = useUpdateOrganization();

  // Load existing credentials from settings
  useEffect(() => {
    const settings = organization.settings as Record<string, unknown> | null;
    if (settings?.migration_credentials) {
      const creds = settings.migration_credentials as MigrationCredentials;
      setUsername(creds.crm_username || '');
      setPassword(creds.crm_password || '');
      setInitialUsername(creds.crm_username || '');
      setInitialPassword(creds.crm_password || '');
    }
  }, [organization.settings]);

  const hasChanges = username !== initialUsername || password !== initialPassword;

  const handleSave = async () => {
    const currentSettings = (organization.settings as Record<string, unknown>) || {};
    const newSettings = {
      ...currentSettings,
      migration_credentials: {
        crm_username: username,
        crm_password: password,
        updated_at: new Date().toISOString(),
      },
    };

    await updateOrg.mutateAsync({
      id: organizationId,
      settings: newSettings,
    });

    // Update initial values after successful save
    setInitialUsername(username);
    setInitialPassword(password);
  };

  const handleCopy = async (value: string, field: 'username' | 'password') => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success(`${field === 'username' ? 'Username' : 'Password'} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <PlatformCardTitle className="text-lg">Migration Access</PlatformCardTitle>
      </PlatformCardHeader>
      <PlatformCardContent className="space-y-4">
        {/* 2FA Warning Alert */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-200">
              Reminder: Ask the business owner to disable 2FA before attempting to access their CRM account
            </p>
          </div>
        </div>

        {/* Source Software Display */}
        <div>
          <label className="text-sm text-slate-400 block mb-1">Previous Software</label>
          <p className="text-slate-300 capitalize">
            {organization.source_software || 'Not specified'}
          </p>
        </div>

        {/* Username Input */}
        <div>
          <label className="text-sm text-slate-400 block mb-1">CRM Username</label>
          <div className="relative">
            <PlatformInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter CRM username or email"
              autoCapitalize="off"
              autoComplete="off"
              className="pr-10"
            />
            {username && (
              <button
                type="button"
                onClick={() => handleCopy(username, 'username')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {copiedField === 'username' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Password Input with Toggle */}
        <div>
          <label className="text-sm text-slate-400 block mb-1">CRM Password</label>
          <div className="relative">
            <PlatformInput
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter CRM password"
              autoComplete="off"
              className="pr-20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
              {password && (
                <button
                  type="button"
                  onClick={() => handleCopy(password, 'password')}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {copiedField === 'password' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <PlatformButton
            onClick={handleSave}
            disabled={!hasChanges}
            loading={updateOrg.isPending}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Credentials
          </PlatformButton>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
