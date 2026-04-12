import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  Plus, 
  Search, 
  ExternalLink,
  MoreHorizontal,
  Upload,
  MapPin,
  Pencil,
  LayoutDashboard
} from 'lucide-react';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { logPlatformAction } from '@/hooks/useOrganizations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrganizationsWithStats, type OrganizationListItem } from '@/hooks/useOrganizations';
import { CreateOrganizationDialog } from '@/components/platform/CreateOrganizationDialog';
import { EditOrganizationDialog } from '@/components/platform/EditOrganizationDialog';
import { formatDistanceToNow, format, parseISO, isBefore, differenceInDays, startOfDay } from 'date-fns';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { StripeStatusIndicator } from '@/components/platform/ui/StripeStatusIndicator';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';



const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  pending: 'warning',
  active: 'success',
  suspended: 'error',
  churned: 'default',
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

const planLabels: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export default function PlatformAccounts() {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const { setSelectedOrganization } = useOrganizationContext();
  const { data: organizations, isLoading } = useOrganizationsWithStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<OrganizationListItem | null>(null);

  // Extract unique countries and states from the data
  const { countries, statesByCountry } = useMemo(() => {
    const countrySet = new Set<string>();
    const stateMap = new Map<string, Set<string>>();
    
    organizations?.forEach(org => {
      const country = org.primaryLocation?.country || 'US';
      const state = org.primaryLocation?.state_province;
      
      countrySet.add(country);
      if (state) {
        if (!stateMap.has(country)) stateMap.set(country, new Set());
        stateMap.get(country)!.add(state);
      }
    });
    
    return {
      countries: Array.from(countrySet).sort(),
      statesByCountry: stateMap,
    };
  }, [organizations]);

  // Get states for selected country
  const availableStates = useMemo(() => {
    if (countryFilter === 'all') {
      const allStates = new Set<string>();
      statesByCountry.forEach(states => states.forEach(s => allStates.add(s)));
      return Array.from(allStates).sort();
    }
    return Array.from(statesByCountry.get(countryFilter) || []).sort();
  }, [countryFilter, statesByCountry]);

  // Reset state filter when country changes
  useEffect(() => {
    setStateFilter('all');
  }, [countryFilter]);

  const filteredOrganizations = organizations?.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    
    // Active filter: active = status is active, inactive = pending/suspended, archived = churned
    const matchesActive = activeFilter === 'all' || 
      (activeFilter === 'active' && org.status === 'active') ||
      (activeFilter === 'inactive' && (org.status === 'pending' || org.status === 'suspended')) ||
      (activeFilter === 'archived' && org.status === 'churned');
    
    const matchesCountry = countryFilter === 'all' || 
      (org.primaryLocation?.country || 'US') === countryFilter;
    const matchesState = stateFilter === 'all' || 
      org.primaryLocation?.state_province === stateFilter;
    const matchesPlan = planFilter === 'all' || org.subscription_tier === planFilter;
    const matchesBusinessType = businessTypeFilter === 'all' || 
      org.business_type === businessTypeFilter;
    
    return matchesSearch && matchesStatus && matchesActive && matchesCountry && 
           matchesState && matchesPlan && matchesBusinessType;
  });

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Accounts"
        description="Manage all organizations on the platform"
        actions={
          <PlatformButton onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Account
          </PlatformButton>
        }
      />

      {/* Filters */}
      <PlatformCard variant="glass">
        <PlatformCardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search + Status */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <PlatformInput
                  placeholder="Search by name or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                  autoCapitalize="none"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-300 focus:bg-slate-700 focus:text-white">All Statuses</SelectItem>
                  <SelectItem value="pending" className="text-slate-300 focus:bg-slate-700 focus:text-white">Pending</SelectItem>
                  <SelectItem value="active" className="text-slate-300 focus:bg-slate-700 focus:text-white">Active</SelectItem>
                  <SelectItem value="suspended" className="text-slate-300 focus:bg-slate-700 focus:text-white">Suspended</SelectItem>
                  <SelectItem value="churned" className="text-slate-300 focus:bg-slate-700 focus:text-white">Churned</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Active/Inactive/Archived Filter */}
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="w-[160px] bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                  <SelectValue placeholder="Account State" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-300 focus:bg-slate-700 focus:text-white">All Accounts</SelectItem>
                  <SelectItem value="active" className="text-slate-300 focus:bg-slate-700 focus:text-white">Active</SelectItem>
                  <SelectItem value="inactive" className="text-slate-300 focus:bg-slate-700 focus:text-white">Inactive</SelectItem>
                  <SelectItem value="archived" className="text-slate-300 focus:bg-slate-700 focus:text-white">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Row 2: Geography + Type filters */}
            <div className="flex flex-wrap gap-4">
              {/* Country Filter */}
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[160px] bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-300 focus:bg-slate-700 focus:text-white">All Countries</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country} value={country} className="text-slate-300 focus:bg-slate-700 focus:text-white">{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* State/Province Filter */}
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-[160px] bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-300 focus:bg-slate-700 focus:text-white">All States</SelectItem>
                  {availableStates.map(state => (
                    <SelectItem key={state} value={state} className="text-slate-300 focus:bg-slate-700 focus:text-white">{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Account Type (Plan) Filter */}
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[160px] bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-300 focus:bg-slate-700 focus:text-white">All Plans</SelectItem>
                  <SelectItem value="starter" className="text-slate-300 focus:bg-slate-700 focus:text-white">Starter</SelectItem>
                  <SelectItem value="standard" className="text-slate-300 focus:bg-slate-700 focus:text-white">Standard</SelectItem>
                  <SelectItem value="professional" className="text-slate-300 focus:bg-slate-700 focus:text-white">Professional</SelectItem>
                  <SelectItem value="enterprise" className="text-slate-300 focus:bg-slate-700 focus:text-white">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Business Type Filter */}
              <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
                <SelectTrigger className="w-[160px] bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                  <SelectValue placeholder="Business Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-300 focus:bg-slate-700 focus:text-white">All Types</SelectItem>
                  <SelectItem value="salon" className="text-slate-300 focus:bg-slate-700 focus:text-white">Salon</SelectItem>
                  <SelectItem value="spa" className="text-slate-300 focus:bg-slate-700 focus:text-white">Spa</SelectItem>
                  <SelectItem value="esthetics" className="text-slate-300 focus:bg-slate-700 focus:text-white">Esthetics</SelectItem>
                  <SelectItem value="barbershop" className="text-slate-300 focus:bg-slate-700 focus:text-white">Barbershop</SelectItem>
                  <SelectItem value="med_spa" className="text-slate-300 focus:bg-slate-700 focus:text-white">Med Spa</SelectItem>
                  <SelectItem value="wellness" className="text-slate-300 focus:bg-slate-700 focus:text-white">Wellness</SelectItem>
                  <SelectItem value="other" className="text-slate-300 focus:bg-slate-700 focus:text-white">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Accounts Table */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-400" />
            Organizations ({filteredOrganizations?.length || 0})
          </PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent>
          {isLoading ? (
            <AccountsTableSkeleton />
          ) : filteredOrganizations && filteredOrganizations.length > 0 ? (
            <div className="rounded-xl overflow-hidden border border-slate-700/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-400">Account</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Location</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Go-Live</TableHead>
                    <TableHead className="text-slate-400">Plan</TableHead>
                    <TableHead className="text-slate-400">Locations</TableHead>
                    <TableHead className="text-slate-400">Payments</TableHead>
                    <TableHead className="text-right text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.map((org) => (
                    <TableRow 
                      key={org.id}
                      className="cursor-pointer border-slate-700/50 hover:bg-slate-800/50 transition-colors"
                      onClick={() => navigate(`/platform/accounts/${org.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                            {org.logo_url ? (
                              <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded-lg object-cover" />
                            ) : (
                              <Building2 className="h-5 w-5 text-violet-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">{org.name}</p>
                              {org.is_internal && (
                                <PlatformBadge variant="glow" size="sm">Internal</PlatformBadge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">#{org.account_number}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-300">
                          {businessTypeLabels[org.business_type || 'salon']}
                        </span>
                      </TableCell>
                      <TableCell>
                        {org.primaryLocation ? (
                          <span className="text-sm text-slate-300">
                            {org.primaryLocation.state_province && `${org.primaryLocation.state_province}, `}
                            {org.primaryLocation.country || 'US'}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <PlatformBadge variant={statusColors[org.status || 'pending']}>
                          {org.status}
                        </PlatformBadge>
                      </TableCell>
                      <TableCell>
                        {org.go_live_date ? (
                          (() => {
                            const goLiveDate = parseISO(org.go_live_date);
                            const today = startOfDay(new Date());
                            const daysUntil = differenceInDays(goLiveDate, today);
                            const isPast = isBefore(goLiveDate, today);
                            const isLive = org.onboarding_stage === 'live';
                            
                            let variant: 'success' | 'warning' | 'error' | 'default' = 'default';
                            if (isLive && isPast) {
                              variant = 'success';
                            } else if (isPast && !isLive) {
                              variant = 'error';
                            } else if (daysUntil <= 7) {
                              variant = 'warning';
                            }
                            
                            return (
                              <PlatformBadge variant={variant} size="sm">
                                {format(goLiveDate, 'MMM d')}
                                {isPast && !isLive && ' 🚨'}
                              </PlatformBadge>
                            );
                          })()
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-300">
                          {planLabels[org.subscription_tier || 'standard'] || org.subscription_tier || 'Standard'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-sm text-slate-300">{org.locationCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StripeStatusIndicator
                          activeCount={org.stripeLocationsActive}
                          totalCount={org.locationCount}
                          hasIssues={org.hasStripeIssues}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {formatDistanceToNow(new Date(org.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <PlatformButton variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </PlatformButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem 
                              className="text-slate-300 focus:bg-slate-700 focus:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/platform/accounts/${org.id}`);
                              }}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-slate-300 focus:bg-slate-700 focus:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditOrg(org);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Account
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-slate-300 focus:bg-slate-700 focus:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/platform/import?org=${org.id}`);
                              }}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Start Import
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem 
                              className="text-slate-300 focus:bg-slate-700 focus:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrganization(org);
                                logPlatformAction(org.id, 'dashboard_accessed', 'organization', org.id, {
                                  organization_name: org.name,
                                  action: 'view_dashboard',
                                });
                                navigate(dashPath('/'));
                              }}
                            >
                              <LayoutDashboard className="h-4 w-4 mr-2" />
                              View Dashboard
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-[16px] bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">No organizations found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first account to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <PlatformButton onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Account
                </PlatformButton>
              )}
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>

      <CreateOrganizationDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />

      {editOrg && (
        <EditOrganizationDialog
          organization={editOrg}
          open={!!editOrg}
          onOpenChange={(open) => !open && setEditOrg(null)}
        />
      )}
    </PlatformPageContainer>
  );
}

function AccountsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30">
          <Skeleton className="h-10 w-10 rounded-xl bg-slate-700" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 bg-slate-700" />
            <Skeleton className="h-3 w-24 bg-slate-700" />
          </div>
          <Skeleton className="h-6 w-16 bg-slate-700" />
          <Skeleton className="h-4 w-20 bg-slate-700" />
          <Skeleton className="h-4 w-24 bg-slate-700" />
        </div>
      ))}
    </div>
  );
}
