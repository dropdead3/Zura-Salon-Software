import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  usePhorestConnection,
  usePhorestSyncLogs,
  usePhorestStaffMappings,
  useTriggerPhorestSync,
  useCreateStaffMapping,
  useDeleteStaffMapping,
  PhorestStaffMember,
  PhorestBranch,
} from '@/hooks/usePhorestSync';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Link2,
  Unlink,
  Clock,
  Users,
  Calendar,
  BarChart3,
  Loader2,
  Trash2,
  Wand2,
  MapPin,
  Building2,
  DollarSign,
  Eye,
  EyeOff,
  Info,
  ChevronDown,
  Activity,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { PhorestApiHealthDashboard } from '@/components/dashboard/PhorestApiHealthDashboard';
import { PhorestWriteGateCard } from '@/components/dashboard/PhorestWriteGateCard';
import { usePOSProviderLabel } from '@/hooks/usePOSProviderLabel';

export default function PhorestSettings() {
  const { formatDate } = useFormatDate();
  const { toast } = useToast();
  const { providerLabel } = usePOSProviderLabel();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPhorestStaff, setSelectedPhorestStaff] = useState<PhorestStaffMember | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [visibleMappings, setVisibleMappings] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Mutation for toggling calendar visibility
  const toggleCalendarVisibility = useMutation({
    mutationFn: async ({ mappingId, show }: { mappingId: string; show: boolean }) => {
      const { error } = await supabase
        .from('phorest_staff_mapping')
        .update({ show_on_calendar: show })
        .eq('id', mappingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phorest-staff-mappings'] });
      toast({
        title: 'Updated',
        description: 'Calendar visibility updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update calendar visibility',
        variant: 'destructive',
      });
    },
  });

  const toggleMappingVisibility = (mappingId: string) => {
    setVisibleMappings(prev => {
      const next = new Set(prev);
      if (next.has(mappingId)) {
        next.delete(mappingId);
      } else {
        next.add(mappingId);
      }
      return next;
    });
  };

  const { data: connection, isLoading, isFetching, refetch: refetchConnection } = usePhorestConnection();
  const connectionLoading = isLoading || isFetching;
  const { data: syncLogs, isLoading: logsLoading } = usePhorestSyncLogs();
  const { data: staffMappings, isLoading: mappingsLoading } = usePhorestStaffMappings();
  
  const triggerSync = useTriggerPhorestSync();
  const createMapping = useCreateStaffMapping();
  const deleteMapping = useDeleteStaffMapping();

  // Fetch employees for mapping
  const { data: employees } = useQuery({
    queryKey: ['employees-for-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, email')
        .eq('is_approved', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Get employees - now we allow the same employee to be mapped to multiple branches
  const mappedCombos = new Set(
    staffMappings?.map((m: any) => `${m.user_id}:${m.phorest_staff_id}`) || []
  );
  
  // Get Phorest staff not yet mapped (checking staff_id + branch combo)
  const phorestStaffList = connection?.staff_list || [];
  const branchList = connection?.branch_list || [];
  
  // Filter Phorest staff that aren't already mapped
  const unmappedPhorestStaff = phorestStaffList.filter(s => {
    // Check if this specific staff-branch combo is already mapped
    return !staffMappings?.some((m: any) => 
      m.phorest_staff_id === s.id && m.phorest_branch_id === s.branchId
    );
  });
  
  // Filter by branch if selected
  const filteredPhorestStaff = branchFilter === 'all' 
    ? unmappedPhorestStaff 
    : unmappedPhorestStaff.filter(s => s.branchId === branchFilter);

  // Auto-match suggestions based on name similarity - now for each branch
  const getAutoMatchSuggestions = () => {
    const suggestions: Array<{ 
      employee: typeof employees[0]; 
      phorestStaff: PhorestStaffMember; 
      confidence: 'high' | 'medium' 
    }> = [];
    
    // All employees can be mapped (they can have multiple mappings now)
    employees?.forEach(emp => {
      const empName = (emp.display_name || emp.full_name || '').toLowerCase().trim();
      
      filteredPhorestStaff.forEach(staff => {
        const staffName = staff.name.toLowerCase().trim();
        
        // Skip if this combo is already mapped
        if (staffMappings?.some((m: any) => 
          m.user_id === emp.user_id && 
          m.phorest_staff_id === staff.id && 
          m.phorest_branch_id === staff.branchId
        )) {
          return;
        }
        
        // Exact match
        if (empName === staffName) {
          suggestions.push({ employee: emp, phorestStaff: staff, confidence: 'high' });
        } else {
          // Partial match (first name or last name)
          const empParts = empName.split(' ');
          const staffParts = staffName.split(' ');
          
          const hasFirstNameMatch = empParts[0] && staffParts[0] && empParts[0] === staffParts[0];
          const hasLastNameMatch = empParts.length > 1 && staffParts.length > 1 && 
            empParts[empParts.length - 1] === staffParts[staffParts.length - 1];
          
          if (hasFirstNameMatch && hasLastNameMatch) {
            suggestions.push({ employee: emp, phorestStaff: staff, confidence: 'high' });
          } else if (hasFirstNameMatch || hasLastNameMatch) {
            suggestions.push({ employee: emp, phorestStaff: staff, confidence: 'medium' });
          }
        }
      });
    });
    
    return suggestions;
  };

  const autoMatchSuggestions = getAutoMatchSuggestions();

  // Group staff mappings by user_id for consolidated multi-location display
  const groupedMappings = useMemo(() => {
    if (!staffMappings) return [];
    
    const grouped = staffMappings.reduce((acc: Record<string, any[]>, mapping: any) => {
      const userId = mapping.user_id;
      if (!acc[userId]) acc[userId] = [];
      acc[userId].push(mapping);
      return acc;
    }, {});
    
    return Object.values(grouped) as any[][];
  }, [staffMappings]);

  const handleCreateMapping = async () => {
    if (!selectedUserId || !selectedPhorestStaff) {
      toast({
        title: 'Missing fields',
        description: `Please select both a team member and a ${providerLabel} staff member.`,
        variant: 'destructive',
      });
      return;
    }

    await createMapping.mutateAsync({
      user_id: selectedUserId,
      phorest_staff_id: selectedPhorestStaff.id,
      phorest_staff_name: selectedPhorestStaff.name,
      phorest_staff_email: selectedPhorestStaff.email,
      phorest_branch_id: selectedPhorestStaff.branchId,
      phorest_branch_name: selectedPhorestStaff.branchName,
    });

    setSelectedUserId('');
    setSelectedPhorestStaff(null);
  };

  const handleAutoMatch = async (employee: typeof employees[0], phorestStaff: PhorestStaffMember) => {
    await createMapping.mutateAsync({
      user_id: employee.user_id,
      phorest_staff_id: phorestStaff.id,
      phorest_staff_name: phorestStaff.name,
      phorest_staff_email: phorestStaff.email,
      phorest_branch_id: phorestStaff.branchId,
      phorest_branch_name: phorestStaff.branchName,
    });
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSyncTypeIcon = (type: string) => {
    switch (type) {
      case 'staff':
        return <Users className="w-4 h-4" />;
      case 'appointments':
        return <Calendar className="w-4 h-4" />;
      case 'reports':
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  const lastSync = syncLogs?.find(log => log.status === 'success');

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <DashboardPageHeader
          title={`${providerLabel.toUpperCase()} Integration`}
          description={`Manage ${providerLabel} API connection and data synchronization.`}
          actions={
            <Button
              onClick={() => refetchConnection()}
              variant="outline"
              disabled={connectionLoading}
            >
              <RefreshCw className={`w-4 h-4 ${connectionLoading ? 'animate-spin' : ''}`} />
              <span className="ml-2">Test Connection</span>
            </Button>
          }
        />

        {/* Connection Status */}
        <Card className="p-6 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {connectionLoading ? (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : connection?.connected ? (
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              )}
              <div>
                <h2 className="font-display text-lg tracking-wide">
                  {connectionLoading 
                    ? 'CHECKING CONNECTION...' 
                    : connection?.connected 
                      ? 'CONNECTED TO PHOREST' 
                      : 'NOT CONNECTED'}
                </h2>
                {connection?.connected && connection.business && (
                  <p className="text-muted-foreground text-sm">
                    {connection.business.name} • {connection.staff_count || 0} staff members
                  </p>
                )}
                {!connection?.connected && connection?.error && (
                  <p className="text-destructive text-sm">{connection.error}</p>
                )}
              </div>
            </div>
            {lastSync && (
              <div className="text-right text-sm">
                <p className="text-muted-foreground">Last synced</p>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(lastSync.completed_at!), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Sync Actions */}
        {connection?.connected && (
          <div className="space-y-4">
            {/* Row 1: Individual Sync Actions */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="p-6 flex flex-col items-center text-center gap-4">
                <Users className="w-6 h-6 text-muted-foreground" />
                <h3 className="font-display text-sm tracking-wide uppercase">Staff</h3>
                <Button
                  onClick={() => triggerSync.mutate('staff')}
                  disabled={triggerSync.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {triggerSync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sync Staff'}
                </Button>
              </Card>

              <Card className="p-6 flex flex-col items-center text-center gap-4">
                <Calendar className="w-6 h-6 text-muted-foreground" />
                <h3 className="font-display text-sm tracking-wide uppercase">Appointments</h3>
                <Button
                  onClick={() => triggerSync.mutate('appointments')}
                  disabled={triggerSync.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {triggerSync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sync Appts'}
                </Button>
              </Card>

              <Card className="p-6 flex flex-col items-center text-center gap-4">
                <DollarSign className="w-6 h-6 text-muted-foreground" />
                <h3 className="font-display text-sm tracking-wide uppercase">Sales</h3>
                <Button
                  onClick={() => triggerSync.mutate('sales')}
                  disabled={triggerSync.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {triggerSync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sync Sales'}
                </Button>
              </Card>

              <Card className="p-6 flex flex-col items-center text-center gap-4">
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
                <h3 className="font-display text-sm tracking-wide uppercase">Reports</h3>
                <Button
                  onClick={() => triggerSync.mutate('reports')}
                  disabled={triggerSync.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {triggerSync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sync Reports'}
                </Button>
              </Card>
            </div>

            {/* Row 2: Full Sync */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
              <Card className="p-6 flex flex-col items-center text-center gap-4 md:col-start-2 md:col-span-2">
                <RefreshCw className="w-6 h-6 text-muted-foreground" />
                <h3 className="font-display text-sm tracking-wide uppercase">Full Sync</h3>
                <Button
                  onClick={() => triggerSync.mutate('all')}
                  disabled={triggerSync.isPending}
                  className="w-full"
                >
                  {triggerSync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sync All'}
                </Button>
              </Card>
            </div>

            {/* Scheduled Syncs Status Card */}
            <Card className="p-6 bg-muted/30">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg">Automatic Syncing</h3>
                <Badge variant="secondary" className="ml-auto">Active</Badge>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Phorest data is automatically synchronized on a schedule to keep your dashboard up-to-date.
              </p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Appointments</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Every 5 min</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Sales</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Every hour</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Full Sync</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Daily 6 AM</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Services</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Daily 6:05 AM</Badge>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tabs for Staff Mapping and Sync Logs */}
        <Tabs defaultValue="mapping" className="space-y-6">
          <TabsList>
            <TabsTrigger value="mapping" className="font-display">
              <Link2 className="w-4 h-4 mr-2" />
              Staff Mapping
            </TabsTrigger>
            <TabsTrigger value="health" className="font-display">
              <Activity className="w-4 h-4 mr-2" />
              API Health
            </TabsTrigger>
            <TabsTrigger value="logs" className="font-display">
              <Clock className="w-4 h-4 mr-2" />
              Sync History
            </TabsTrigger>
            <TabsTrigger value="write-gate" className="font-display">
              <AlertCircle className="w-4 h-4 mr-2" />
              Write Control
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mapping">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg">Link Team Members to {providerLabel} Staff</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Map your dashboard team members to their {providerLabel} staff profiles. Staff at multiple locations can have multiple mappings.
                  </p>
                </div>
                
                {/* Branch Filter */}
                {branchList.length > 1 && (
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-48">
                      <Building2 className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {branchList.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Auto-Match Suggestions */}
              {autoMatchSuggestions.length > 0 && (
                <div className="mb-8 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 className="w-5 h-5 text-primary" />
                    <h4 className="font-display text-sm">Suggested Matches</h4>
                    <Badge variant="secondary">{autoMatchSuggestions.length} found</Badge>
                  </div>
                  <div className="space-y-2">
                    {autoMatchSuggestions.slice(0, 8).map((suggestion, idx) => (
                      <div key={`${suggestion.employee.user_id}-${suggestion.phorestStaff.id}-${suggestion.phorestStaff.branchId}`} className="flex items-center justify-between p-3 bg-background rounded-md">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="font-medium">
                            {suggestion.employee.display_name || suggestion.employee.full_name}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span>{suggestion.phorestStaff.name}</span>
                          {suggestion.phorestStaff.branchName && (
                            <Badge variant="outline" className="gap-1">
                              <MapPin className="w-3 h-3" />
                              {suggestion.phorestStaff.branchName}
                            </Badge>
                          )}
                          <Badge variant={suggestion.confidence === 'high' ? 'default' : 'secondary'}>
                            {suggestion.confidence === 'high' ? 'Exact Match' : 'Partial Match'}
                          </Badge>
                        </div>
                        <Button
                          size={tokens.button.inline}
                          onClick={() => handleAutoMatch(suggestion.employee, suggestion.phorestStaff)}
                          disabled={createMapping.isPending}
                        >
                          {createMapping.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Link2 className="w-4 h-4" />
                          )}
                          <span className="ml-2">Link</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Mapping */}
              <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-muted rounded-lg">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.user_id} value={emp.user_id}>
                        {emp.display_name || emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={selectedPhorestStaff ? `${selectedPhorestStaff.id}:${selectedPhorestStaff.branchId}` : ''} 
                  onValueChange={(value) => {
                    const [staffId, branchId] = value.split(':');
                    const staff = filteredPhorestStaff.find(s => s.id === staffId && s.branchId === branchId);
                    setSelectedPhorestStaff(staff || null);
                  }}
                >
                  <SelectTrigger className="w-full md:w-80">
                    <SelectValue placeholder={`Select ${providerLabel} staff`} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPhorestStaff.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {phorestStaffList.length === 0 
                          ? 'Test connection to load staff' 
                          : 'All staff are mapped'}
                      </SelectItem>
                    ) : (
                      filteredPhorestStaff.map((staff) => (
                        <SelectItem key={`${staff.id}:${staff.branchId}`} value={`${staff.id}:${staff.branchId}`}>
                          {staff.name} {staff.branchName && `(${staff.branchName})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Button 
                  onClick={handleCreateMapping}
                  disabled={createMapping.isPending || !selectedUserId || !selectedPhorestStaff}
                >
                  {createMapping.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  <span className="ml-2">Link</span>
                </Button>
              </div>

              {/* Existing Mappings */}
              {mappingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : staffMappings?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Unlink className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No staff mappings yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead>{providerLabel} Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5">
                          Calendar
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p>Controls whether this staff member appears as a bookable service provider on the scheduling calendar</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedMappings.map((mappings) => {
                      const firstMapping = mappings[0];
                      const isMultiLocation = mappings.length > 1;
                      const userId = firstMapping.user_id;
                      const isExpanded = expandedUsers.has(userId);
                      const displayName = firstMapping.employee_profiles?.display_name || firstMapping.employee_profiles?.full_name;
                      const email = firstMapping.employee_profiles?.email;
                      const allActive = mappings.every(m => m.is_active);

                      if (isMultiLocation) {
                        return (
                          <Collapsible key={userId} open={isExpanded} onOpenChange={() => toggleUserExpanded(userId)} asChild>
                            <>
                              {/* Parent Row */}
                              <TableRow className="hover:bg-muted/50">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size={tokens.button.inline} className="h-6 w-6 p-0">
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                      </Button>
                                    </CollapsibleTrigger>
                                    <div>
                                      <p className="font-medium">{displayName}</p>
                                      <p className="text-sm text-muted-foreground">{email}</p>
                                      <p className="text-xs text-muted-foreground/70 italic">
                                        Phorest: {firstMapping.phorest_staff_email || firstMapping.phorest_staff_name}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="gap-1">
                                      <Building2 className="w-3 h-3" />
                                      Multi-Location
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="default" className="bg-primary/10 text-primary">
                                    Matched
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                                    {mappings.length} Locations
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                  </CollapsibleTrigger>
                                </TableCell>
                                <TableCell>
                                  <span className="text-muted-foreground">-</span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={allActive ? 'default' : 'secondary'}>
                                    {allActive ? 'Active' : 'Mixed'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-muted-foreground">-</span>
                                </TableCell>
                              </TableRow>

                              {/* Child Rows */}
                              <CollapsibleContent asChild>
                                <>
                                  {mappings.map((mapping) => (
                                    <TableRow key={mapping.id} className="bg-muted/30 hover:bg-muted/50">
                                      <TableCell className="pl-12">
                                        {/* Empty - parent shows name */}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {visibleMappings.has(mapping.id) ? (
                                            <div>
                                              <p className="text-sm font-medium">{mapping.phorest_staff_name || '-'}</p>
                                              <p className="text-xs text-muted-foreground font-mono">
                                                {mapping.phorest_staff_id}
                                              </p>
                                            </div>
                                          ) : null}
                                          <Button
                                            variant="ghost"
                                            size={tokens.button.inline}
                                            onClick={() => toggleMappingVisibility(mapping.id)}
                                            className="h-7 w-7 p-0"
                                          >
                                            {visibleMappings.has(mapping.id) ? (
                                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                              <Eye className="w-4 h-4 text-muted-foreground" />
                                            )}
                                          </Button>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="flex items-center gap-1 text-sm">
                                          <MapPin className="w-3 h-3 text-muted-foreground" />
                                          {mapping.phorest_branch_name || '-'}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <Switch
                                          checked={mapping.show_on_calendar ?? true}
                                          onCheckedChange={(checked) => 
                                            toggleCalendarVisibility.mutate({ mappingId: mapping.id, show: checked })
                                          }
                                          disabled={toggleCalendarVisibility.isPending}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {/* Empty - shown on parent */}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size={tokens.button.inline}
                                          onClick={() => deleteMapping.mutate(mapping.id)}
                                          disabled={deleteMapping.isPending}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </>
                              </CollapsibleContent>
                            </>
                          </Collapsible>
                        );
                      }

                      // Single location - render as before
                      const mapping = firstMapping;
                      return (
                        <TableRow key={mapping.id}>
                          <TableCell>
                            <div className="pl-8">
                              <p className="font-medium">{displayName}</p>
                              <p className="text-sm text-muted-foreground">{email}</p>
                              <p className="text-xs text-muted-foreground/70 italic">
                                Phorest: {mapping.phorest_staff_email || mapping.phorest_staff_name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {visibleMappings.has(mapping.id) ? (
                                <div>
                                  <p className="font-medium">{mapping.phorest_staff_name || '-'}</p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {mapping.phorest_staff_id}
                                  </p>
                                </div>
                              ) : (
                                <Badge variant="default" className="bg-primary/10 text-primary">
                                  Matched
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size={tokens.button.inline}
                                onClick={() => toggleMappingVisibility(mapping.id)}
                                className="h-7 w-7 p-0"
                              >
                                {visibleMappings.has(mapping.id) ? (
                                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="w-4 h-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {mapping.phorest_branch_name ? (
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                {mapping.phorest_branch_name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={mapping.show_on_calendar ?? true}
                              onCheckedChange={(checked) => 
                                toggleCalendarVisibility.mutate({ mappingId: mapping.id, show: checked })
                              }
                              disabled={toggleCalendarVisibility.isPending}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={mapping.is_active ? 'default' : 'secondary'}>
                              {mapping.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size={tokens.button.inline}
                              onClick={() => deleteMapping.mutate(mapping.id)}
                              disabled={deleteMapping.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="health">
            <PhorestApiHealthDashboard />
          </TabsContent>

          <TabsContent value="logs">
            <Card className="p-6">
              <h3 className="font-display text-lg mb-4">Sync History</h3>
              
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : syncLogs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No sync history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSyncTypeIcon(log.sync_type)}
                            <span className="capitalize">{log.sync_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSyncStatusIcon(log.status)}
                            <span className="capitalize">{log.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>{log.records_synced}</TableCell>
                        <TableCell>
                          {formatDate(new Date(log.started_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {log.completed_at 
                            ? formatDate(new Date(log.completed_at), 'MMM d, HH:mm')
                            : '-'}}
                        </TableCell>
                        <TableCell>
                          {log.error_message ? (
                            <span className="text-destructive text-sm truncate max-w-xs block">
                              {log.error_message}
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
          <TabsContent value="write-gate" className="space-y-6">
            <PhorestWriteGateCard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
