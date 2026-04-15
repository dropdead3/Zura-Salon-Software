import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users, Bell, Shield, Loader2, Trash2, Cog, Palette, Sun, Moon, Monitor, Check, DollarSign as DollarSignIcon,
  GraduationCap, Keyboard, Sparkles, Settings2, Save, Globe,
} from 'lucide-react';
import { MessageSquareHeart } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useColorTheme, colorThemes, COLOR_THEME_TO_CATEGORY_MAP } from '@/hooks/useColorTheme';
import { useServiceCategoryThemes, useApplyCategoryTheme } from '@/hooks/useCategoryThemes';
import { useRoleUtils } from '@/hooks/useRoleUtils';
import { useBusinessCapacity } from '@/hooks/useBusinessCapacity';
import { useAutoSyncTerminalSplash } from '@/hooks/useAutoSyncTerminalSplash';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useBillingAccess } from '@/hooks/useBillingAccess';
import { useStaffingAlertSettings, useUpdateStaffingAlertSettings } from '@/hooks/useStaffingAlertSettings';
import { useServicesWithFlowsCount } from '@/hooks/useServiceCommunicationFlows';
import { useInfotainerSettings } from '@/hooks/useInfotainers';
import { useOrgSecuritySettings } from '@/hooks/useOrgSecuritySettings';
import { useRevenueDisplay } from '@/contexts/RevenueDisplayContext';
import { useToast } from '@/hooks/use-toast';
import { useOrgDefaults } from '@/hooks/useOrgDefaults';
import { useUpdateTimezone, TIMEZONES } from '@/hooks/useTimezoneSettings';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { useEffect } from 'react';

// Lazy imports
const AccountBillingContent = lazy(() => import('@/components/dashboard/settings/AccountBillingContent').then(m => ({ default: m.AccountBillingContent })));
const EmailTemplatesManager = lazy(() => import('@/components/dashboard/EmailTemplatesManager').then(m => ({ default: m.EmailTemplatesManager })));
const EmailVariablesManager = lazy(() => import('@/components/dashboard/EmailVariablesManager').then(m => ({ default: m.EmailVariablesManager })));
const SignaturePresetsManager = lazy(() => import('@/components/dashboard/SignaturePresetsManager').then(m => ({ default: m.SignaturePresetsManager })));
const OnboardingConfigurator = lazy(() => import('@/components/dashboard/settings/OnboardingConfigurator').then(m => ({ default: m.OnboardingConfigurator })));
const LeaderboardConfigurator = lazy(() => import('@/components/dashboard/settings/LeaderboardConfigurator').then(m => ({ default: m.LeaderboardConfigurator })));
const IntegrationsTab = lazy(() => import('@/components/dashboard/IntegrationsTab').then(m => ({ default: m.IntegrationsTab })));
const StylistLevelsContent = lazy(() => import('@/components/dashboard/settings/StylistLevelsContent').then(m => ({ default: m.StylistLevelsContent })));
const CommandCenterContent = lazy(() => import('@/components/dashboard/settings/CommandCenterContent').then(m => ({ default: m.CommandCenterContent })));
const LocationsSettingsContent = lazy(() => import('@/components/dashboard/settings/LocationsSettingsContent').then(m => ({ default: m.LocationsSettingsContent })));
const DayRateSettingsContent = lazy(() => import('@/components/dashboard/settings/DayRateSettingsContent').then(m => ({ default: m.DayRateSettingsContent })));
const RoleAccessConfigurator = lazy(() => import('@/components/dashboard/settings/RoleAccessConfigurator').then(m => ({ default: m.RoleAccessConfigurator })));
const SmsTemplatesManager = lazy(() => import('@/components/dashboard/SmsTemplatesManager').then(m => ({ default: m.SmsTemplatesManager })));
const FormsTemplatesContent = lazy(() => import('@/components/dashboard/settings/FormsTemplatesContent').then(m => ({ default: m.FormsTemplatesContent })));
const MetricsGlossaryContent = lazy(() => import('@/components/dashboard/settings/MetricsGlossaryContent').then(m => ({ default: m.MetricsGlossaryContent })));
const LoyaltySettingsContent = lazy(() => import('@/components/dashboard/settings/LoyaltySettingsContent').then(m => ({ default: m.LoyaltySettingsContent })));
const TeamRewardsConfigurator = lazy(() => import('@/components/dashboard/settings/TeamRewardsConfigurator').then(m => ({ default: m.TeamRewardsConfigurator })));
const EmailBrandingSettings = lazy(() => import('@/components/dashboard/settings/EmailBrandingSettings').then(m => ({ default: m.EmailBrandingSettings })));
const KioskSettingsContent = lazy(() => import('@/components/dashboard/settings/KioskSettingsContent').then(m => ({ default: m.KioskSettingsContent })));
const ServiceEmailFlowsManager = lazy(() => import('@/components/dashboard/settings/ServiceEmailFlowsManager').then(m => ({ default: m.ServiceEmailFlowsManager })));
const ServicesSettingsContent = lazy(() => import('@/components/dashboard/settings/ServicesSettingsContent').then(m => ({ default: m.ServicesSettingsContent })));
const RetailProductsSettingsContent = lazy(() => import('@/components/dashboard/settings/RetailProductsSettingsContent').then(m => ({ default: m.RetailProductsSettingsContent })));
const TerminalSettingsContent = lazy(() => import('@/components/dashboard/settings/TerminalSettingsContent').then(m => ({ default: m.TerminalSettingsContent })));
const BusinessSettingsContent = lazy(() => import('@/components/dashboard/settings/BusinessSettingsContent').then(m => ({ default: m.BusinessSettingsContent })));

