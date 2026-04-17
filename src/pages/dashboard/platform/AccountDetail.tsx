import { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Building2, 
  MapPin,
  Users,
  Upload,
  Pencil,
  Mail,
  Phone,
  Globe,
  Calendar,
  CalendarRange,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  MessageSquare,
  Target,
  LayoutDashboard,
  RefreshCw,
  XCircle,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { logPlatformAction } from '@/hooks/useOrganizations';
import { useOrganizationWithStats, type OrganizationWithStats } from '@/hooks/useOrganizations';
import { EditOrganizationDialog } from '@/components/platform/EditOrganizationDialog';
import { AccountIntegrationsCard } from '@/components/platform/account/AccountIntegrationsCard';
import { AccountAppsCard } from '@/components/platform/account/AccountAppsCard';
import { MigrationCredentialsCard } from '@/components/platform/account/MigrationCredentialsCard';
const AccountUsersTab = lazy(() => import('@/components/platform/account/AccountUsersTab').then(m => ({ default: m.AccountUsersTab })));
const AccountSettingsTab = lazy(() => import('@/components/platform/account/AccountSettingsTab').then(m => ({ default: m.AccountSettingsTab })));
const AccountImportHistoryTab = lazy(() => import('@/components/platform/account/AccountImportHistoryTab').then(m => ({ default: m.AccountImportHistoryTab })));
const BillingConfigurationPanel = lazy(() => import('@/components/platform/billing/BillingConfigurationPanel').then(m => ({ default: m.BillingConfigurationPanel })));
const AccountNotesSection = lazy(() => import('@/components/platform/notes/AccountNotesSection').then(m => ({ default: m.AccountNotesSection })));
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { useOrganizationBilling, useSubscriptionPlans, type BillingStatus } from '@/hooks/useOrganizationBilling';
import { useLocations } from '@/hooks/useLocations';
import { useOrganizationUsage, calculateCapacity, getUtilizationColor, getUtilizationBgColor } from '@/hooks/useOrganizationCapacity';
import { cn } from '@/lib/utils';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';


const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  pending: 'warning',
  active: 'success',
  suspended: 'error',
  churned: 'default',
};

const stageConfig: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'primary' | 'warning' | 'success' }> = {
  new: { label: 'New', icon: <Clock className="h-4 w-4" />, variant: 'default' },
  importing: { label: 'Importing Data', icon: <Upload className="h-4 w-4" />, variant: 'primary' },
  training: { label: 'Training', icon: <Users className="h-4 w-4" />, variant: 'warning' },
  live: { label: 'Live', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'success' },
};

const businessTypeLabels: Record<string, string> = {
  salon: 'Salon',
  spa: 'Spa',
  esthetics: 'Esthetics',
  barbershop: 'Barbershop',
  med_spa: 'Med Spa',
  wellness: 'Wellness',
  other: 'Other',
};

