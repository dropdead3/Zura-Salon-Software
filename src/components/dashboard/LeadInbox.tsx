import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Inbox,
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  MapPin,
} from 'lucide-react';
import { useLeadInbox, useLeadCounts, LeadFilters } from '@/hooks/useLeadInbox';
import { InquirySource, InquiryStatus } from '@/hooks/useLeadAnalytics';
import { useActiveLocations } from '@/hooks/useLocations';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useAdminProfile';
import { LeadInboxRow } from './leads/LeadInboxRow';
import { LeadAssignmentDialog } from './leads/LeadAssignmentDialog';
import { LeadDetailsSheet } from './leads/LeadDetailsSheet';
import { LeadWithAssignee } from '@/hooks/useLeadInbox';
import { cn } from '@/lib/utils';

type TabValue = 'all' | 'unassigned' | 'my_leads' | 'consultation' | 'converted';

export function LeadInbox() {
  const { user } = useAuth();
  const { data: roles = [] } = useUserRoles(user?.id || '');
  const { data: locations = [] } = useActiveLocations();
  
  const isManager = roles.some(r => ['admin', 'manager', 'super_admin'].includes(r));
  const isStylist = roles.some(r => ['stylist', 'stylist_assistant'].includes(r));

  // State
  const [activeTab, setActiveTab] = useState<TabValue>('unassigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<InquirySource | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<LeadWithAssignee | null>(null);
  const [assignDialogLead, setAssignDialogLead] = useState<LeadWithAssignee | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);

  // Build filters based on active tab
  const filters: LeadFilters = useMemo(() => {
    const base: LeadFilters = {
      search: searchQuery,
      source: sourceFilter,
      location: locationFilter,
    };

    switch (activeTab) {
      case 'unassigned':
        return { ...base, assignedTo: 'unassigned', status: 'new' };
      case 'my_leads':
        return { ...base, assignedTo: user?.id || 'none' };
      case 'consultation':
        return { ...base, status: 'consultation_booked' };
      case 'converted':
        return { ...base, status: 'converted' };
      default:
        return base;
    }
  }, [activeTab, searchQuery, sourceFilter, locationFilter, user?.id]);

  // Fetch data
  const {
    leads,
    stylists,
    locations: locationsMap,
    isLoading,
    assignLead,
    claimLead,
    updateLeadStatus,
    addNote,
    isAssigning,
    isClaiming,
    isUpdating,
    useLeadActivity,
    refetch,
  } = useLeadInbox(filters);

  const { data: counts } = useLeadCounts();
  
  // Get activity for selected lead
  const { data: leadActivity = [], isLoading: isLoadingActivity } = useLeadActivity(selectedLead?.id || '');

  // Handlers
  const handleAssign = async (leadId: string, stylistId: string) => {
    if (!user?.id) return;
    await assignLead({ leadId, assignToUserId: stylistId, assignedByUserId: user.id });
  };

  const handleClaim = async (lead: LeadWithAssignee) => {
    if (!user?.id) return;
    await claimLead({ leadId: lead.id, userId: user.id });
  };

  const handleUpdateStatus = async (status: InquiryStatus, additionalData?: any) => {
    if (!selectedLead || !user?.id) return;
    await updateLeadStatus({ 
      leadId: selectedLead.id, 
      status, 
      userId: user.id,
      additionalData 
    });
    // Refresh selected lead data
    refetch();
  };

  const handleAddNote = async (note: string) => {
    if (!selectedLead || !user?.id) return;
    await addNote({ leadId: selectedLead.id, note, userId: user.id });
  };

  const openLeadDetails = (lead: LeadWithAssignee) => {
    setSelectedLead(lead);
    setDetailsSheetOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5" />
              Lead Inbox
              {counts?.unassigned ? (
                <Badge variant="secondary" className="ml-2">
                  {counts.unassigned} new
                </Badge>
              ) : null}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => refetch()}
                className="flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website_form">Website Form</SelectItem>
                <SelectItem value="google_business">Google Business</SelectItem>
                <SelectItem value="facebook_lead">Facebook</SelectItem>
                <SelectItem value="instagram_lead">Instagram</SelectItem>
                <SelectItem value="phone_call">Phone Call</SelectItem>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={(v) => setLocationFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="unassigned" className="gap-1">
                <UserPlus className="w-4 h-4" />
                Unassigned
                {counts?.unassigned ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {counts.unassigned}
                  </Badge>
                ) : null}
              </TabsTrigger>
              
              {isStylist && (
                <TabsTrigger value="my_leads" className="gap-1">
                  <Users className="w-4 h-4" />
                  My Leads
                </TabsTrigger>
              )}
              
              <TabsTrigger value="consultation" className="gap-1">
                <CheckCircle className="w-4 h-4" />
                Consultations
                {counts?.consultationBooked ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {counts.consultationBooked}
                  </Badge>
                ) : null}
              </TabsTrigger>
              
              <TabsTrigger value="converted" className="gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Converted
              </TabsTrigger>
              
              <TabsTrigger value="all">All Leads</TabsTrigger>
            </TabsList>

            {/* Content */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No leads found</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {activeTab === 'unassigned' 
                    ? 'All leads have been assigned'
                    : activeTab === 'my_leads'
                      ? 'You have no leads assigned to you'
                      : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map(lead => (
                  <LeadInboxRow
                    key={lead.id}
                    lead={lead}
                    onAssign={() => setAssignDialogLead(lead)}
                    onClaim={() => handleClaim(lead)}
                    onClick={() => openLeadDetails(lead)}
                    canClaim={isStylist && !lead.assigned_to}
                    canAssign={isManager && !lead.assigned_to}
                    isClaiming={isClaiming}
                  />
                ))}
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <LeadAssignmentDialog
        open={!!assignDialogLead}
        onOpenChange={(open) => !open && setAssignDialogLead(null)}
        lead={assignDialogLead}
        stylists={stylists}
        locations={locationsMap}
        onAssign={handleAssign}
        isAssigning={isAssigning}
      />

      {/* Details Sheet */}
      <LeadDetailsSheet
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        lead={selectedLead}
        activity={leadActivity}
        isLoadingActivity={isLoadingActivity}
        onUpdateStatus={handleUpdateStatus}
        onAddNote={handleAddNote}
        isUpdating={isUpdating}
      />
    </>
  );
}
