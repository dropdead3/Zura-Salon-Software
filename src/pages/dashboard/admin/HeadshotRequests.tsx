import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Camera, 
  Loader2, 
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  CalendarDays,
  Eye,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface HeadshotRequest {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  scheduled_location: string | null;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
  employee_profile?: {
    full_name: string;
    email: string | null;
    phone: string | null;
    display_name: string | null;
  };
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-500' },
  { value: 'scheduled', label: 'Scheduled', icon: CalendarDays, color: 'text-blue-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-500' },
];

export default function HeadshotRequests() {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<HeadshotRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<HeadshotRequest | null>(null);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledLocation, setScheduledLocation] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('headshot_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching headshot requests:', error);
    } else if (data) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, email, phone, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const enrichedData = data.map(r => ({
        ...r,
        employee_profile: profileMap.get(r.user_id)
      }));
      setRequests(enrichedData);
    }

    setLoading(false);
  };

  const openRequestDetails = (request: HeadshotRequest) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setNotes(request.notes || '');
    setScheduledDate(request.scheduled_date ? new Date(request.scheduled_date) : undefined);
    setScheduledTime(request.scheduled_time || '');
    setScheduledLocation(request.scheduled_location || '');
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest || !user) return;

    setUpdating(true);

    const updateData: any = {
      status: newStatus,
      notes: notes.trim() || null,
      scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null,
      scheduled_time: scheduledTime.trim() || null,
      scheduled_location: scheduledLocation.trim() || null,
    };

    // If status changed to completed or cancelled, set processed info
    if ((newStatus === 'completed' || newStatus === 'cancelled') && selectedRequest.status !== newStatus) {
      updateData.processed_at = new Date().toISOString();
      updateData.processed_by = user.id;
    }

    const { error } = await supabase
      .from('headshot_requests')
      .update(updateData)
      .eq('id', selectedRequest.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } else {
      toast({
        title: 'Request Updated',
        description: 'Headshot request has been updated.'
      });
      setSelectedRequest(null);
      fetchRequests();
    }

    setUpdating(false);
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    if (!statusOption) return <Badge variant="outline">{status}</Badge>;

    const Icon = statusOption.icon;
    return (
      <Badge variant="outline" className={cn("gap-1", statusOption.color)}>
        <Icon className="w-3 h-3" />
        {statusOption.label}
      </Badge>
    );
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchQuery === '' || 
      request.employee_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.employee_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    scheduled: requests.filter(r => r.status === 'scheduled').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <DashboardPageHeader
          title="Headshot Requests"
          description="Schedule and manage headshot sessions for team members."
          className="mb-8"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Total</p>
            <p className="font-display text-2xl mt-1">{stats.total}</p>
          </Card>
          <Card className="p-4 border-yellow-500/30">
            <p className="text-xs text-yellow-500 font-sans uppercase tracking-wider">Pending</p>
            <p className="font-display text-2xl mt-1">{stats.pending}</p>
          </Card>
          <Card className="p-4 border-blue-500/30">
            <p className="text-xs text-blue-500 font-sans uppercase tracking-wider">Scheduled</p>
            <p className="font-display text-2xl mt-1">{stats.scheduled}</p>
          </Card>
          <Card className="p-4 border-green-500/30">
            <p className="text-xs text-green-500 font-sans uppercase tracking-wider">Completed</p>
            <p className="font-display text-2xl mt-1">{stats.completed}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Requests Table */}
        <Card>
          {loading ? (
            <DashboardLoader size="md" className="py-12" />
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground font-sans">
                {requests.length === 0 
                  ? 'No headshot requests yet' 
                  : 'No requests match your filters'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-sans font-medium">
                          {request.employee_profile?.display_name || request.employee_profile?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.employee_profile?.email || '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(new Date(request.requested_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {request.scheduled_date ? (
                        <div className="text-sm">
                          <p className="font-medium">
                            {formatDate(new Date(request.scheduled_date), 'MMM d, yyyy')}
                          </p>
                          {request.scheduled_time && (
                            <p className="text-xs text-muted-foreground">{request.scheduled_time}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRequestDetails(request)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Request Details Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-md">
            {selectedRequest && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display">SCHEDULE HEADSHOT</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Team Member Info */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Team Member</p>
                    <p className="font-sans font-medium">
                      {selectedRequest.employee_profile?.display_name || selectedRequest.employee_profile?.full_name || 'Unknown'}
                    </p>
                    {selectedRequest.employee_profile?.email && (
                      <p className="text-sm text-muted-foreground">{selectedRequest.employee_profile.email}</p>
                    )}
                    {selectedRequest.employee_profile?.phone && (
                      <p className="text-sm text-muted-foreground">{selectedRequest.employee_profile.phone}</p>
                    )}
                  </div>

                  {/* Requested Date */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Requested</p>
                    <p className="text-sm font-sans">
                      {formatDate(new Date(selectedRequest.requested_at), 'MMMM d, yyyy \'at\' h:mm a')}
                    </p>
                  </div>

                  {/* Schedule Date */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Schedule Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          {scheduledDate ? formatDate(scheduledDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Schedule Time */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Time</p>
                    <Input
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      placeholder="e.g., 2:00 PM"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Location</p>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={scheduledLocation}
                        onChange={(e) => setScheduledLocation(e.target.value)}
                        placeholder="e.g., Midtown Studio"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Status Update */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <status.icon className={cn("w-4 h-4", status.color)} />
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Admin Notes</p>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about this session..."
                      rows={3}
                    />
                  </div>

                  {/* Processed Info */}
                  {selectedRequest.processed_at && (
                    <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                      Processed on {formatDate(new Date(selectedRequest.processed_at), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateRequest} disabled={updating} className="font-display">
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'UPDATE REQUEST'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
