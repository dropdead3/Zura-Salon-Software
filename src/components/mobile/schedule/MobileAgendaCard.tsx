import { useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import {
  Clock,
  User,
  Phone,
  Mail,
  Scissors,
  DollarSign,
  CheckCircle2,
  XCircle,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  start_time?: string;
  end_time?: string;
  service_name?: string;
  total_price?: number;
  status?: string;
  staff_name?: string;
  notes?: string;
}

interface MobileAgendaCardProps {
  appointment: Appointment;
  onRefresh?: () => void;
  isCompleted?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-600', icon: UserCheck },
  checked_in: { label: 'Checked In', color: 'bg-purple-500/10 text-purple-600', icon: User },
  in_progress: { label: 'In Service', color: 'bg-blue-500/10 text-blue-600', icon: Scissors },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-600', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600', icon: XCircle },
  no_show: { label: 'No Show', color: 'bg-red-500/10 text-red-600', icon: XCircle },
};

export function MobileAgendaCard({ 
  appointment, 
  onRefresh,
  isCompleted = false,
}: MobileAgendaCardProps) {
  const { formatDate } = useFormatDate();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { formatCurrency } = useFormatCurrency();

  const status = appointment.status || 'pending';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return formatDate(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      // TODO: Implement actual status update
      toast.success(`Status updated to ${newStatus}`);
      onRefresh?.();
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Card 
        className={cn(
          'p-3 cursor-pointer transition-all active:scale-[0.98]',
          isCompleted && 'opacity-70'
        )}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(appointment.client_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium truncate">
                {appointment.client_name || 'Unknown Client'}
              </p>
              <Badge className={cn('text-[10px] shrink-0', statusConfig.color)}>
                <StatusIcon className="h-2.5 w-2.5 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(appointment.start_time)}
              </span>
              {appointment.service_name && (
                <span className="truncate max-w-[120px]">
                  {appointment.service_name}
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </Card>

      <PremiumFloatingPanel 
        open={isOpen} 
        onOpenChange={setIsOpen} 
        side="bottom"
        maxHeight="70vh"
        maxWidth="100%"
        showCloseButton
      >
        <div className="p-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(appointment.client_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{appointment.client_name || 'Unknown'}</p>
              <Badge className={cn('mt-1', statusConfig.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Time & Service */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Time</span>
              </div>
              <p className="font-medium">
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Price</span>
              </div>
              <p className="font-medium">
                {formatCurrency(appointment.total_price ?? 0)}
              </p>
            </div>
          </div>

          {/* Service */}
          {appointment.service_name && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Scissors className="h-4 w-4" />
                <span className="text-xs">Service</span>
              </div>
              <p className="font-medium">{appointment.service_name}</p>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-2">
            {appointment.client_phone && (
              <a 
                href={`tel:${appointment.client_phone}`}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg active:bg-muted/50"
              >
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm">{appointment.client_phone}</span>
              </a>
            )}
            {appointment.client_email && (
              <a 
                href={`mailto:${appointment.client_email}`}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg active:bg-muted/50"
              >
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm truncate">{appointment.client_email}</span>
              </a>
            )}
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{appointment.notes}</p>
            </div>
          )}

          {/* Actions */}
          {!isCompleted && (
            <div className="grid grid-cols-2 gap-2 pt-4 border-t">
              {status === 'confirmed' && (
                <Button 
                  onClick={() => handleStatusChange('checked_in')}
                  disabled={isUpdating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              )}
              {(status === 'checked_in' || status === 'in_progress') && (
                <Button 
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              )}
              {status !== 'cancelled' && status !== 'no_show' && status !== 'completed' && (
                <Button 
                  variant="outline"
                  onClick={() => handleStatusChange('no_show')}
                  disabled={isUpdating}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  No Show
                </Button>
              )}
            </div>
          )}
        </div>
      </PremiumFloatingPanel>
    </>
  );
}