// Eagerly imported (small, used inline)
import { UserCapacityBar } from '@/components/dashboard/settings/UserCapacityBar';
import { AddUserSeatsDialog } from '@/components/dashboard/settings/AddUserSeatsDialog';
import { OnboardingTasksManager } from '@/components/dashboard/OnboardingTasksManager';
import { LeaderboardWeightsManager } from '@/components/dashboard/LeaderboardWeightsManager';
import { UserPinSettings } from '@/components/dashboard/settings/UserPinSettings';
import { SoundSettingsSection } from '@/components/dashboard/settings/SoundSettingsSection';
import { CheckoutAlertsSection } from '@/components/dashboard/settings/CheckoutAlertsSection';
import { ReviewThresholdSettings } from '@/components/feedback/ReviewThresholdSettings';

export type SettingsCategory = 'my-profile' | 'business' | 'email' | 'sms' | 'service-flows' | 'users' | 'onboarding' | 'integrations' | 'system' | 'program' | 'levels' | 'access-hub' | 'locations' | 'dayrate' | 'forms' | 'loyalty' | 'feedback' | 'leaderboard' | 'team-rewards' | 'kiosk' | 'services' | 'retail-products' | 'account-billing' | 'terminals' | null;

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
}

interface SettingsCategoryDetailProps {
  activeCategory: NonNullable<SettingsCategory>;
  categoryLabel: string;
  categoryDescription?: string;
  onBack: () => void;
}

// ---- Inline sub-components ----