export default function AccountDetail() {
  const { dashPath } = useOrgDashboardPath();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'overview';
  const { setSelectedOrganization } = useOrganizationContext();
  const { data: organization, isLoading } = useOrganizationWithStats(orgId);
  const { data: billing } = useOrganizationBilling(orgId);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <PlatformPageContainer>
        <AccountDetailSkeleton />
      </PlatformPageContainer>
    );
  }

  if (!organization) {
    return (
      <PlatformPageContainer>
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-[16px] bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Organization not found</h3>
          <p className="text-slate-500 mb-4">
            The organization you're looking for doesn't exist or you don't have access.
          </p>
          <PlatformButton onClick={() => navigate('/platform/accounts')} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to Accounts
          </PlatformButton>
        </div>
      </PlatformPageContainer>
    );
  }

  const stage = stageConfig[organization.onboarding_stage || 'new'];

  return (
    <PlatformPageContainer className="space-y-6">
      {/* Header */}
      <PlatformPageHeader
        title={organization.name}
        description={organization.slug}
        actions={
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mr-2">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt={organization.name} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-violet-400" />
              )}
            </div>
            <PlatformBadge variant={statusColors[organization.status || 'pending']} className="capitalize">
              {organization.status}
            </PlatformBadge>
            <PlatformButton variant="secondary" onClick={() => navigate(`/platform/import?org=${organization.id}`)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </PlatformButton>
            <PlatformButton 
              variant="secondary" 
              onClick={() => {
                setSelectedOrganization(organization);
                logPlatformAction(organization.id, 'dashboard_accessed', 'organization', organization.id, {
                  organization_name: organization.name,
                  action: 'view_dashboard',
                });
                navigate(dashPath('/'));
              }}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              View Dashboard
            </PlatformButton>
            <PlatformButton onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Account
            </PlatformButton>
          </div>
        }
      />
      <PageExplainer pageId="platform-account-detail" />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <PlatformCard variant="interactive" className="group">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50 group-hover:bg-violet-500/20 transition-colors">
                {stage.icon}
              </div>
              <div>
                <p className="text-sm text-slate-500">Onboarding Stage</p>
                <p className="font-medium text-white">{stage.label}</p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
        <PlatformCard variant="interactive" className="group">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50 group-hover:bg-violet-500/20 transition-colors">
                <MapPin className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Locations</p>
                <p className="font-medium text-white">{organization.locationCount}</p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
        <PlatformCard variant="interactive" className="group">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50 group-hover:bg-violet-500/20 transition-colors">
                <Users className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Team Members</p>
                <p className="font-medium text-white">{organization.adminCount}</p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
        <PlatformCard variant="interactive" className="group">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50 group-hover:bg-violet-500/20 transition-colors">
                <Upload className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Imports</p>
                <p className="font-medium text-white">{organization.completedImports} / {organization.importCount}</p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="locations"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            Locations
          </TabsTrigger>
          <TabsTrigger 
            value="users"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="migration"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            Migration
          </TabsTrigger>
          <TabsTrigger 
            value="billing"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger 
            value="notes"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Notes
          </TabsTrigger>
          <TabsTrigger 
            value="settings"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Contact Info */}
            <PlatformCard variant="glass">
              <PlatformCardHeader>
                <PlatformCardTitle className="text-lg">Contact Information</PlatformCardTitle>
              </PlatformCardHeader>
              <PlatformCardContent className="space-y-4">
                {organization.primary_contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-300">{organization.primary_contact_email}</span>
                  </div>
                )}
                {organization.primary_contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-300">{organization.primary_contact_phone}</span>
                  </div>
                )}
                {organization.website_url && (
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-violet-400" />
                    <a 
                      href={organization.website_url.startsWith('http') ? organization.website_url : `https://${organization.website_url}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 hover:underline transition-colors"
                    >
                      {organization.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                )}
                {!organization.primary_contact_email && !organization.primary_contact_phone && !organization.website_url && (
                  <p className="text-slate-500 text-sm">No contact information provided</p>
                )}
              </PlatformCardContent>
            </PlatformCard>

            {/* Account Details */}
            <PlatformCard variant="glass">
              <PlatformCardHeader>
                <PlatformCardTitle className="text-lg">Account Details</PlatformCardTitle>
              </PlatformCardHeader>
              <PlatformCardContent className="space-y-4">
                {organization.account_number && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-violet-400" />
                    <span className="text-slate-300">Account #{organization.account_number}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-300">Created {format(new Date(organization.created_at), 'MMM d, yyyy')}</span>
                </div>
                {organization.go_live_date && (
                  <div className="flex items-center gap-3">
                    <Target className={`h-4 w-4 ${
                      organization.onboarding_stage === 'live' 
                        ? 'text-emerald-400' 
                        : isBefore(parseISO(organization.go_live_date), startOfDay(new Date()))
                          ? 'text-red-400'
                          : 'text-amber-400'
                    }`} />
                    <span className={`${
                      organization.onboarding_stage === 'live' 
                        ? 'text-emerald-400' 
                        : isBefore(parseISO(organization.go_live_date), startOfDay(new Date()))
                          ? 'text-red-400'
                          : 'text-slate-300'
                    }`}>
                      Go-Live {format(parseISO(organization.go_live_date), 'MMM d, yyyy')}
                      {organization.onboarding_stage !== 'live' && isBefore(parseISO(organization.go_live_date), startOfDay(new Date())) && ' (overdue)'}
                    </span>
                  </div>
                )}
                {organization.activated_at && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-slate-300">Activated {format(new Date(organization.activated_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-300">Type: {businessTypeLabels[organization.business_type || 'salon']}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-300">Source: <span className="capitalize">{organization.source_software || 'Not specified'}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-300">Plan: <span className="capitalize">{organization.subscription_tier || 'Standard'}</span></span>
                </div>
                
                {/* Contract Term Information - Always visible for quick view */}
                <div className="flex items-center gap-3">
                  <CalendarRange className="h-4 w-4 text-violet-400" />
                  <span className="text-slate-300">
                    Term Start: {billing?.contract_start_date 
                      ? format(parseISO(billing.contract_start_date), 'MMM d, yyyy') 
                      : <span className="text-slate-500 italic">Not set</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarCheck className="h-4 w-4 text-violet-400" />
                  <span className="text-slate-300">
                    Term End: {billing?.contract_end_date 
                      ? format(parseISO(billing.contract_end_date), 'MMM d, yyyy') 
                      : <span className="text-slate-500 italic">Not set</span>}
                  </span>
                </div>
                {billing?.auto_renewal === true ? (
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400">Auto-Renews</span>
                  </div>
                ) : billing?.auto_renewal === false ? (
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <div>
                      <span className="text-red-400">Closing at Term End</span>
                      {billing.non_renewal_reason && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Reason: {billing.non_renewal_reason}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-300">
                      Renewal: <span className="text-slate-500 italic">Not set</span>
                    </span>
                  </div>
                )}
              </PlatformCardContent>
            </PlatformCard>
          </div>


          {/* Business Integrations Card */}
          <AccountIntegrationsCard organizationId={organization.id} />

          {/* Apps in Use Card */}
          <AccountAppsCard organizationId={organization.id} organizationName={organization.name} />
        </TabsContent>

        <Suspense fallback={<DashboardLoader size="lg" className="h-64" />}>
          <TabsContent value="locations">
            <LocationSeatsTab organizationId={organization.id} />
          </TabsContent>

          <TabsContent value="users">
            <AccountUsersTab organizationId={organization.id} organizationName={organization.name} />
          </TabsContent>

          <TabsContent value="migration" className="space-y-4">
            <MigrationCredentialsCard organizationId={organization.id} organization={organization} />
            <AccountImportHistoryTab organizationId={organization.id} />
          </TabsContent>

          <TabsContent value="billing">
            <BillingConfigurationPanel
              organizationId={organization.id}
              billingStatus={(organization as any).billing_status as BillingStatus || 'draft'}
              locationCount={organization.locationCount}
            />
          </TabsContent>

          <TabsContent value="notes">
            <AccountNotesSection
              organizationId={organization.id}
              organizationName={organization.name}
            />
          </TabsContent>

          <TabsContent value="settings">
            <AccountSettingsTab organizationId={organization.id} />
          </TabsContent>
        </Suspense>
      </Tabs>

      <EditOrganizationDialog
        organization={organization}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </PlatformPageContainer>
  );
}

// Location Seats Tab Component
function LocationSeatsTab({ organizationId }: { organizationId: string }) {
  const navigate = useNavigate();
  const { data: billing } = useOrganizationBilling(organizationId);
  const { data: usage } = useOrganizationUsage(organizationId);
  const { data: plans } = useSubscriptionPlans();
  const { data: locations = [], isLoading: locationsLoading } = useLocations(organizationId);

  const plan = plans?.find(p => p.id === billing?.plan_id) ?? null;
  const capacity = calculateCapacity(
    billing ?? null,
    plan,
    usage ?? { locationCount: 0, userCount: 0 }
  );

  const baseSeats = capacity.locations.isUnlimited ? -1 : (capacity.locations.base);
  const purchasedSeats = capacity.locations.purchased;
  const totalSeats = capacity.locations.isUnlimited ? -1 : capacity.locations.total;
  const usedSeats = capacity.locations.used;
  const utilization = capacity.locations.utilization;

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader className="flex flex-row items-center justify-between">
        <PlatformCardTitle>Location Seats</PlatformCardTitle>
        <PlatformButton 
          variant="secondary" 
          size="sm"
          onClick={() => navigate(`/platform/accounts/${organizationId}?tab=billing`)}

        >
          <CreditCard className="h-4 w-4 mr-2" />
          Adjust Seats in Billing
        </PlatformButton>
      </PlatformCardHeader>
      <PlatformCardContent className="space-y-6">
        {/* Seat Allocation Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Allocated Seats</p>
            <p className="text-2xl font-medium text-white">
              {capacity.locations.isUnlimited ? '∞' : totalSeats}
            </p>
            {!capacity.locations.isUnlimited && (
              <p className="text-xs text-slate-400 mt-1">
                {baseSeats} base + {purchasedSeats} purchased
              </p>
            )}
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Filled Seats</p>
            <p className="text-2xl font-medium text-white">
              {usedSeats} {!capacity.locations.isUnlimited && <span className="text-lg text-slate-400">of {totalSeats}</span>}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Available</p>
            <p className={cn("text-2xl font-medium", capacity.locations.isUnlimited ? 'text-emerald-400' : getUtilizationColor(utilization))}>
              {capacity.locations.isUnlimited ? '∞' : capacity.locations.remaining}
            </p>
          </div>
        </div>

        {/* Utilization Bar */}
        {!capacity.locations.isUnlimited && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Seat Utilization</span>
              <span className={getUtilizationColor(utilization)}>
                {Math.round(utilization * 100)}%
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all rounded-full", getUtilizationBgColor(utilization))}
                style={{ width: `${Math.min(utilization * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Locations List */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">Filled Locations</h4>
          {locationsLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-12 w-full bg-slate-800" />
              ))}
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
              <MapPin className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-slate-500">No locations created yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Business admins can add locations in their Settings
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {locations.map(location => (
                <div 
                  key={location.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{location.name}</p>
                      <p className="text-xs text-slate-500">
                        {location.address}, {location.city}
                      </p>
                    </div>
                  </div>
                  <PlatformBadge variant={location.is_active ? 'success' : 'default'}>
                    {location.is_active ? 'Active' : 'Inactive'}
                  </PlatformBadge>
                </div>
              ))}
            </div>
          )}
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}

function AccountDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 bg-slate-800" />
        <Skeleton className="h-16 w-16 rounded-[16px] bg-slate-800" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-slate-800" />
          <Skeleton className="h-4 w-24 bg-slate-800" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <PlatformCard key={i}>
            <PlatformCardContent className="pt-6">
              <Skeleton className="h-12 w-full bg-slate-700" />
            </PlatformCardContent>
          </PlatformCard>
        ))}
      </div>
    </div>
  );
}
