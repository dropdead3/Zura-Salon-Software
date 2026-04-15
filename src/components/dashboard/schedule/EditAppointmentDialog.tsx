import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CalendarIcon, 
  Clock, 
  User, 
  Scissors, 
  FileText,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';
import { format, parse, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useRescheduleAppointment } from '@/hooks/useRescheduleAppointment';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn, formatDisplayName } from '@/lib/utils';
import type { QueueAppointment } from '@/hooks/useTodaysQueue';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface EditAppointmentDialogProps {
  appointment: QueueAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate time slots from 6am to 10pm in 15-min increments
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = min.toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function EditAppointmentDialog({ 
  appointment, 
  open, 
  onOpenChange 
}: EditAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const reschedule = useRescheduleAppointment();
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [notes, setNotes] = useState('');
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);

  // Fetch staff for the location
  const { data: staff = [] } = useQuery({
    queryKey: ['location-staff', appointment?.location_id],
    queryFn: async () => {
      if (!appointment?.location_id) return [];
      
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url')
        .eq('is_active', true)
        .order('display_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!appointment?.location_id,
  });

  // Reset form when appointment changes
  useEffect(() => {
    if (appointment) {
      setSelectedDate(parseISO(appointment.appointment_date));
      setSelectedTime(appointment.start_time.slice(0, 5)); // Get HH:mm
      setSelectedStaffId(appointment.stylist_user_id || '');
      setNotes(appointment.notes || '');
    }
  }, [appointment]);

  const handleSave = async () => {
    if (!appointment || !selectedDate) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Calculate end time based on original duration
    const startMinutes = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
    const originalStart = parseInt(appointment.start_time.split(':')[0]) * 60 + parseInt(appointment.start_time.split(':')[1]);
    const originalEnd = parseInt(appointment.end_time.split(':')[0]) * 60 + parseInt(appointment.end_time.split(':')[1]);
    const duration = originalEnd - originalStart;
    const endMinutes = startMinutes + duration;
    const endHour = Math.floor(endMinutes / 60).toString().padStart(2, '0');
    const endMin = (endMinutes % 60).toString().padStart(2, '0');
    const endTime = `${endHour}:${endMin}:00`;

    // Update notes separately if changed
    if (notes !== appointment.notes) {
      setIsUpdatingNotes(true);
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ notes })
          .eq('id', appointment.id);
        
        // Fallback: also try phorest_appointments if the record is from phorest
        if (error) {
          const { error: pErr } = await supabase
            .from('phorest_appointments' as any)
            .update({ notes })
            .eq('id', appointment.id);
          if (pErr) throw pErr;
        }
        
        if (error) throw error;
      } catch (err: any) {
        toast.error('Failed to update notes', { description: err.message });
      } finally {
        setIsUpdatingNotes(false);
      }
    }

    // Reschedule if date/time/staff changed
    const dateChanged = dateStr !== appointment.appointment_date;
    const timeChanged = selectedTime !== appointment.start_time.slice(0, 5);
    const staffChanged = selectedStaffId && selectedStaffId !== appointment.stylist_user_id;

    if (dateChanged || timeChanged || staffChanged) {
      reschedule.mutate(
        {
          appointmentId: appointment.id,
          newDate: dateStr,
          newTime: `${selectedTime}:00`,
          newStaffId: staffChanged ? selectedStaffId : undefined,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todays-queue'] });
            onOpenChange(false);
          },
        }
      );
    } else if (notes !== appointment.notes) {
      // Only notes changed
      queryClient.invalidateQueries({ queryKey: ['todays-queue'] });
      toast.success('Appointment updated');
      onOpenChange(false);
    } else {
      onOpenChange(false);
    }
  };

  if (!appointment) return null;

  const isLoading = reschedule.isPending || isUpdatingNotes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogDescription>
            Update appointment details for {appointment.client_name || 'Walk-in'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Info (Read-only) */}
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{appointment.client_name || 'Walk-in Client'}</span>
            </div>
            {appointment.client_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {appointment.client_phone}
              </div>
            )}
          </div>

          {/* Service Info (Read-only) */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{appointment.service_name || 'Service'}</span>
            </div>
            {appointment.total_price && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(appointment.total_price)}
              </p>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? formatDate(selectedDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {TIME_SLOTS.map(time => (
                  <SelectItem key={time} value={time}>
                    {formatDate(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff Selection */}
          <div className="space-y-2">
            <Label>Staff Member</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff.map(member => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {formatDisplayName(member.full_name || '', member.display_name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add appointment notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
