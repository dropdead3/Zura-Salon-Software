import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFormatDate } from '@/hooks/useFormatDate';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckCircle, XCircle, Clock, MapPin,
  ArrowLeftRight, ArrowDown, Gift, Loader2, AlertCircle 
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { usePendingApprovals, useShiftSwaps, useApproveSwap, type ShiftSwap } from '@/hooks/useShiftSwaps';
import { formatDisplayName } from '@/lib/utils';

const swapTypeConfig = {
  swap: { icon: ArrowLeftRight, label: 'Swap', color: 'text-blue-600' },
  cover: { icon: ArrowDown, label: 'Cover', color: 'text-purple-600' },
  giveaway: { icon: Gift, label: 'Giveaway', color: 'text-green-600' },
};

export default function ShiftSwapApprovals() {
  const { formatDate } = useFormatDate();
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [selectedSwap, setSelectedSwap] = useState<ShiftSwap | null>(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null);

  const { data: pendingSwaps = [], isLoading: loadingPending } = usePendingApprovals();
  const { data: allSwaps = [], isLoading: loadingAll } = useShiftSwaps('approved');
  const approveSwap = useApproveSwap();

  const approvedSwaps = allSwaps.filter(s => s.status === 'approved');
  const deniedSwaps = allSwaps.filter(s => s.status === 'denied');

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return formatDate(date, 'h:mm a');
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAction = (swap: ShiftSwap, action: 'approve' | 'deny') => {
    setSelectedSwap(swap);
    setActionType(action);
    setManagerNotes('');
  };

  const handleConfirmAction = async () => {
    if (!selectedSwap || !actionType) return;

    await approveSwap.mutateAsync({
      swapId: selectedSwap.id,
      approved: actionType === 'approve',
      notes: managerNotes || undefined,
    });

    setSelectedSwap(null);
    setActionType(null);
    setManagerNotes('');
  };

  const renderSwapCard = (swap: ShiftSwap, showActions = false) => {
    const typeConfig = swapTypeConfig[swap.swap_type];
    const TypeIcon = typeConfig.icon;
    const requesterName = swap.requester ? formatDisplayName(swap.requester.full_name || '', swap.requester.display_name) : 'Unknown';
    const claimerName = swap.claimer ? formatDisplayName(swap.claimer.full_name || '', swap.claimer.display_name) : 'Unknown';

    return (
      <motion.div
        key={swap.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            {/* Type badge and date */}
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="gap-1">
                <TypeIcon className={`w-3 h-3 ${typeConfig.color}`} />
                {typeConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Requested {formatDate(new Date(swap.created_at), 'MMM d')}
              </span>
            </div>

            {/* People involved */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 flex-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={swap.requester?.photo_url || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(requesterName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{requesterName}</p>
                  <p className="text-xs text-muted-foreground">Requester</p>
                </div>
              </div>

              <ArrowLeftRight className="w-4 h-4 text-muted-foreground shrink-0" />

              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="min-w-0 text-right">
                  <p className="text-sm font-medium truncate">{claimerName}</p>
                  <p className="text-xs text-muted-foreground">Claimer</p>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={swap.claimer?.photo_url || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(claimerName)}</AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Shift details */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  {formatDate(new Date(swap.original_date), 'EEE, MMM d')} • {formatTime(swap.original_start_time)} - {formatTime(swap.original_end_time)}
                </span>
              </div>
              {swap.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{swap.location.name}</span>
                </div>
              )}
            </div>

            {/* Swap offer (for swap type) */}
            {swap.swap_type === 'swap' && swap.claimer_date && (
              <div className="mt-3 bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
                <p className="text-xs font-medium text-blue-600 mb-1">In Exchange For</p>
                <p className="text-sm">
                  {formatDate(new Date(swap.claimer_date), 'EEE, MMM d')} • {swap.claimer_start_time && formatTime(swap.claimer_start_time)} - {swap.claimer_end_time && formatTime(swap.claimer_end_time)}
                </p>
              </div>
            )}

            {/* Manager notes (for history) */}
            {swap.manager_notes && (
              <div className="mt-3 text-sm">
                <span className="text-muted-foreground">Manager notes: </span>
                <span>{swap.manager_notes}</span>
              </div>
            )}

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 mt-4 pt-3 border-t">
                <Button
                  className="flex-1"
                  onClick={() => handleAction(swap, 'approve')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAction(swap, 'deny')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deny
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <DashboardPageHeader
          title="Shift Swap Approvals"
          description="Review and approve shift swap requests from your team"
          className="mb-6"
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Pending
              {pendingSwaps.length > 0 && (
                <Badge className="ml-1 bg-orange-500 text-white">
                  {pendingSwaps.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="denied" className="gap-2">
              <XCircle className="w-4 h-4" />
              Denied
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {loadingPending ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : pendingSwaps.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingSwaps.map(swap => renderSwapCard(swap, true))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="font-medium mb-1">All caught up!</h3>
                <p className="text-sm text-muted-foreground">
                  No pending swap requests to review
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            {approvedSwaps.length > 0 ? (
              <ScrollArea className="h-[500px]">
                <div className="grid gap-4 md:grid-cols-2 pr-4">
                  {approvedSwaps.map(swap => renderSwapCard(swap))}
                </div>
              </ScrollArea>
            ) : (
              <Card className="p-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No approved swaps yet</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="denied" className="mt-6">
            {deniedSwaps.length > 0 ? (
              <ScrollArea className="h-[500px]">
                <div className="grid gap-4 md:grid-cols-2 pr-4">
                  {deniedSwaps.map(swap => renderSwapCard(swap))}
                </div>
              </ScrollArea>
            ) : (
              <Card className="p-12 text-center">
                <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No denied swaps</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve Swap' : 'Deny Swap'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve'
                  ? 'This will notify both parties and update their schedules.'
                  : 'This will notify both parties that the swap was not approved.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Add any notes for the team members..."
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionType(null)}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'deny' ? 'destructive' : 'default'}
                onClick={handleConfirmAction}
                disabled={approveSwap.isPending}
              >
                {approveSwap.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {actionType === 'approve' ? 'Approve' : 'Deny'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
