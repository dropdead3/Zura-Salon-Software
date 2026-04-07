import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Bell, 
  Shield,
  Loader2,
  Trash2,
  Mail,
  Cog,
  Rocket,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Plug,
  
  GraduationCap,
  BookOpen,
  Layers,
  LayoutDashboard,
  GripVertical,
  Pencil,
  X,
  Save,
  RotateCcw,
  Building2,
  CalendarDays,
  MapPin,
  Armchair,
  MessageSquare,
  Sparkles,
  Settings2,
  FileCheck,
  Plus,
  Gift,
  Trophy,
  TabletSmartphone,
  Keyboard,
  Scissors,
  Lightbulb,
  ShoppingBag,
  ArrowLeft,
  Wallet,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
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

import { useBusinessCapacity } from '@/hooks/useBusinessCapacity';
import { UserCapacityBar } from '@/components/dashboard/settings/UserCapacityBar';
import { AddUserSeatsDialog } from '@/components/dashboard/settings/AddUserSeatsDialog';
import { useToast } from '@/hooks/use-toast';
import { OnboardingTasksManager } from '@/components/dashboard/OnboardingTasksManager';
import { LeaderboardWeightsManager } from '@/components/dashboard/LeaderboardWeightsManager';
import { BusinessSettingsDialog } from '@/components/dashboard/settings/BusinessSettingsDialog';
import { UserPinSettings } from '@/components/dashboard/settings/UserPinSettings';
import { SoundSettingsSection } from '@/components/dashboard/settings/SoundSettingsSection';
import { CheckoutAlertsSection } from '@/components/dashboard/settings/CheckoutAlertsSection';
import { ReviewThresholdSettings } from '@/components/feedback/ReviewThresholdSettings';

import { MessageSquareHeart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServicesWithFlowsCount } from '@/hooks/useServiceCommunicationFlows';
import { useColorTheme, colorThemes } from '@/hooks/useColorTheme';
import { useRoleUtils } from '@/hooks/useRoleUtils';
import { useBillingAccess } from '@/hooks/useBillingAccess';
import { useSettingsLayout, useUpdateSettingsLayout, DEFAULT_ORDER, SECTION_GROUPS } from '@/hooks/useSettingsLayout';
import { useStaffingAlertSettings, useUpdateStaffingAlertSettings } from '@/hooks/useStaffingAlertSettings';
import { cn } from '@/lib/utils';
import { useInfotainerSettings } from '@/hooks/useInfotainers';
import { useOrgSecuritySettings } from '@/hooks/useOrgSecuritySettings';
import { Slider } from '@/components/ui/slider';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragFeedback } from '@/components/dnd/DragFeedback';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';


interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
}


type SettingsCategory = 'my-profile' | 'business' | 'email' | 'sms' | 'service-flows' | 'users' | 'onboarding' | 'integrations' | 'system' | 'program' | 'levels' | 'access-hub' | 'locations' | 'dayrate' | 'forms' | 'loyalty' | 'feedback' | 'leaderboard' | 'team-rewards' | 'kiosk' | 'services' | 'retail-products' | 'account-billing' | null;


interface SortableCardProps {
  category: {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  };
  isEditMode: boolean;
  onClick: () => void;
}

