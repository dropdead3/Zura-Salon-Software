import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Download, X, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareToDMDialog } from '@/components/dashboard/sales/ShareToDMDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';

interface AppointmentBatchBarProps {
  selectedAppointments: any[];
  onClearSelection: () => void;
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MM/dd/yyyy'); } catch { return '—'; }
}

export function AppointmentBatchBar({ selectedAppointments, onClearSelection }: AppointmentBatchBarProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const queryClient = useQueryClient();

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

  const handleBulkStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const phorestIds = selectedAppointments.filter(a => a._source === 'phorest').map(a => a.id);
      const localIds = selectedAppointments.filter(a => a._source === 'local').map(a => a.id);

      const promises = [];
      if (phorestIds.length > 0) {
        promises.push(
          (async () => await supabase.from('phorest_appointments').update({ status: newStatus }).in('id', phorestIds))()
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

      toast.success(`${selectedAppointments.length} appointment${selectedAppointments.length !== 1 ? 's' : ''} updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['appointments-hub'] });
      onClearSelection();
    } catch (err: any) {
      toast.error('Failed to update appointments', { description: err.message });
    } finally {
      setUpdating(false);
    }
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
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[calc(100%-2rem)] bg-card/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl px-5 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selectedAppointments.length} selected</span>
                <Button variant="ghost" size={tokens.button.inline} onClick={onClearSelection} className="h-7 px-2">
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select onValueChange={handleBulkStatusUpdate} disabled={updating}>
                  <SelectTrigger className="w-[180px] h-7 text-xs">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" />
                      <SelectValue placeholder="Update Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
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

      <ShareToDMDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        planTitle={`${selectedAppointments.length} Selected Appointments`}
        planContent={`**Selected Appointments**\n\n${shareContent}`}
      />
    </>
  );
}
