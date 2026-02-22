import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  Star, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  ArrowUpDown,
  Loader2,
  UserCheck,
  Clock,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Lock,
  User,
  Ban,
  Archive,
  GitMerge
} from 'lucide-react';
import { BannedClientBadge } from '@/components/dashboard/clients/BannedClientBadge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';
import { LEAD_SOURCES, getLeadSourceLabel, getLeadSourceColor } from '@/lib/leadSources';
import { Megaphone } from 'lucide-react';
import { usePreferredStylistsBatch, getStylistDisplayName } from '@/hooks/usePreferredStylist';
import { PhorestSyncButton } from '@/components/dashboard/PhorestSyncButton';
import { useLocations } from '@/hooks/useLocations';
import { ClientDetailSheet } from '@/components/dashboard/ClientDetailSheet';
import { ClientHealthSummaryCard } from '@/components/dashboard/client-health/ClientHealthSummaryCard';
import { BentoGrid } from '@/components/ui/bento-grid';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const PAGE_SIZE = 50;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type SortField = 'total_spend' | 'visit_count' | 'last_visit' | 'name';
type SortDirection = 'asc' | 'desc';
type PrimaryTab = 'all' | 'my';

export default function ClientDirectory() {
  const navigate = useNavigate();
  const { formatDate } = useFormatDate();
  const { user, roles } = useAuth();
  const { formatCurrencyWhole } = useFormatCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('total_spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedStylist, setSelectedStylist] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [showMerged, setShowMerged] = useState(false);

  const canMerge = roles.some(role => ['admin', 'manager', 'super_admin'].includes(role));

  const toggleMergeSelection = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForMerge(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const handleBulkMerge = () => {
    const ids = Array.from(selectedForMerge).join(',');
    navigate(`/dashboard/admin/merge-clients?clientIds=${ids}`);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, selectedLocation, selectedStylist, selectedSource, selectedLetter, sortField, sortDirection]);

  // Determine if user can see all clients (leadership + front desk)
  const canViewAllClients = roles.some(role => 
    ['admin', 'manager', 'super_admin', 'receptionist'].includes(role)
  );

  // Primary tab state - default to 'all' for privileged users, 'my' for others
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>(canViewAllClients ? 'all' : 'my');

  // Fetch locations for the filter dropdown
  const { data: locations } = useLocations();

  // Fetch stylists for the stylist filter dropdown (only if can view all clients)
  const { data: stylists } = useQuery({
    queryKey: ['employee-profiles-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: canViewAllClients,
  });

  // Fetch clients based on primary tab and filters
  const { data: clients, isLoading } = useQuery({
    queryKey: ['client-directory', user?.id, primaryTab, selectedStylist, canViewAllClients],
    queryFn: async () => {
      let query = supabase
        .from('phorest_clients')
        .select('*')
        .eq('is_duplicate', false)
        .order('total_spend', { ascending: false });

      // Filter logic based on primary tab
      if (primaryTab === 'my' || !canViewAllClients) {
        // My Clients: only show user's clients
        query = query.eq('preferred_stylist_id', user?.id);
      } else if (selectedStylist !== 'all') {
        // All Clients with stylist filter
        query = query.eq('preferred_stylist_id', selectedStylist);
      }
      // If All Clients with no filter, no preferred_stylist_id constraint

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Process clients with derived fields
  const processedClients = useMemo(() => {
    if (!clients) return [];
    
    const today = new Date();
    
    return clients.map(client => {
      const daysSinceVisit = client.last_visit 
        ? differenceInDays(today, new Date(client.last_visit))
        : null;
      
      // At-risk: 2+ visits but no visit in 60+ days
      const isAtRisk = (client.visit_count >= 2) && daysSinceVisit !== null && daysSinceVisit >= 60;
      
      // New client: only 1 visit
      const isNew = client.visit_count === 1;
      
      return {
        ...client,
        daysSinceVisit,
        isAtRisk,
        isNew,
        is_archived: (client as any).is_archived ?? false,
      };
    });
  }, [clients]);

  // Get unique locations from client data for the filter
  const clientLocations = useMemo(() => {
    if (!processedClients) return [];
    
    const locationMap = new Map<string, { id: string; name: string }>();
    
    processedClients.forEach(client => {
      if (client.location_id) {
        const loc = locations?.find(l => l.id === client.location_id);
        locationMap.set(client.location_id, {
          id: client.location_id,
          name: loc?.name || client.branch_name || client.location_id
        });
      } else if (client.branch_name) {
        // Fallback to branch_name if no location_id
        locationMap.set(client.branch_name, {
          id: client.branch_name,
          name: client.branch_name
        });
      }
    });
    
    return Array.from(locationMap.values());
  }, [processedClients, locations]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let filtered = processedClients;

    // Location filter
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(c => 
        c.location_id === selectedLocation || c.branch_name === selectedLocation
      );
    }

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(c => c.lead_source === selectedSource);
    }

    // Filter out merged clients unless toggled on
    if (!showMerged) {
      filtered = filtered.filter(c => !(c as any).status || (c as any).status !== 'merged');
    }

    // Tab filter (VIP, At Risk, New, Banned, Archived, Merged)
    if (activeTab === 'archived') {
      filtered = filtered.filter(c => c.is_archived);
    } else if (activeTab === 'merged') {
      filtered = filtered.filter(c => (c as any).status === 'merged');
    } else {
      // All other tabs: exclude archived clients
      filtered = filtered.filter(c => !c.is_archived);
      
      if (activeTab === 'vip') {
        filtered = filtered.filter(c => c.is_vip);
      } else if (activeTab === 'at-risk') {
        filtered = filtered.filter(c => c.isAtRisk);
      } else if (activeTab === 'new') {
        filtered = filtered.filter(c => c.isNew);
      } else if (activeTab === 'banned') {
        filtered = filtered.filter(c => c.is_banned);
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
    }

    // Alphabetical filter
    if (selectedLetter !== 'all') {
      filtered = filtered.filter(c =>
        c.name.toUpperCase().startsWith(selectedLetter)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'total_spend':
          comparison = Number(a.total_spend || 0) - Number(b.total_spend || 0);
          break;
        case 'visit_count':
          comparison = (a.visit_count || 0) - (b.visit_count || 0);
          break;
        case 'last_visit':
          const aTime = a.last_visit ? new Date(a.last_visit).getTime() : 0;
          const bTime = b.last_visit ? new Date(b.last_visit).getTime() : 0;
          comparison = aTime - bTime;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [processedClients, selectedLocation, selectedSource, activeTab, searchQuery, selectedLetter, sortField, sortDirection]);

  // Paginated clients
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, currentPage]);

  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);

  // Batch-resolve preferred stylist names for visible clients
  const stylistIdsForPage = useMemo(() => 
    paginatedClients.map(c => c.preferred_stylist_id).filter(Boolean) as string[],
    [paginatedClients]
  );
  const { data: stylistMap } = usePreferredStylistsBatch(stylistIdsForPage);

  // Count clients per letter (for disabling empty letters)
  const letterCounts = useMemo(() => {
    // Use the filtered list BEFORE alphabetical filter to count available letters
    let baseFiltered = processedClients;

    if (selectedLocation !== 'all') {
      baseFiltered = baseFiltered.filter(c => c.location_id === selectedLocation || c.branch_name === selectedLocation);
    }
    if (selectedSource !== 'all') {
      baseFiltered = baseFiltered.filter(c => c.lead_source === selectedSource);
    }
    if (activeTab === 'archived') {
      baseFiltered = baseFiltered.filter(c => c.is_archived);
    } else {
      baseFiltered = baseFiltered.filter(c => !c.is_archived);
      if (activeTab === 'vip') baseFiltered = baseFiltered.filter(c => c.is_vip);
      else if (activeTab === 'at-risk') baseFiltered = baseFiltered.filter(c => c.isAtRisk);
      else if (activeTab === 'new') baseFiltered = baseFiltered.filter(c => c.isNew);
      else if (activeTab === 'banned') baseFiltered = baseFiltered.filter(c => c.is_banned);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      baseFiltered = baseFiltered.filter(c => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q));
    }

    const counts: Record<string, number> = {};
    ALPHABET.forEach(l => { counts[l] = 0; });
    baseFiltered.forEach(c => {
      const first = c.name.charAt(0).toUpperCase();
      if (counts[first] !== undefined) counts[first]++;
    });
    return counts;
  }, [processedClients, selectedLocation, selectedSource, activeTab, searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  // Stats (filtered by location and stylist if selected)
  const stats = useMemo(() => {
    let clientsForStats = processedClients;
    
    if (selectedLocation !== 'all') {
      clientsForStats = clientsForStats.filter(c => c.location_id === selectedLocation || c.branch_name === selectedLocation);
    }
    
    // Exclude archived from main stats
    const active = clientsForStats.filter(c => !c.is_archived);
    
    return {
      total: active.length,
      vip: active.filter(c => c.is_vip).length,
      banned: active.filter(c => c.is_banned).length,
      atRisk: active.filter(c => c.isAtRisk).length,
      newClients: active.filter(c => c.isNew).length,
      totalRevenue: active.reduce((s, c) => s + Number(c.total_spend || 0), 0),
      archived: clientsForStats.filter(c => c.is_archived).length,
      topSource: (() => {
        const sourceCounts: Record<string, number> = {};
        active.forEach(c => {
          if (c.lead_source) {
            sourceCounts[c.lead_source] = (sourceCounts[c.lead_source] || 0) + 1;
          }
        });
        const entries = Object.entries(sourceCounts);
        if (entries.length === 0) return null;
        entries.sort((a, b) => b[1] - a[1]);
        return { source: entries[0][0], count: entries[0][1] };
      })(),
    };
  }, [processedClients, selectedLocation]);

  const showingStart = filteredClients.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(currentPage * PAGE_SIZE, filteredClients.length);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl mb-2">CLIENT DIRECTORY</h1>
            <p className="text-muted-foreground font-sans">
              {primaryTab === 'all' 
                ? 'View and manage all salon clients.' 
                : 'Track your client relationships and identify opportunities.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canMerge && selectedForMerge.size >= 2 && (
              <Button onClick={handleBulkMerge} className="gap-2">
                <GitMerge className="w-4 h-4" />
                Merge Selected ({selectedForMerge.size})
              </Button>
            )}
            <PhorestSyncButton syncType="clients" />
          </div>
        </div>

        {/* Primary Tabs */}
        <div className="mb-6">
          <Tabs value={primaryTab} onValueChange={(v) => setPrimaryTab(v as PrimaryTab)}>
            <TabsList>
              <TabsTrigger 
                value="all" 
                disabled={!canViewAllClients}
                className="gap-2"
              >
                {!canViewAllClients && <Lock className="w-3 h-3" />}
                All Clients
              </TabsTrigger>
              <TabsTrigger value="my">My Clients</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Client Health Summary Widget */}
        {canViewAllClients && (
          <div className="mb-6">
            <ClientHealthSummaryCard />
          </div>
        )}

        {/* Stats Cards */}
        <BentoGrid maxPerRow={6} gap="gap-4" className="mb-6">
          <Card className="p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="font-display text-2xl">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Clients</p>
          </Card>
          <Card className="p-4 text-center bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
            <Star className="w-5 h-5 text-amber-600 mx-auto mb-2" />
            <p className="font-display text-2xl text-amber-700 dark:text-amber-400">{stats.vip}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">VIP Clients</p>
          </Card>
          <Card className="p-4 text-center bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-2" />
            <p className="font-display text-2xl text-red-700 dark:text-red-400">{stats.atRisk}</p>
            <p className="text-xs text-red-600 dark:text-red-500">At Risk</p>
          </Card>
          <Card className="p-4 text-center bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
            <UserCheck className="w-5 h-5 text-green-600 mx-auto mb-2" />
            <p className="font-display text-2xl text-green-700 dark:text-green-400">{stats.newClients}</p>
            <p className="text-xs text-green-600 dark:text-green-500">New Clients</p>
          </Card>
          <Card className="p-4 text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="font-display text-2xl">{formatCurrencyWhole(stats.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </Card>
          <Card className="p-4 text-center">
            <Megaphone className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="font-display text-lg truncate">
              {stats.topSource ? getLeadSourceLabel(stats.topSource.source) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.topSource ? `Top Source (${stats.topSource.count})` : 'Top Source'}
            </p>
          </Card>
        </BentoGrid>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Location Filter */}
          {clientLocations.length > 0 && (
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full md:w-[200px]">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {clientLocations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Stylist Filter - Only visible in All Clients tab */}
          {primaryTab === 'all' && canViewAllClients && stylists && stylists.length > 0 && (
            <Select value={selectedStylist} onValueChange={setSelectedStylist}>
              <SelectTrigger className="w-full md:w-[200px]">
                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Stylists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stylists</SelectItem>
                {stylists.map(stylist => (
                  <SelectItem key={stylist.user_id} value={stylist.user_id}>
                    {stylist.display_name || stylist.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Source Filter */}
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Megaphone className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {LEAD_SOURCES.map(source => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="vip" className="text-xs">
                <Star className="w-3 h-3 mr-1" /> VIP
              </TabsTrigger>
              <TabsTrigger value="at-risk" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" /> At Risk
              </TabsTrigger>
              <TabsTrigger value="new" className="text-xs">New</TabsTrigger>
              {stats.banned > 0 && (
                <TabsTrigger value="banned" className="text-xs text-red-600">
                  <Ban className="w-3 h-3 mr-1" /> Banned ({stats.banned})
                </TabsTrigger>
              )}
              {stats.archived > 0 && (
                <TabsTrigger value="archived" className="text-xs text-muted-foreground">
                  <Archive className="w-3 h-3 mr-1" /> Archived ({stats.archived})
                </TabsTrigger>
              )}
              {showMerged && (
                <TabsTrigger value="merged" className="text-xs text-muted-foreground">
                  <GitMerge className="w-3 h-3 mr-1" /> Merged
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          {/* Show Merged Toggle */}
          {canMerge && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer ml-2">
              <Checkbox
                checked={showMerged}
                onCheckedChange={(v) => setShowMerged(!!v)}
                className="h-3.5 w-3.5"
              />
              Show merged
            </label>
          )}
        </div>

        {/* Alphabetical Filter */}
        <div className="flex flex-wrap gap-1 mb-6">
          <Button
            variant={selectedLetter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-3 text-xs font-medium rounded-full"
            onClick={() => setSelectedLetter('all')}
          >
            All
          </Button>
          {ALPHABET.map(letter => (
            <Button
              key={letter}
              variant={selectedLetter === letter ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-8 w-8 p-0 text-xs font-medium rounded-full",
                letterCounts[letter] === 0 && "opacity-30 pointer-events-none"
              )}
              disabled={letterCounts[letter] === 0}
              onClick={() => setSelectedLetter(letter)}
            >
              {letter}
            </Button>
          ))}
        </div>

        {/* Client List */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">
                {filteredClients.length} {activeTab === 'all' ? 'Clients' : activeTab === 'vip' ? 'VIP Clients' : activeTab === 'at-risk' ? 'At-Risk Clients' : 'New Clients'}
                {selectedLocation !== 'all' && (
                  <Badge variant="outline" className="ml-2 font-sans font-normal">
                    <MapPin className="w-3 h-3 mr-1" />
                    {clientLocations.find(l => l.id === selectedLocation)?.name}
                  </Badge>
                )}
                {primaryTab === 'all' && selectedStylist !== 'all' && stylists && (
                  <Badge variant="outline" className="ml-2 font-sans font-normal">
                    <User className="w-3 h-3 mr-1" />
                    {stylists.find(s => s.user_id === selectedStylist)?.display_name || stylists.find(s => s.user_id === selectedStylist)?.full_name}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('name')}
                  className={cn("text-xs", sortField === 'name' && "bg-muted")}
                >
                  Name
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('total_spend')}
                  className={cn("text-xs", sortField === 'total_spend' && "bg-muted")}
                >
                  Spend
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('visit_count')}
                  className={cn("text-xs", sortField === 'visit_count' && "bg-muted")}
                >
                  Visits
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('last_visit')}
                  className={cn("text-xs", sortField === 'last_visit' && "bg-muted")}
                >
                  Recent
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No clients match your search.' : selectedLetter !== 'all' ? `No clients starting with "${selectedLetter}".` : 'No client data available yet. Sync with Phorest to populate.'}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {paginatedClients.map((client) => {
                    const locationName = locations?.find(l => l.id === client.location_id)?.name || client.branch_name;
                    
                    const handleClientClick = () => {
                      setSelectedClient({ ...client });
                      setDetailSheetOpen(true);
                    };

                    return (
                      <div 
                        key={client.id} 
                        className={cn(
                          "py-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 -mx-6 px-6 transition-colors",
                          client.is_archived && "opacity-60",
                          (client as any).status === 'merged' && "opacity-50"
                        )}
                        onClick={handleClientClick}
                      >
                        {/* Merge checkbox */}
                        {canMerge && (client as any).status !== 'merged' && (
                          <Checkbox
                            checked={selectedForMerge.has(client.id)}
                            onCheckedChange={() => {}}
                            onClick={(e) => toggleMergeSelection(client.id, e)}
                            className="shrink-0"
                          />
                        )}
                        <Avatar className={cn("w-12 h-12", client.is_archived && "opacity-50")}>
                          <AvatarFallback className="font-display text-sm bg-primary/10">
                            {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{client.name}</p>
                            {client.is_archived && (
                              <Badge variant="secondary" className="text-xs">
                                <Archive className="w-3 h-3 mr-1" /> Archived
                              </Badge>
                            )}
                            {client.is_banned && <BannedClientBadge />}
                            {client.is_vip && !client.is_banned && (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs">
                                <Star className="w-3 h-3 mr-1" /> VIP
                              </Badge>
                            )}
                            {client.isAtRisk && !client.is_banned && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" /> At Risk
                              </Badge>
                            )}
                            {client.isNew && !client.is_banned && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{client.visit_count} visits</span>
                            {client.last_visit && (
                              <>
                                <span>•</span>
                                <span>Last: {formatDate(new Date(client.last_visit), 'MMM d, yyyy')}</span>
                              </>
                            )}
                            {client.daysSinceVisit !== null && client.daysSinceVisit > 30 && (
                              <>
                                <span>•</span>
                                <span className={cn(
                                  client.daysSinceVisit > 60 ? "text-red-600" : "text-amber-600"
                                )}>
                                  {client.daysSinceVisit} days ago
                                </span>
                              </>
                            )}
                            {locationName && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {locationName}
                                </span>
                              </>
                            )}
                            {client.lead_source && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", getLeadSourceColor(client.lead_source))}>
                                  {getLeadSourceLabel(client.lead_source)}
                                </Badge>
                              </>
                            )}
                            {client.preferred_stylist_id && stylistMap && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {getStylistDisplayName(stylistMap.get(client.preferred_stylist_id))}
                                  {stylistMap.get(client.preferred_stylist_id) && !stylistMap.get(client.preferred_stylist_id)!.is_active && (
                                    <span className="text-muted-foreground">(inactive)</span>
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                          {/* Contact info & preferred services */}
                          <div className="flex items-center gap-3 mt-1.5">
                            {client.email && (
                              <a href={`mailto:${client.email}`} className="text-xs text-primary hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Mail className="w-3 h-3" /> {client.email}
                              </a>
                            )}
                            {client.phone && (
                              <a href={`tel:${client.phone}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Phone className="w-3 h-3" /> {client.phone}
                              </a>
                            )}
                          </div>
                          {client.preferred_services && client.preferred_services.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {client.preferred_services.slice(0, 3).map((service: string) => (
                                <Badge key={service} variant="secondary" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-display text-lg">{formatCurrencyWhole(Number(client.total_spend || 0))}</p>
                            <p className="text-xs text-muted-foreground">lifetime</p>
                          </div>
                          {/* Single merge action */}
                          {canMerge && (client as any).status !== 'merged' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/admin/merge-clients?clientIds=${client.id}`);
                              }}
                              title="Merge this client"
                            >
                              <GitMerge className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {(client as any).status === 'merged' && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              <GitMerge className="w-3 h-3 mr-1" /> Merged
                            </Badge>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      Showing {showingStart}–{showingEnd} of {filteredClients.length} clients
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                        {getPageNumbers().map((page, i) =>
                          page === 'ellipsis' ? (
                            <PaginationItem key={`ellipsis-${i}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={page}>
                              <PaginationLink
                                isActive={currentPage === page}
                                onClick={() => setCurrentPage(page as number)}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Client Detail Sheet */}
        <ClientDetailSheet
          client={selectedClient}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          locationName={locations?.find(l => l.id === selectedClient?.location_id)?.name}
        />
      </div>
    </DashboardLayout>
  );
}