function SortableCard({ category, isEditMode, onClick }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = category.icon;

  return (
    <DragFeedback
      ref={setNodeRef}
      style={style}
      isDragging={isDragging}
      isOver={isOver}
      className="group relative"
    >
      <Card 
        className={cn(
          "transition-all relative h-[140px]",
          !isEditMode && "cursor-pointer group hover:border-primary/30 hover:shadow-md",
          isEditMode && "border-dashed",
          isDragging && "opacity-50"
        )}
        onClick={!isEditMode ? onClick : undefined}
      >
        <MetricInfoTooltip description={category.description} className="absolute top-3 right-3 w-4 h-4" />
        {isEditMode && (
          <div 
            {...attributes}
            {...listeners}
            className="absolute top-3 right-3 p-1.5 rounded-md bg-muted hover:bg-muted/80 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
          <div className={tokens.card.iconBox}>
            <Icon className={tokens.card.icon} />
          </div>
          <span className={tokens.card.title}>{category.label}</span>
        </div>
      </Card>
    </DragFeedback>
  );
}

// Help & Guidance toggle card
function InfotainerToggleCard() {
  const { showInfotainers, toggleInfotainers, isToggling } = useInfotainerSettings();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
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
          <Switch
            checked={showInfotainers}
            onCheckedChange={toggleInfotainers}
            disabled={isToggling}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Security settings card
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
          <Switch
            checked={requireEmailVerification}
            onCheckedChange={(val) => updateSecurity({ require_email_verification: val })}
            disabled={isSaving}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans font-medium text-sm">Restrict Sign-ups</p>
            <p className="text-xs text-muted-foreground">Only approved email domains</p>
          </div>
          <Switch
            checked={restrictSignups}
            onCheckedChange={(val) => updateSecurity({ restrict_signups: val })}
            disabled={isSaving}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Notifications card component with staffing alert settings
function NotificationsCard() {
  const { data: staffingSettings, isLoading: isLoadingSettings } = useStaffingAlertSettings();
  const updateStaffingSettings = useUpdateStaffingAlertSettings();
  const [localThreshold, setLocalThreshold] = useState(70);
  const [localEmailEnabled, setLocalEmailEnabled] = useState(true);
  const [localInAppEnabled, setLocalInAppEnabled] = useState(true);

  // Sync local state with fetched settings
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
        {/* Staffing Alerts Section */}
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
                <Slider 
                  value={[localThreshold]} 
                  onValueChange={([val]) => setLocalThreshold(val)}
                  min={50} 
                  max={95} 
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Receive alerts when any location falls below this capacity percentage
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-sm">Send email alerts</p>
                  <p className="text-xs text-muted-foreground">Email admins when threshold is breached</p>
                </div>
                <Switch 
                  checked={localEmailEnabled} 
                  onCheckedChange={setLocalEmailEnabled} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-sm">In-app notifications</p>
                  <p className="text-xs text-muted-foreground">Show alerts in notification center</p>
                </div>
                <Switch 
                  checked={localInAppEnabled} 
                  onCheckedChange={setLocalInAppEnabled} 
                />
              </div>
              
              {hasStaffingChanges && (
                <Button 
                  size={tokens.button.card} 
                  onClick={handleSaveStaffingSettings}
                  disabled={updateStaffingSettings.isPending}
                  className="w-full"
                >
                  {updateStaffingSettings.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Alert Settings
                </Button>
              )}
            </>
          )}
        </div>

        {/* Other notification settings */}
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

// Service Communication Flows Card
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
            <div className="text-3xl font-display">
              {isLoading ? '...' : servicesWithFlowsCount || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              services with custom communication flows
            </div>
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

// User card component for team members list
function UserCard({ 
  u, 
  updatingUser, 
  updateUserRole, 
  removeUser, 
  currentUserId, 
  dynamicRoleOptions 
}: { 
  u: UserWithRole; 
  updatingUser: string | null; 
  updateUserRole: (userId: string, role: string) => void;
  removeUser: (userId: string) => void;
  currentUserId?: string;
  dynamicRoleOptions: { value: string; label: string }[];
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
        <Select
          value={u.role}
          onValueChange={(value) => updateUserRole(u.user_id, value)}
          disabled={updatingUser === u.user_id}
        >
          <SelectTrigger className="w-32">
            {updatingUser === u.user_id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectGroup>
              <SelectLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Leadership</SelectLabel>
              {dynamicRoleOptions
                .filter(role => ['super_admin', 'admin', 'manager', 'general_manager', 'assistant_manager'].includes(role.value))
                .map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Operations</SelectLabel>
              {dynamicRoleOptions
                .filter(role => ['director_of_operations', 'operations_assistant', 'receptionist', 'front_desk'].includes(role.value))
                .map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stylists</SelectLabel>
              {dynamicRoleOptions
                .filter(role => ['stylist', 'stylist_assistant'].includes(role.value))
                .map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
            </SelectGroup>
            {/* Other roles not in the 3 main categories */}
            {(() => {
              const categorizedRoles = ['super_admin', 'admin', 'manager', 'general_manager', 'assistant_manager', 'director_of_operations', 'operations_assistant', 'receptionist', 'front_desk', 'stylist', 'stylist_assistant'];
              const otherRoles = dynamicRoleOptions.filter(role => !categorizedRoles.includes(role.value));
              if (otherRoles.length === 0) return null;
              return (
                <SelectGroup>
                  <SelectLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other</SelectLabel>
                  {otherRoles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })()}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeUser(u.user_id)}
          disabled={u.user_id === currentUserId}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { dashPath } = useOrgDashboardPath();
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useDashboardTheme();
  const { colorTheme, setColorTheme, mounted: colorMounted } = useColorTheme();
  const { roleOptions: dynamicRoleOptions, isLoading: rolesLoading } = useRoleUtils();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Initialize activeCategory from query param
  const initialCategory = (() => {
    const param = searchParams.get('category');
    if (param === 'schedule') return 'services' as SettingsCategory;
    if (param === 'website') return null; // Redirected to Website Hub
    if (param && param in { business: 1, email: 1, sms: 1, 'service-flows': 1, users: 1, onboarding: 1, integrations: 1, system: 1, program: 1, levels: 1, 'access-hub': 1, locations: 1, dayrate: 1, forms: 1, loyalty: 1, feedback: 1, leaderboard: 1, 'team-rewards': 1, kiosk: 1, services: 1, 'retail-products': 1, 'account-billing': 1 }) {
      return param as SettingsCategory;
    }
    return null;
  })();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialCategory);
  const [mounted, setMounted] = useState(false);
  const [isAddUserSeatsOpen, setIsAddUserSeatsOpen] = useState(false);
  
  const capacity = useBusinessCapacity();
  const isSuperAdmin = roles?.includes('super_admin') || roles?.includes('admin');
  const { canViewBilling } = useBillingAccess();

  // Reset to main view when nav link is clicked (same route navigation)
  useEffect(() => {
    if (location.state?.navTimestamp) {
      setActiveCategory(null);
    }
  }, [location.state?.navTimestamp]);
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  
  // Layout editing state
  const [isEditMode, setIsEditMode] = useState(false);
  const { data: layoutPrefs } = useSettingsLayout();
  const updateLayout = useUpdateSettingsLayout();
  const [localOrder, setLocalOrder] = useState<string[]>(DEFAULT_ORDER);
  
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with stored preferences
  useEffect(() => {
    if (layoutPrefs) {
      setLocalOrder(layoutPrefs.order);
    }
  }, [layoutPrefs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeCategory === 'users') fetchUsers();
  }, [activeCategory]);

  const fetchUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('employee_profiles')
      .select('user_id, email, full_name')
      .eq('is_active', true);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
      const userRole = roles?.find(r => r.user_id === profile.user_id);
      return {
        user_id: profile.user_id,
        email: profile.email || '',
        full_name: profile.full_name,
        role: userRole?.role || 'stylist',
      };
    });

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUser(userId);

    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let error;
    if (existingRole) {
      const result = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', userId);
      error = result.error;
    } else {
      const result = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole as any });
      error = result.error;
    }

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update role.',
      });
    } else {
      setUsers(prev =>
        prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u)
      );
      toast({
        title: 'Role Updated',
        description: `User role changed to ${newRole}.`,
      });
    }

    setUpdatingUser(null);
  };

  const removeUser = async (userId: string) => {
    if (userId === user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: "You can't remove yourself.",
      });
      return;
    }

    if (!confirm('Are you sure you want to deactivate this user?')) return;

    const { error } = await supabase
      .from('employee_profiles')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (!error) {
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      toast({
        title: 'User Deactivated',
        description: 'User has been removed from active staff.',
      });
    }
  };

  const categoriesMap: Record<string, { id: string; label: string; description: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
    'my-profile': {
      id: 'my-profile',
      label: 'My Profile',
      description: 'Manage your profile photo, bio, specialties, and professional details visible to clients and teammates.',
      icon: Users,
    },
    'business': {
      id: 'business',
      label: 'Business',
      description: 'Configure your business name, logo, address, EIN, and other organization-level identity details.',
      icon: Building2,
    },
    'email': {
      id: 'email',
      label: 'Email',
      description: 'Customize email templates, merge variables, sender signatures, and default communication settings.',
      icon: Mail,
    },
    'users': {
      id: 'users',
      label: 'Users',
      description: 'Add, remove, and manage team members. Assign roles and control access levels across the organization.',
      icon: Users,
    },
    'onboarding': {
      id: 'onboarding',
      label: 'Onboarding',
      description: 'Define onboarding task lists, handbooks, and role-specific configuration for new team members.',
      icon: Rocket,
    },
    'leaderboard': {
      id: 'leaderboard',
      label: 'Leaderboard',
      description: 'Set scoring weights for KPIs, configure achievement badges, and customize how team performance is ranked.',
      icon: Trophy,
    },
    'integrations': {
      id: 'integrations',
      label: 'Integrations',
      description: 'Connect and manage third-party services such as POS systems, payment processors, and marketing platforms.',
      icon: Plug,
    },
    'system': {
      id: 'system',
      label: 'System',
      description: 'Control appearance themes, notification preferences, security settings, and global platform behavior.',
      icon: Cog,
    },
    'program': {
      id: 'program',
      label: 'Program Editor',
      description: 'Build and edit Client Engine courses, modules, and learning paths for structured team development.',
      icon: GraduationCap,
    },
    'levels': {
      id: 'levels',
      label: 'Stylist Levels',
      description: 'Define experience tiers, associate pricing multipliers, and set promotion criteria for stylists.',
      icon: Layers,
    },
    'access-hub': {
      id: 'access-hub',
      label: 'Roles & Controls Hub',
      description: 'Configure which modules, pages, and features are visible to each role. Manage granular permissions.',
      icon: Shield,
    },
    'locations': {
      id: 'locations',
      label: 'Locations',
      description: 'Manage salon addresses, operating hours, holiday schedules, and location-specific settings.',
      icon: MapPin,
    },
    'dayrate': {
      id: 'dayrate',
      label: 'Day Rate',
      description: 'Configure chair rental pricing, day-rate agreements, and independent contractor billing terms.',
      icon: Armchair,
    },
    'sms': {
      id: 'sms',
      label: 'Text Messages',
      description: 'Create and manage SMS templates, automated text sequences, and messaging rules for client communication.',
      icon: MessageSquare,
    },
    'service-flows': {
      id: 'service-flows',
      label: 'Service Flows',
      description: 'Design automated email and text sequences triggered by specific services, appointments, or client actions.',
      icon: Sparkles,
    },
    'forms': {
      id: 'forms',
      label: 'Forms',
      description: 'Create and manage client-facing agreements, consultation forms, waivers, and intake documents.',
      icon: FileCheck,
    },
    'loyalty': {
      id: 'loyalty',
      label: 'Client Rewards',
      description: 'Configure loyalty point earning rules, reward tiers, gift card settings, and client incentive programs.',
      icon: Gift,
    },
    'feedback': {
      id: 'feedback',
      label: 'Feedback Settings',
      description: 'Set review request thresholds, configure platform review links, and manage client feedback collection.',
      icon: MessageSquareHeart,
    },
    'team-rewards': {
      id: 'team-rewards',
      label: 'Team Rewards',
      description: 'Manage the staff points economy, define reward catalog items, and set earning rules for team incentives.',
      icon: Gift,
    },
    'kiosk': {
      id: 'kiosk',
      label: 'Kiosks',
      description: 'Set up check-in kiosks, self-service booking terminals, and configure device-specific display settings.',
      icon: TabletSmartphone,
    },
    'services': {
      id: 'services',
      label: 'Services',
      description: 'Manage service categories, individual services, durations, and pricing across all locations.',
      icon: Scissors,
    },
    'retail-products': {
      id: 'retail-products',
      label: 'Retail Products',
      description: 'Manage product brands, categories, inventory levels, pricing, and retail display configurations.',
      icon: ShoppingBag,
    },
    'account-billing': {
      id: 'account-billing',
      label: 'Account & Billing',
      description: 'View and manage your subscription plan, payment methods, invoices, and billing history.',
      icon: Wallet,
    },
  };

  const orderedCategories = useMemo(() => {
    return localOrder.map(id => categoriesMap[id]).filter(Boolean);
  }, [localOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setLocalOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };

  const handleSaveLayout = () => {
    updateLayout.mutate(
      { order: localOrder, iconColors: {} },
      {
        onSuccess: () => {
          toast({ title: 'Layout saved', description: 'Your settings layout has been saved.' });
          setIsEditMode(false);
          setHasChanges(false);
        },
        onError: () => {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to save layout.' });
        },
      }
    );
  };

  const handleResetLayout = () => {
    setLocalOrder(DEFAULT_ORDER);
    setHasChanges(true);
  };

  const handleCancelEdit = () => {
    if (layoutPrefs) {
      setLocalOrder(layoutPrefs.order);
    }
    setIsEditMode(false);
    setHasChanges(false);
  };

  // State for category-specific action buttons (e.g. Stylist Levels)
  const [categoryActions, setCategoryActions] = useState<React.ReactNode>(null);

  // If a category is selected, show detailed view
  if (activeCategory) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          {/* Back button and header */}
          <div className="mb-6">
            <DashboardPageHeader
              title={categoriesMap[activeCategory]?.label.toUpperCase() ?? ''}
              actions={categoryActions}
            />
            <div className="mt-4">
              <PageExplainer pageId="settings" />
            </div>
          </div>

          <Suspense fallback={<DashboardLoader size="md" className="h-64" />}>
          {/* Category Content */}
          {activeCategory === 'email' && (
            <Tabs defaultValue="branding" className="w-full">
              <TabsList>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="signatures">Signatures</TabsTrigger>
              </TabsList>

              <TabsContent value="branding">
                <EmailBrandingSettings />
              </TabsContent>

              <TabsContent value="templates">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg">EMAIL TEMPLATES</CardTitle>
                    <CardDescription>Customize email templates for automated notifications.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EmailTemplatesManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="variables">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg">EMAIL VARIABLES</CardTitle>
                    <CardDescription>Manage available template variables.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EmailVariablesManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="signatures">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg">SIGNATURE PRESETS</CardTitle>
                    <CardDescription>Reusable email signature blocks.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SignaturePresetsManager />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {activeCategory === 'sms' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg">SMS TEMPLATES</CardTitle>
                  <CardDescription>Customize text message templates for automated notifications.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SmsTemplatesManager />
                </CardContent>
                </Card>
            </div>
          )}

          {activeCategory === 'service-flows' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ServiceCommunicationFlowsCard />
              <ServiceEmailFlowsManager />
            </div>
          )}

          {activeCategory === 'forms' && (
            <FormsTemplatesContent />
          )}

          {activeCategory === 'users' && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">TEAM MEMBERS</CardTitle>
                <CardDescription>Manage team members and their access levels.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* User capacity bar for super admins */}
                {isSuperAdmin && !capacity.isLoading && !capacity.users.isUnlimited && (
                  <div className="mb-6">
                    <UserCapacityBar 
                      capacity={capacity} 
                      onAddSeats={() => setIsAddUserSeatsOpen(true)} 
                    />
                  </div>
                )}
                
                {loading ? (
                  <DashboardLoader size="md" className="py-8" />
                ) : users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No active users found.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {/* Leadership Section */}
                    {(() => {
                      const leadershipUsers = users.filter(u => 
                        ['super_admin', 'admin', 'manager', 'general_manager', 'assistant_manager'].includes(u.role)
                      );
                      if (leadershipUsers.length === 0) return null;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Shield className="w-4 h-4 text-primary" />
                            <h3 className="font-display text-sm uppercase tracking-wider text-foreground">Leadership</h3>
                            <span className="text-xs text-muted-foreground">({leadershipUsers.length})</span>
                          </div>
                          {leadershipUsers.map(u => (
                            <UserCard 
                              key={u.user_id} 
                              u={u} 
                              updatingUser={updatingUser}
                              updateUserRole={updateUserRole}
                              removeUser={removeUser}
                              currentUserId={user?.id}
                              dynamicRoleOptions={dynamicRoleOptions}
                            />
                          ))}
                        </div>
                      );
                    })()}

                    {/* Operations Section */}
                    {(() => {
                      const operationsUsers = users.filter(u => 
                        ['director_of_operations', 'operations_assistant', 'receptionist', 'front_desk'].includes(u.role)
                      );
                      if (operationsUsers.length === 0) return null;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Cog className="w-4 h-4 text-primary" />
                            <h3 className="font-display text-sm uppercase tracking-wider text-foreground">Operations</h3>
                            <span className="text-xs text-muted-foreground">({operationsUsers.length})</span>
                          </div>
                          {operationsUsers.map(u => (
                            <UserCard 
                              key={u.user_id} 
                              u={u} 
                              updatingUser={updatingUser}
                              updateUserRole={updateUserRole}
                              removeUser={removeUser}
                              currentUserId={user?.id}
                              dynamicRoleOptions={dynamicRoleOptions}
                            />
                          ))}
                        </div>
                      );
                    })()}

                    {/* Stylists Section */}
                    {(() => {
                      const stylistUsers = users.filter(u => 
                        ['stylist', 'stylist_assistant'].includes(u.role)
                      );
                      if (stylistUsers.length === 0) return null;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Users className="w-4 h-4 text-primary" />
                            <h3 className="font-display text-sm uppercase tracking-wider text-foreground">Stylists</h3>
                            <span className="text-xs text-muted-foreground">({stylistUsers.length})</span>
                          </div>
                          {stylistUsers.map(u => (
                            <UserCard 
                              key={u.user_id} 
                              u={u} 
                              updatingUser={updatingUser}
                              updateUserRole={updateUserRole}
                              removeUser={removeUser}
                              currentUserId={user?.id}
                              dynamicRoleOptions={dynamicRoleOptions}
                            />
                          ))}
                        </div>
                      );
                    })()}

                    {/* Uncategorized Section */}
                    {(() => {
                      const uncategorizedUsers = users.filter(u => 
                        !['super_admin', 'admin', 'manager', 'general_manager', 'assistant_manager', 'director_of_operations', 'operations_assistant', 'receptionist', 'front_desk', 'stylist', 'stylist_assistant'].includes(u.role)
                      );
                      if (uncategorizedUsers.length === 0) return null;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">Other Roles</h3>
                            <span className="text-xs text-muted-foreground">({uncategorizedUsers.length})</span>
                          </div>
                          {uncategorizedUsers.map(u => (
                            <UserCard 
                              key={u.user_id} 
                              u={u} 
                              updatingUser={updatingUser}
                              updateUserRole={updateUserRole}
                              removeUser={removeUser}
                              currentUserId={user?.id}
                              dynamicRoleOptions={dynamicRoleOptions}
                            />
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeCategory === 'onboarding' && (
            <OnboardingConfigurator />
          )}

          {activeCategory === 'leaderboard' && (
            <LeaderboardConfigurator />
          )}

          {activeCategory === 'integrations' && (
            <IntegrationsTab />
          )}

          {activeCategory === 'system' && (
            <Tabs defaultValue="settings" className="space-y-6">
              <TabsList>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="metrics">Metrics Glossary</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-0">
                {/* Appearance */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-primary" />
                      <CardTitle className="font-display text-lg">APPEARANCE</CardTitle>
                    </div>
                    <CardDescription>Customize the dashboard appearance. Only affects the backend dashboard.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {/* Color Theme Selection */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Color Theme</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {colorThemes.map((themeOption) => {
                          const isSelected = colorMounted && colorTheme === themeOption.id;
                          const isDark = resolvedTheme === 'dark';
                          const preview = isDark ? themeOption.darkPreview : themeOption.lightPreview;
                          
                          return (
                            <button
                              key={themeOption.id}
                              onClick={() => setColorTheme(themeOption.id)}
                              className={cn(
                                "relative flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
                                isSelected
                                  ? "border-primary ring-2 ring-primary/20"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-center gap-1.5 w-full">
                                <div 
                                  className="w-8 h-8 rounded-lg border border-border"
                                  style={{ backgroundColor: preview.bg }}
                                />
                                <div 
                                  className="w-8 h-8 rounded-lg border border-border"
                                  style={{ backgroundColor: preview.accent }}
                                />
                                <div 
                                  className="w-8 h-8 rounded-lg border border-border"
                                  style={{ backgroundColor: preview.primary }}
                                />
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

                    {/* Theme Mode Toggle */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Theme Mode</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => setTheme('light')}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                            mounted && theme === 'light'
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
                            <Sun className="w-5 h-5 text-foreground" />
                          </div>
                          <span className="text-sm font-medium">Light</span>
                          {mounted && theme === 'light' && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => setTheme('dark')}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                            mounted && theme === 'dark'
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="w-10 h-10 rounded-full bg-foreground border border-border flex items-center justify-center">
                            <Moon className="w-5 h-5 text-background" />
                          </div>
                          <span className="text-sm font-medium">Dark</span>
                          {mounted && theme === 'dark' && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => setTheme('system')}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                            mounted && theme === 'system'
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-foreground border border-border flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">System</span>
                          {mounted && theme === 'system' && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
              </Card>

                {/* Keyboard Shortcuts */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Keyboard className="w-5 h-5 text-primary" />
                      <CardTitle className="font-display text-lg">KEYBOARD SHORTCUTS</CardTitle>
                    </div>
                    <CardDescription>Built for fast navigation and control.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm">Command palette</span>
                      <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-mono">
                        <span className="bg-background px-1 py-0.5 rounded border">⌘</span>
                        <span className="bg-background px-1 py-0.5 rounded border">K</span>
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm">Help (shortcuts)</span>
                      <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-mono">
                        <span className="bg-background px-1 py-0.5 rounded border">?</span>
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm">Close dialog/panel</span>
                      <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-mono">
                        <span className="bg-background px-1 py-0.5 rounded border">Esc</span>
                      </kbd>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      Use the command palette for navigation, quick actions, and switching theme.
                    </p>
                  </CardContent>
                </Card>

                <SoundSettingsSection />
                <CheckoutAlertsSection />

                {/* Help & Guidance */}
                <InfotainerToggleCard />

                {/* Security */}
                <SecuritySettingsCard />

                {/* Quick Login PIN */}
                <UserPinSettings />
              </TabsContent>

              <TabsContent value="metrics" className="mt-0">
                <MetricsGlossaryContent />
              </TabsContent>
            </Tabs>
          )}

          {activeCategory === 'program' && (
            <Card className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GraduationCap className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  The Program Editor is a complex configuration tool.
                </p>
                <Button onClick={() => window.location.href = '/dashboard/admin/program-editor'}>
                  Open Program Editor
                </Button>
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
              <CardHeader>
                <CardTitle className="font-display text-lg">REVIEW THRESHOLD SETTINGS</CardTitle>
                <CardDescription>Configure when clients are prompted to leave public reviews.</CardDescription>
              </CardHeader>
              <CardContent>
                <ReviewThresholdSettings />
              </CardContent>
            </Card>
          )}

          {activeCategory === 'kiosk' && <KioskSettingsContent />}

          {activeCategory === 'retail-products' && <RetailProductsSettingsContent />}

          {activeCategory === 'account-billing' && <AccountBillingContent />}
          </Suspense>
        </div>
      </DashboardLayout>
    );
  }

  // Main settings grid view
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl mb-2">SETTINGS</h1>
            <p className="text-muted-foreground font-sans">
              Manage system configuration, users, and communications.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button
                  variant="outline"
                  size={tokens.button.card}
                  onClick={handleResetLayout}
                  className="gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size={tokens.button.card}
                  onClick={handleCancelEdit}
                  className="gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  size={tokens.button.card}
                  onClick={handleSaveLayout}
                  disabled={!hasChanges || updateLayout.isPending}
                  className="gap-1.5"
                >
                  {updateLayout.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Layout
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size={tokens.button.card}
                onClick={() => setIsEditMode(true)}
                className="gap-1.5"
              >
                <Pencil className="w-4 h-4" />
                Edit Layout
              </Button>
            )}
          </div>
        </div>

        {isEditMode && (
          <div className="mb-4 p-3 bg-muted/50 border rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
            <GripVertical className="w-4 h-4" />
            <span>Drag cards to reorder.</span>
          </div>
        )}

        {/* Category Cards Grid - Grouped by Section */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-8">
            {SECTION_GROUPS.map((section) => {
              // Get categories for this section, respecting user's order within section
              // Filter out 'feedback' category for non-super admins
              const sectionCategoryIds = section.categories.filter(id => 
                localOrder.includes(id) && categoriesMap[id] && (id !== 'feedback' || isSuperAdmin) && (id !== 'account-billing' || canViewBilling)
              );
              
              // Sort by user's localOrder
              sectionCategoryIds.sort((a, b) => 
                localOrder.indexOf(a) - localOrder.indexOf(b)
              );
              
              if (sectionCategoryIds.length === 0) return null;
              
              return (
                <div key={section.id} className="space-y-4">
                  {/* Section Header */}
                  <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">
                    {section.label}
                  </h2>
                  
                  {/* Section Grid */}
                  <SortableContext items={sectionCategoryIds} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sectionCategoryIds.map((categoryId) => {
                        const category = categoriesMap[categoryId];
                        if (!category) return null;
                        
                        return (
                          <SortableCard
                            key={category.id}
                            category={category}
                            isEditMode={isEditMode}
                            onClick={() => {
                              if (category.id === 'my-profile') {
                                navigate(dashPath('/profile'));
                              } else if (category.id === 'business') {
                                setBusinessDialogOpen(true);
                              } else if (category.id === 'access-hub') {
                                navigate(dashPath('/admin/access-hub'));
                              } else {
                                setActiveCategory(category.id as SettingsCategory);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>

        {/* Business Settings Dialog */}
        <BusinessSettingsDialog 
          open={businessDialogOpen} 
          onOpenChange={setBusinessDialogOpen} 
        />
        
        {/* Add User Seats Dialog */}
        <AddUserSeatsDialog
          open={isAddUserSeatsOpen}
          onOpenChange={setIsAddUserSeatsOpen}
          capacity={capacity}
        />
      </div>
    </DashboardLayout>
  );
}
