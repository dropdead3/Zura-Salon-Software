import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { 
  Clock, 
  User, 
  Phone, 
  Scissors, 
  CheckCircle2, 
  DollarSign,
  AlertCircle,
  Copy,
  Check,
  XCircle,
  MoreVertical,
  Pencil,
  Trash2,
  CalendarDays,
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useFormatDate } from '@/hooks/useFormatDate';
import type { QueueAppointment } from '@/hooks/useTodaysQueue';
import { toast } from 'sonner';

interface QueueCardProps {
  appointment: QueueAppointment;
  variant: 'waiting' | 'inService' | 'upcoming';
  onCheckIn?: () => void;
  onPay?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isUpdating?: boolean;
}

export function QueueCard({ 
  appointment, 
  variant,
  onCheckIn,
  onPay,
  onEdit,
  onDelete,
  isUpdating = false,
}: QueueCardProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrencyWhole } = useFormatCurrency();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return formatDate(date, 'h:mm a');
  };

  const copyPhone = async () => {
    if (!appointment.client_phone) return;
    
    try {
      await navigator.clipboard.writeText(appointment.client_phone);
      setCopied(true);
      toast.success('Phone number copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getStatusBadge = () => {
    // In-service appointments show time remaining
    if (variant === 'inService') {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <Clock className="w-3 h-3 mr-1" />
          ~{appointment.estimatedCompleteIn}min left
        </Badge>
      );
    }

    // Late arrivals get priority warning
    if (appointment.isLate) {
      return (
        <Badge variant="destructive" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          {appointment.waitTimeMinutes}min late
        </Badge>
      );
    }

    // Show actual booking status based on appointment.status
    switch (appointment.status) {
      case 'confirmed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'no_show':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            No-Show
          </Badge>
        );
      case 'booked':
      case 'unknown':
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">
            <Clock className="w-3 h-3 mr-1" />
            Unconfirmed
          </Badge>
        );
    }
  };

  return (
    <Card className={cn(
      "p-4 transition-all duration-200 hover:shadow-md",
      variant === 'inService' && "border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20",
      appointment.isLate && variant === 'waiting' && "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
      appointment.status === 'cancelled' && "opacity-60 border-red-200 dark:border-red-900",
    )}>
      <div className="flex flex-col gap-3">
        {/* Header: Time, Status & Actions */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-lg">
            {formatTime(appointment.start_time)}
          </span>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={() => navigate('/dashboard/schedule', { state: { focusDate: appointment.appointment_date, focusAppointmentId: appointment.id } })}>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    View on Schedule
                  </DropdownMenuItem>
                  {(onEdit || onDelete) && <DropdownMenuSeparator />}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onEdit && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Client Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {appointment.client_name || 'Walk-in'}
            </span>
            {appointment.is_new_client && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">NEW</Badge>
            )}
          </div>
          
          {appointment.client_phone && (
            <button
              onClick={copyPhone}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{appointment.client_phone}</span>
              {copied ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 opacity-50" />
              )}
            </button>
          )}
        </div>

        {/* Service Info */}
        <div className="flex items-start gap-2 text-sm">
          <Scissors className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{appointment.service_name || 'Service'}</p>
            {appointment.stylistName && (
              <p className="text-muted-foreground">with {appointment.stylistName}</p>
            )}
          </div>
        </div>

        {/* Price (if available) */}
        {appointment.total_price && appointment.total_price > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span>{formatCurrencyWhole(appointment.total_price)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          {variant === 'waiting' && onCheckIn && (
            <Button 
              size={tokens.button.card} 
              className="flex-1"
              onClick={onCheckIn}
              disabled={isUpdating}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Check In
            </Button>
          )}
          
          {variant === 'upcoming' && onCheckIn && (
            <Button 
              size={tokens.button.card} 
              variant="outline"
              className="flex-1"
              onClick={onCheckIn}
              disabled={isUpdating}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Check In Early
            </Button>
          )}
          
          {variant === 'inService' && onPay && (
            <Button 
              size={tokens.button.card} 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onPay}
              disabled={isUpdating}
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Pay & Checkout
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
