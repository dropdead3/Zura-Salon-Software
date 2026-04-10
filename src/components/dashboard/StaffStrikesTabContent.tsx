import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { StrikeStatisticsCard } from '@/components/dashboard/StrikeStatisticsCard';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Trash2,
  Pencil,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import {
  useStaffStrikes,
  useResolveStrike,
  useDeleteStrike,
  STRIKE_TYPE_LABELS,
  STRIKE_TYPE_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  StaffStrikeWithDetails,
  StrikeType,
  StrikeSeverity,
} from '@/hooks/useStaffStrikes';
import { AddStrikeToStaffDialog } from '@/components/dashboard/AddStrikeToStaffDialog';
import { EditStrikeDialog } from '@/components/dashboard/EditStrikeDialog';
import { StrikeExportButton } from '@/components/dashboard/StrikeExportButton';
import { cn } from '@/lib/utils';

interface StaffStrikesTabContentProps {
  defaultUserId?: string;
}

export function StaffStrikesTabContent({ defaultUserId }: StaffStrikesTabContentProps) {
  const { formatDate } = useFormatDate();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedStrike, setSelectedStrike] = useState<StaffStrikeWithDetails | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>(defaultUserId || 'all');

  const { data: strikes = [], isLoading } = useStaffStrikes();
  const resolveStrike = useResolveStrike();
  const deleteStrike = useDeleteStrike();

  // Sync with prop on mount
  useEffect(() => {
    if (defaultUserId) {
      setSelectedEmployee(defaultUserId);
    }
  }, [defaultUserId]);

  // Filter strikes
  const filteredStrikes = strikes.filter((strike) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        strike.title.toLowerCase().includes(query) ||
        strike.description?.toLowerCase().includes(query) ||
        strike.employee_name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (typeFilter !== 'all' && strike.strike_type !== typeFilter) return false;
    if (severityFilter !== 'all' && strike.severity !== severityFilter) return false;
    if (statusFilter === 'active' && strike.is_resolved) return false;
    if (statusFilter === 'resolved' && !strike.is_resolved) return false;
    if (selectedEmployee !== 'all' && strike.user_id !== selectedEmployee) return false;
    return true;
  });

  const handleResolve = async () => {
    if (!selectedStrike) return;
    await resolveStrike.mutateAsync({
      id: selectedStrike.id,
      resolution_notes: resolutionNotes || undefined,
    });
    setResolveDialogOpen(false);
    setSelectedStrike(null);
    setResolutionNotes('');
  };

  const handleDelete = async (id: string) => {
    await deleteStrike.mutateAsync(id);
  };

  const employeesWithStrikes = [...new Set(strikes.map((s) => s.user_id))].map((userId) => {
    const strike = strikes.find((s) => s.user_id === userId);
    return { id: userId, name: strike?.employee_name || 'Unknown' };
  });

  const activeStrikes = strikes.filter((s) => !s.is_resolved).length;
  const resolvedStrikes = strikes.filter((s) => s.is_resolved).length;
  const criticalStrikes = strikes.filter((s) => s.severity === 'critical' && !s.is_resolved).length;

  return (
    <div className="space-y-6">
      {/* Actions Row */}
      <div className="flex items-center justify-end gap-2">
        <StrikeExportButton strikes={strikes} filteredStrikes={filteredStrikes} />
        <AddStrikeToStaffDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Strikes</p>
                <p className="text-2xl font-medium">{activeStrikes}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-medium text-destructive">{criticalStrikes}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-medium text-green-600">{resolvedStrikes}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <StrikeStatisticsCard strikes={strikes} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, description, or employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(STRIKE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employeesWithStrikes.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Strikes List */}
      {isLoading ? (
        <DashboardLoader size="lg" className="py-12" />
      ) : filteredStrikes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No strikes found</p>
            <p className="text-sm">
              {statusFilter === 'active'
                ? 'No active strikes at this time.'
                : 'No strikes match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStrikes.map((strike) => (
            <Card
              key={strike.id}
              className={cn(
                'overflow-hidden transition-all',
                strike.is_resolved && 'opacity-60',
                strike.severity === 'critical' && !strike.is_resolved && 'border-red-300 dark:border-red-800'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={strike.employee_photo || undefined} />
                    <AvatarFallback>
                      {strike.employee_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{strike.employee_name}</span>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', STRIKE_TYPE_COLORS[strike.strike_type as StrikeType])}
                          >
                            {STRIKE_TYPE_LABELS[strike.strike_type as StrikeType]}
                          </Badge>
                          <Badge
                            className={cn('text-xs', SEVERITY_COLORS[strike.severity as StrikeSeverity])}
                          >
                            {SEVERITY_LABELS[strike.severity as StrikeSeverity]}
                          </Badge>
                          {strike.is_resolved && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-lg">{strike.title}</h3>
                        {strike.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {strike.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(new Date(strike.incident_date), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Added by {strike.created_by_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(new Date(strike.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {strike.is_resolved && strike.resolution_notes && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-xs font-medium text-green-800 dark:text-green-400 mb-1">
                              Resolution Notes:
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              {strike.resolution_notes}
                            </p>
                            {strike.resolved_by_name && strike.resolved_at && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                Resolved by {strike.resolved_by_name} on{' '}
                                {formatDate(new Date(strike.resolved_at), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStrike(strike);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        {!strike.is_resolved && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedStrike(strike);
                                  setResolveDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Resolve</TooltipContent>
                          </Tooltip>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size={tokens.button.inline} className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Strike</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this strike? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(strike.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Resolve Strike
            </DialogTitle>
            <DialogDescription>
              Mark this strike as resolved. You can optionally add resolution notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedStrike?.title}</p>
              <p className="text-sm text-muted-foreground">
                {selectedStrike?.employee_name}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Notes (optional)</label>
              <Textarea
                placeholder="Describe how this issue was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={resolveStrike.isPending}>
              {resolveStrike.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {selectedStrike && (
        <EditStrikeDialog
          strike={selectedStrike}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedStrike(null);
          }}
        />
      )}
    </div>
  );
}
