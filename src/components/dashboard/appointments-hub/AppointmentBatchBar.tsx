import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X, MessageSquare, CheckCircle2, XCircle, CalendarX, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareToDMDialog } from '@/components/dashboard/sales/ShareToDMDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MultiClientResolutionDialog } from './MultiClientResolutionDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';

/** Compute unique client IDs from a selection, treating walk-ins as distinct unknowns */
function getUniqueClientIds(appointments: any[]): Set<string> {
  const ids = new Set<string>();
  let unknownCounter = 0;
  for (const a of appointments) {
    const clientId = a._source === 'phorest' ? a.phorest_client_id : a.client_id;
    if (clientId) {
      ids.add(clientId);
    } else {
      unknownCounter++;
      ids.add(`__unknown_${unknownCounter}`);
    }
  }
  return ids;
}

interface AppointmentBatchBarProps {
  selectedAppointments: any[];
  onClearSelection: () => void;
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MM/dd/yyyy'); } catch { return '—'; }
}

type PendingAction =
  | { type: 'cancel-selected' }
  | { type: 'cancel-future' }
  | { type: 'status-update'; status: string };

export function AppointmentBatchBar({ selectedAppointments, onClearSelection }: AppointmentBatchBarProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cancelSelectedOpen, setCancelSelectedOpen] = useState(false);
  const [cancelFutureOpen, setCancelFutureOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const queryClient = useQueryClient();

  const uniqueClientIds = useMemo(() => getUniqueClientIds(selectedAppointments), [selectedAppointments]);
  const isMultiClient = uniqueClientIds.size > 1;
  const clientCount = uniqueClientIds.size;

  const customerNumbers = useMemo(() => {
    const nums = selectedAppointments
      .map((a: any) => a.customer_number)
      .filter((n: any): n is string => !!n);
    return [...new Set(nums)];
  }, [selectedAppointments]);

  const today = new Date().toISOString().split('T')[0];
  const futureAppointments = useMemo(() => selectedAppointments.filter(
    (a: any) => a.appointment_date >= today && a.status !== 'cancelled' && a.status !== 'completed'
  ), [selectedAppointments, today]);
  const hasFuture = futureAppointments.length > 0;

  const resolutionAppointments = useMemo(() => {
    if (!pendingAction) return selectedAppointments;
    if (pendingAction.type === 'cancel-future') return futureAppointments;
    return selectedAppointments;
  }, [pendingAction, selectedAppointments, futureAppointments]);

  if (selectedAppointments.length === 0) return null;

  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Client', 'Phone', 'Email', 'Service', 'Stylist', 'Status', 'Price'];
    const rows = selectedAppointments.map((a: any) => [
      formatDateDisplay(a.appointment_date),
      `${a.start_time}-${a.end_time}`,
      a.client_name || '',
      a.client_phone || '',
      a.client_email || '',
      a.service_name || '',
      a.stylist_name || '',
      a.status || '',
      a.total_price ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-appointments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkStatusUpdate = async (newStatus: string, appointments?: any[]) => {
    const targets = appointments || selectedAppointments;
    setUpdating(true);
    try {
      const phorestIds = targets.filter(a => a._source === 'phorest').map(a => a.id);
      const localIds = targets.filter(a => a._source === 'local').map(a => a.id);

      const promises = [];
      if (phorestIds.length > 0) {
        promises.push(
          (async () => await supabase.from('phorest_appointments').update({ status: newStatus } as any).in('id', phorestIds))()
        );
      }
      if (localIds.length > 0) {
        promises.push(
          (async () => await supabase.from('appointments').update({ status: newStatus }).in('id', localIds))()
        );
      }

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;

      toast.success(`${targets.length} appointment${targets.length !== 1 ? 's' : ''} updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['appointments-hub'] });
      onClearSelection();
    } catch (err: any) {
      toast.error('Failed to update appointments', { description: err.message });
    } finally {
      setUpdating(false);
    }
  };

  // Route destructive/update actions through resolution dialog when multi-client
  const handleActionWithResolution = (action: PendingAction) => {
    if (isMultiClient) {
      setPendingAction(action);
      setResolutionOpen(true);
    } else {
      // Single client — use existing flows
      if (action.type === 'cancel-selected') setCancelSelectedOpen(true);
      else if (action.type === 'cancel-future') setCancelFutureOpen(true);
      else if (action.type === 'status-update') handleBulkStatusUpdate(action.status);
    }
  };

  const handleResolutionConfirm = (filteredAppointments: any[]) => {
    if (!pendingAction) return;
    if (pendingAction.type === 'cancel-selected' || pendingAction.type === 'cancel-future') {
      handleBulkStatusUpdate('cancelled', filteredAppointments);
    } else if (pendingAction.type === 'status-update') {
      handleBulkStatusUpdate(pendingAction.status, filteredAppointments);
    }
    setPendingAction(null);
  };

  const getResolutionLabel = (): string => {
    if (!pendingAction) return 'Confirm';
    if (pendingAction.type === 'cancel-selected' || pendingAction.type === 'cancel-future') return 'Cancel';
    if (pendingAction.type === 'status-update') return `Mark ${pendingAction.status}`;
    return 'Confirm';
  };




  const shareContent = selectedAppointments.slice(0, 15).map(a =>
    `• ${a.client_name || 'Walk-in'} — ${formatDateDisplay(a.appointment_date)} ${a.start_time || ''} (${a.status || 'booked'})`
  ).join('\n') + (selectedAppointments.length > 15 ? `\n...and ${selectedAppointments.length - 15} more` : '');

  const isVisible = selectedAppointments.length > 0;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300, mass: 0.8 }}
              className="fixed bottom-6 right-24 z-50 h-14 bg-card/80 backdrop-blur-xl border border-border rounded-full shadow-2xl px-6 flex items-center gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selectedAppointments.length} selected</span>
                {isMultiClient && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {clientCount} different clients
                  </Badge>
                )}
                <Button variant="ghost" size={tokens.button.inline} onClick={onClearSelection} className="h-7 px-2">
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  onValueChange={(v) => handleActionWithResolution({ type: 'status-update', status: v })}
                  disabled={updating}
                >
                  <SelectTrigger className="w-[180px] h-7 text-xs">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" />
                      <SelectValue placeholder="Update Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  onClick={() => handleActionWithResolution({ type: 'cancel-selected' })}
                  disabled={updating}
                  className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <XCircle className="h-3 w-3" /> Cancel Selected
                </Button>
                {hasFuture && (
                  <Button
                    variant="outline"
                    size={tokens.button.inline}
                    onClick={() => handleActionWithResolution({ type: 'cancel-future' })}
                    disabled={updating}
                    className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <CalendarX className="h-3 w-3" /> Cancel All Future ({futureAppointments.length})
                  </Button>
                )}
                <Button variant="outline" size={tokens.button.inline} onClick={() => setShareOpen(true)} className="h-7 text-xs gap-1.5">
                  <MessageSquare className="h-3 w-3" /> Share
                </Button>
                <Button variant="outline" size={tokens.button.inline} onClick={handleExportCSV} className="h-7 text-xs gap-1.5">
                  <Download className="h-3 w-3" /> Export CSV
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Cancel Selected Dialog — single-client only */}
      <AlertDialog open={cancelSelectedOpen} onOpenChange={setCancelSelectedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {selectedAppointments.length} selected appointment{selectedAppointments.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel all selected appointments. Cancelled appointments cannot be automatically restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleBulkStatusUpdate('cancelled')}
            >
              Cancel Appointments
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel All Future Dialog — single-client only */}
      <AlertDialog open={cancelFutureOpen} onOpenChange={setCancelFutureOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {futureAppointments.length} future appointment{futureAppointments.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel only the selected appointments dated today or later. Past appointments will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleBulkStatusUpdate('cancelled', futureAppointments)}
            >
              Cancel Future Appointments
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Multi-Client Resolution Dialog */}
      <MultiClientResolutionDialog
        open={resolutionOpen}
        onOpenChange={setResolutionOpen}
        appointments={resolutionAppointments}
        actionLabel={getResolutionLabel()}
        actionVariant={pendingAction?.type === 'status-update' ? 'default' : 'destructive'}
        onConfirm={handleResolutionConfirm}
      />

      <ShareToDMDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        planTitle={`${selectedAppointments.length} Selected Appointments`}
        planContent={`**Selected Appointments**\n\n${shareContent}`}
      />
    </>
  );
}