function RegionalSettingsCard() {
  const { timezone: orgTimezone } = useOrgDefaults();
  const updateTimezone = useUpdateTimezone();
  const { data: locations = [] } = useLocations();
  const [scopeLocationId, setScopeLocationId] = useState<string>('all');
  const [selected, setSelected] = useState(orgTimezone);
  const [locationTzCache, setLocationTzCache] = useState<Record<string, string | null>>({});

  // Load location timezone when scope changes
  useEffect(() => {
    if (scopeLocationId === 'all') {
      setSelected(orgTimezone);
    } else {
      // Check if we already fetched it
      if (scopeLocationId in locationTzCache) {
        setSelected(locationTzCache[scopeLocationId] ?? orgTimezone);
      } else {
        // Fetch the location's timezone
        supabase
          .from('locations')
          .select('timezone')
          .eq('id', scopeLocationId)
          .single()
          .then(({ data }) => {
            const tz = (data?.timezone as string) ?? null;
            setLocationTzCache(prev => ({ ...prev, [scopeLocationId]: tz }));
            setSelected(tz ?? orgTimezone);
          });
      }
    }
  }, [scopeLocationId, orgTimezone]);

  // Sync org default
  useEffect(() => {
    if (scopeLocationId === 'all') setSelected(orgTimezone);
  }, [orgTimezone]);

  const isInherited = scopeLocationId !== 'all' && !(scopeLocationId in locationTzCache && locationTzCache[scopeLocationId] !== null);
  const effectiveValue = scopeLocationId === 'all' ? orgTimezone : (locationTzCache[scopeLocationId] ?? orgTimezone);
  const isDirty = selected !== effectiveValue;

  const handleSave = () => {
    updateTimezone.mutate(
      { timezone: selected, locationId: scopeLocationId === 'all' ? undefined : scopeLocationId },
      {
        onSuccess: () => {
          if (scopeLocationId !== 'all') {
            setLocationTzCache(prev => ({ ...prev, [scopeLocationId]: selected }));
          }
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">REGIONAL</CardTitle>
        </div>
        <CardDescription>Set the timezone for your organization or individual locations. This affects the scheduler, reports, and all time-based displays.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Scope</Label>
          <LocationSelect
            value={scopeLocationId}
            onValueChange={setScopeLocationId}
            includeAll
            allLabel="All Locations (Org Default)"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Timezone</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isInherited && !isDirty && (
            <p className="text-xs text-muted-foreground">Inherited from organization default</p>
          )}
        </div>
        {isDirty && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateTimezone.isPending}
            className="font-sans"
          >
            {updateTimezone.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Timezone
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueDisplayModeCard() {
  const { revenueMode, setRevenueMode, isLoading } = useRevenueDisplay();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSignIcon className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">REVENUE DISPLAY</CardTitle>
        </div>
        <CardDescription>Choose how revenue figures are displayed across the dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans font-medium text-sm">Show revenue pre-tax</p>
            <p className="text-xs text-muted-foreground">
              When enabled, revenue figures exclude collected sales tax. Tax totals remain visible in the Tax Summary card.
            </p>
          </div>
          <Switch
            checked={revenueMode === 'exclusive'}
            onCheckedChange={(checked) => setRevenueMode(checked ? 'exclusive' : 'inclusive')}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function InfotainerToggleCard() {
  const { showInfotainers, toggleInfotainers, isToggling } = useInfotainerSettings();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 text-primary">💡</span>
          <CardTitle className="font-display text-lg">HELP &amp; GUIDANCE</CardTitle>
        </div>
        <CardDescription>Control feature guide banners across the platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans font-medium text-sm">Show feature guides</p>
            <p className="text-xs text-muted-foreground">Display helpful information banners on feature pages to explain how each tool works.</p>
          </div>
          <Switch checked={showInfotainers} onCheckedChange={toggleInfotainers} disabled={isToggling} />
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySettingsCard() {
  const { requireEmailVerification, restrictSignups, updateSecurity, isSaving } = useOrgSecuritySettings();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">SECURITY</CardTitle>
        </div>
        <CardDescription>Security and access settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans font-medium text-sm">Require Email Verification</p>
            <p className="text-xs text-muted-foreground">New users must verify email</p>
          </div>
          <Switch checked={requireEmailVerification} onCheckedChange={(val) => updateSecurity({ require_email_verification: val })} disabled={isSaving} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans font-medium text-sm">Restrict Sign-ups</p>
            <p className="text-xs text-muted-foreground">Only approved email domains</p>
          </div>
          <Switch checked={restrictSignups} onCheckedChange={(val) => updateSecurity({ restrict_signups: val })} disabled={isSaving} />
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsCard() {
  const { data: staffingSettings, isLoading: isLoadingSettings } = useStaffingAlertSettings();
  const updateStaffingSettings = useUpdateStaffingAlertSettings();
  const [localThreshold, setLocalThreshold] = useState(70);
  const [localEmailEnabled, setLocalEmailEnabled] = useState(true);
  const [localInAppEnabled, setLocalInAppEnabled] = useState(true);

  useEffect(() => {
    if (staffingSettings) {
      setLocalThreshold(staffingSettings.percentage);
      setLocalEmailEnabled(staffingSettings.email_enabled);
      setLocalInAppEnabled(staffingSettings.in_app_enabled);
    }
  }, [staffingSettings]);

  const handleSaveStaffingSettings = () => {
    updateStaffingSettings.mutate({
      percentage: localThreshold,
      email_enabled: localEmailEnabled,
      in_app_enabled: localInAppEnabled,
    });
  };

  const hasStaffingChanges = staffingSettings && (
    localThreshold !== staffingSettings.percentage ||
    localEmailEnabled !== staffingSettings.email_enabled ||
    localInAppEnabled !== staffingSettings.in_app_enabled
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">NOTIFICATIONS</CardTitle>
        </div>
        <CardDescription>Configure email reminders and notifications.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-sans font-medium text-sm">Staffing Capacity Alerts</p>
              <p className="text-xs text-muted-foreground">Alert leadership when locations fall below threshold</p>
            </div>
          </div>
          {isLoadingSettings ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading settings...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Alert Threshold</Label>
                  <span className="font-medium text-sm">{localThreshold}%</span>
                </div>
                <Slider value={[localThreshold]} onValueChange={([val]) => setLocalThreshold(val)} min={50} max={95} step={5} className="w-full" />
                <p className="text-xs text-muted-foreground">Receive alerts when any location falls below this capacity percentage</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-sm">Send email alerts</p>
                  <p className="text-xs text-muted-foreground">Email admins when threshold is breached</p>
                </div>
                <Switch checked={localEmailEnabled} onCheckedChange={setLocalEmailEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-sm">In-app notifications</p>
                  <p className="text-xs text-muted-foreground">Show alerts in notification center</p>
                </div>
                <Switch checked={localInAppEnabled} onCheckedChange={setLocalInAppEnabled} />
              </div>
              {hasStaffingChanges && (
                <Button size={tokens.button.card} onClick={handleSaveStaffingSettings} disabled={updateStaffingSettings.isPending} className="w-full">
                  {updateStaffingSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Alert Settings
                </Button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans font-medium text-sm">Daily Check-in Reminders</p>
            <p className="text-xs text-muted-foreground">Send reminder emails at 10 AM and 9 PM AZ time</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans font-medium text-sm">Weekly Wins Reminders</p>
            <p className="text-xs text-muted-foreground">Remind stylists to submit weekly wins</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans font-medium text-sm">Birthday Reminders</p>
            <p className="text-xs text-muted-foreground">Email leadership team 3 days before</p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceCommunicationFlowsCard() {
  const { dashPath } = useOrgDashboardPath();
  const { data: servicesWithFlowsCount, isLoading } = useServicesWithFlowsCount();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">SERVICE COMMUNICATION FLOWS</CardTitle>
        </div>
        <CardDescription>Configure automated email and SMS messages per service.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-display">{isLoading ? '...' : servicesWithFlowsCount || 0}</div>
            <div className="text-sm text-muted-foreground">services with custom communication flows</div>
          </div>
          <Button asChild variant="outline" className="w-full">
            <a href={dashPath('/admin/services')}>
              <Settings2 className="w-4 h-4 mr-2" />
              Configure Service Flows
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UserCard({ u, updatingUser, updateUserRole, removeUser, currentUserId, dynamicRoleOptions }: {
  u: UserWithRole; updatingUser: string | null; updateUserRole: (userId: string, role: string) => void;
  removeUser: (userId: string) => void; currentUserId?: string; dynamicRoleOptions: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/30 border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-display text-sm">
          {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="font-sans font-medium">{u.full_name}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={u.role} onValueChange={(value) => updateUserRole(u.user_id, value)} disabled={updatingUser === u.user_id}>
          <SelectTrigger className="w-32">
            {updatingUser === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <SelectValue />}
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectGroup>
              <SelectLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Leadership</SelectLabel>
              {dynamicRoleOptions.filter(role => ['super_admin', 'admin', 'manager', 'general_manager', 'assistant_manager'].includes(role.value)).map(role => (
                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Operations</SelectLabel>
              {dynamicRoleOptions.filter(role => ['director_of_operations', 'operations_assistant', 'receptionist', 'front_desk'].includes(role.value)).map(role => (
                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stylists</SelectLabel>
              {dynamicRoleOptions.filter(role => ['stylist', 'stylist_assistant'].includes(role.value)).map(role => (
                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
              ))}
            </SelectGroup>
            {(() => {
              const categorizedRoles = ['super_admin', 'admin', 'manager', 'general_manager', 'assistant_manager', 'director_of_operations', 'operations_assistant', 'receptionist', 'front_desk', 'stylist', 'stylist_assistant'];
              const otherRoles = dynamicRoleOptions.filter(role => !categorizedRoles.includes(role.value));
              if (otherRoles.length === 0) return null;
              return (
                <SelectGroup>
                  <SelectLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other</SelectLabel>
                  {otherRoles.map(role => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                </SelectGroup>
              );
            })()}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => removeUser(u.user_id)} disabled={u.user_id === currentUserId} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function SettingsCategoryDetail({ activeCategory, categoryLabel, categoryDescription, onBack }: SettingsCategoryDetailProps) {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useDashboardTheme();
  const { colorTheme, setColorTheme, mounted: colorMounted } = useColorTheme();
  const { data: categoryThemes } = useServiceCategoryThemes();
  const applyCategoryTheme = useApplyCategoryTheme();
  const { roleOptions: dynamicRoleOptions } = useRoleUtils();
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const { data: business } = useBusinessSettings();
  const { syncSplashToTheme } = useAutoSyncTerminalSplash(business?.logo_dark_url, business?.business_name || '', business?.id);

  const capacity = useBusinessCapacity();
  const isSuperAdmin = roles?.includes('super_admin') || roles?.includes('admin');

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [isAddUserSeatsOpen, setIsAddUserSeatsOpen] = useState(false);
  const [categoryActions, setCategoryActions] = useState<React.ReactNode>(null);
  const [mounted, setMounted] = useState(false);
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (activeCategory === 'users') fetchUsers();
  }, [activeCategory]);

  const fetchUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('employee_profiles').select('user_id, email, full_name').eq('is_active', true);
    if (profilesError) { setLoading(false); return; }
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
      const userRole = roles?.find(r => r.user_id === profile.user_id);
      return { user_id: profile.user_id, email: profile.email || '', full_name: profile.full_name, role: userRole?.role || 'stylist' };
    });
    setUsers(usersWithRoles);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUser(userId);
    const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', userId).maybeSingle();
    let error;
    if (existingRole) {
      const result = await supabase.from('user_roles').update({ role: newRole as any }).eq('user_id', userId);
      error = result.error;
    } else {
      const result = await supabase.from('user_roles').insert({ user_id: userId, role: newRole as any });
      error = result.error;
    }
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update role.' });
    } else {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      toast({ title: 'Role Updated', description: `User role changed to ${newRole}.` });
    }
    setUpdatingUser(null);
  };

  const removeUser = async (userId: string) => {
    if (userId === user?.id) { toast({ variant: 'destructive', title: 'Error', description: "You can't remove yourself." }); return; }
    setDeactivateUserId(userId);
  };

  const confirmDeactivateUser = async () => {
    const userId = deactivateUserId;
    if (!userId) return;
    setDeactivateUserId(null);
    const { error } = await supabase.from('employee_profiles').update({ is_active: false }).eq('user_id', userId);
    if (!error) {
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      toast({ title: 'User Deactivated', description: 'User has been removed from active staff.' });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <DashboardPageHeader title={categoryLabel.toUpperCase()} description={categoryDescription} actions={categoryActions} onBackClick={onBack} backLabel="Back to Settings" />
          <div className="mt-4"><PageExplainer pageId="settings" /></div>
        </div>

        <Suspense fallback={<DashboardLoader size="md" className="h-64" />}>
          {activeCategory === 'business' && <BusinessSettingsContent />}
          {activeCategory === 'email' && (
            <Tabs defaultValue="branding" className="w-full">
              <TabsList>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="signatures">Signatures</TabsTrigger>
              </TabsList>
              <TabsContent value="branding"><EmailBrandingSettings /></TabsContent>
              <TabsContent value="templates">
                <Card><CardHeader><CardTitle className="font-display text-lg">EMAIL TEMPLATES</CardTitle><CardDescription>Customize email templates for automated notifications.</CardDescription></CardHeader><CardContent><EmailTemplatesManager /></CardContent></Card>
              </TabsContent>
              <TabsContent value="variables">
                <Card><CardHeader><CardTitle className="font-display text-lg">EMAIL VARIABLES</CardTitle><CardDescription>Manage available template variables.</CardDescription></CardHeader><CardContent><EmailVariablesManager /></CardContent></Card>
              </TabsContent>
              <TabsContent value="signatures">
                <Card><CardHeader><CardTitle className="font-display text-lg">SIGNATURE PRESETS</CardTitle><CardDescription>Reusable email signature blocks.</CardDescription></CardHeader><CardContent><SignaturePresetsManager /></CardContent></Card>
              </TabsContent>
            </Tabs>
          )}

          {activeCategory === 'sms' && (
            <div className="space-y-6">
              <Card><CardHeader><CardTitle className="font-display text-lg">SMS TEMPLATES</CardTitle><CardDescription>Customize text message templates for automated notifications.</CardDescription></CardHeader><CardContent><SmsTemplatesManager /></CardContent></Card>
            </div>
          )}

          {activeCategory === 'service-flows' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ServiceCommunicationFlowsCard />
              <ServiceEmailFlowsManager />
            </div>
          )}

          {activeCategory === 'forms' && <FormsTemplatesContent />}

          {activeCategory === 'users' && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">TEAM MEMBERS</CardTitle>
                <CardDescription>Manage team members and their access levels.</CardDescription>
              </CardHeader>
              <CardContent>
                {isSuperAdmin && !capacity.isLoading && !capacity.users.isUnlimited && (
                  <div className="mb-6"><UserCapacityBar capacity={capacity} onAddSeats={() => setIsAddUserSeatsOpen(true)} /></div>
                )}
                {loading ? (
                  <DashboardLoader size="md" className="py-8" />
                ) : users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No active users found.</p>
                ) : (
                  <div className="space-y-6">
                    {[
                      { label: 'Leadership', icon: Shield, roles: ['super_admin', 'admin', 'manager', 'general_manager', 'assistant_manager'] },
                      { label: 'Operations', icon: Cog, roles: ['director_of_operations', 'operations_assistant', 'receptionist', 'front_desk'] },
                      { label: 'Stylists', icon: Users, roles: ['stylist', 'stylist_assistant'] },
                    ].map(section => {
                      const sectionUsers = users.filter(u => section.roles.includes(u.role));
                      if (sectionUsers.length === 0) return null;
                      const SIcon = section.icon;
                      return (
                        <div key={section.label} className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <SIcon className="w-4 h-4 text-primary" />
                            <h3 className="font-display text-sm uppercase tracking-wider text-foreground">{section.label}</h3>
                            <span className="text-xs text-muted-foreground">({sectionUsers.length})</span>
                          </div>
                          {sectionUsers.map(u => (
                            <UserCard key={u.user_id} u={u} updatingUser={updatingUser} updateUserRole={updateUserRole} removeUser={removeUser} currentUserId={user?.id} dynamicRoleOptions={dynamicRoleOptions} />
                          ))}
                        </div>
                      );
                    })}
                    {(() => {
                      const categorizedRoles = ['super_admin', 'admin', 'manager', 'general_manager', 'assistant_manager', 'director_of_operations', 'operations_assistant', 'receptionist', 'front_desk', 'stylist', 'stylist_assistant'];
                      const uncategorizedUsers = users.filter(u => !categorizedRoles.includes(u.role));
                      if (uncategorizedUsers.length === 0) return null;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">Other Roles</h3>
                            <span className="text-xs text-muted-foreground">({uncategorizedUsers.length})</span>
                          </div>
                          {uncategorizedUsers.map(u => (
                            <UserCard key={u.user_id} u={u} updatingUser={updatingUser} updateUserRole={updateUserRole} removeUser={removeUser} currentUserId={user?.id} dynamicRoleOptions={dynamicRoleOptions} />
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeCategory === 'onboarding' && <OnboardingConfigurator />}
          {activeCategory === 'leaderboard' && <LeaderboardConfigurator />}
          {activeCategory === 'integrations' && <IntegrationsTab />}

          {activeCategory === 'system' && (
            <Tabs defaultValue="settings" className="space-y-6">
              <TabsList>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="metrics">Metrics Glossary</TabsTrigger>
              </TabsList>
              <TabsContent value="settings" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-0">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-primary" />
                      <CardTitle className="font-display text-lg">APPEARANCE</CardTitle>
                    </div>
                    <CardDescription>Customize the dashboard appearance. Only affects the backend dashboard.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Color Theme</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {colorThemes.map((themeOption) => {
                          const isSelected = colorMounted && colorTheme === themeOption.id;
                          const isDark = resolvedTheme === 'dark';
                          const preview = isDark ? themeOption.darkPreview : themeOption.lightPreview;
                          return (
                            <button key={themeOption.id} onClick={() => {
                              setColorTheme(themeOption.id);
                              const mappedName = COLOR_THEME_TO_CATEGORY_MAP[themeOption.id];
                              const matched = categoryThemes?.find(t => t.name === mappedName);
                              if (matched) {
                                applyCategoryTheme.mutate(matched);
                                toast({ title: 'Theme updated', description: `Service colors synced to "${mappedName}"` });
                              }
                              syncSplashToTheme(themeOption.id);
                            }}
                              className={cn("relative flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
                                isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50")}>
                              <div className="flex items-center gap-1.5 w-full">
                                <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: preview.bg }} />
                                <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: preview.accent }} />
                                <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: preview.primary }} />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-sm font-medium">{themeOption.name}</span>
                                <p className="text-xs text-muted-foreground">{themeOption.description}</p>
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Theme Mode</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'light' as const, icon: Sun, label: 'Light', iconClass: 'text-foreground', bgClass: 'bg-secondary' },
                          { id: 'dark' as const, icon: Moon, label: 'Dark', iconClass: 'text-background', bgClass: 'bg-foreground' },
                          { id: 'system' as const, icon: Monitor, label: 'System', iconClass: 'text-muted-foreground', bgClass: 'bg-gradient-to-br from-secondary to-foreground' },
                        ].map(t => (
                          <button key={t.id} onClick={() => setTheme(t.id)}
                            className={cn("flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                              mounted && theme === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                            <div className={cn("w-10 h-10 rounded-full border border-border flex items-center justify-center", t.bgClass)}>
                              <t.icon className={cn("w-5 h-5", t.iconClass)} />
                            </div>
                            <span className="text-sm font-medium">{t.label}</span>
                            {mounted && theme === t.id && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Keyboard className="w-5 h-5 text-primary" />
                      <CardTitle className="font-display text-lg">KEYBOARD SHORTCUTS</CardTitle>
                    </div>
                    <CardDescription>Built for fast navigation and control.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Command palette', keys: ['⌘', 'K'] },
                      { label: 'Help (shortcuts)', keys: ['?'] },
                      { label: 'Close dialog/panel', keys: ['Esc'] },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between gap-4">
                        <span className="text-sm">{s.label}</span>
                        <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-mono">
                          {s.keys.map(k => <span key={k} className="bg-background px-1 py-0.5 rounded border">{k}</span>)}
                        </kbd>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-2 border-t">Use the command palette for navigation, quick actions, and switching theme.</p>
                  </CardContent>
                </Card>
                <RegionalSettingsCard />
                <SoundSettingsSection />
                <CheckoutAlertsSection />
                <RevenueDisplayModeCard />
                <InfotainerToggleCard />
                <SecuritySettingsCard />
                <UserPinSettings />
              </TabsContent>
              <TabsContent value="metrics" className="mt-0"><MetricsGlossaryContent /></TabsContent>
            </Tabs>
          )}

          {activeCategory === 'program' && (
            <Card className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GraduationCap className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">The Program Editor is a complex configuration tool.</p>
                <Button onClick={() => navigate(dashPath('/admin/program-editor'))}>Open Program Editor</Button>
              </div>
            </Card>
          )}

          {activeCategory === 'levels' && <StylistLevelsContent onActions={setCategoryActions} />}
          {activeCategory === 'services' && <ServicesSettingsContent />}
          {activeCategory === 'locations' && <LocationsSettingsContent />}
          {activeCategory === 'dayrate' && <DayRateSettingsContent />}
          {activeCategory === 'loyalty' && <LoyaltySettingsContent />}
          {activeCategory === 'team-rewards' && <TeamRewardsConfigurator />}
          {activeCategory === 'feedback' && (
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">REVIEW THRESHOLD SETTINGS</CardTitle><CardDescription>Configure when clients are prompted to leave public reviews.</CardDescription></CardHeader>
              <CardContent><ReviewThresholdSettings /></CardContent>
            </Card>
          )}
          {activeCategory === 'kiosk' && <KioskSettingsContent />}
          {activeCategory === 'retail-products' && <RetailProductsSettingsContent />}
          {activeCategory === 'account-billing' && <AccountBillingContent />}
          {activeCategory === 'terminals' && <TerminalSettingsContent />}
        </Suspense>

        <AddUserSeatsDialog open={isAddUserSeatsOpen} onOpenChange={setIsAddUserSeatsOpen} capacity={capacity} />

        <AlertDialog open={!!deactivateUserId} onOpenChange={(open) => !open && setDeactivateUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
              <AlertDialogDescription>
                This user will be removed from active staff. They will no longer appear in schedules, assignments, or team views. This action can be reversed by reactivating them later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeactivateUser}>Deactivate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
