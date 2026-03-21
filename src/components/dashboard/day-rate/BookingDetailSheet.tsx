import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Mail, 
  Phone, 
  Award, 
  Building2, 
  Instagram,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  Clock
} from 'lucide-react';
import { useUpdateBookingStatus, useUpdateDayRateBooking, type DayRateBooking, type DayRateBookingStatus } from '@/hooks/useDayRateBookings';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: DayRateBookingStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-primary' },
  { value: 'checked_in', label: 'Checked In', color: 'bg-blue-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-muted' },
  { value: 'no_show', label: 'No Show', color: 'bg-destructive' },
];

interface BookingDetailSheetProps {
  booking: DayRateBooking | null;
  locationName: string;
  onClose: () => void;
}

export function BookingDetailSheet({ booking, locationName, onClose }: BookingDetailSheetProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrency } = useFormatCurrency();
  const updateStatus = useUpdateBookingStatus();
  const updateBooking = useUpdateDayRateBooking();
  
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (booking) {
      setNotes(booking.notes || '');
      setHasChanges(false);
    }
  }, [booking]);

  const handleStatusChange = async (status: DayRateBookingStatus) => {
    if (!booking) return;
    await updateStatus.mutateAsync({ id: booking.id, status });
  };

  const handleSaveNotes = async () => {
    if (!booking) return;
    await updateBooking.mutateAsync({ id: booking.id, notes });
    setHasChanges(false);
  };

  if (!booking) return null;

  const bookingDate = parseISO(booking.booking_date + 'T00:00:00');
  const currentStatus = STATUS_OPTIONS.find(s => s.value === booking.status);

  return (
    <PremiumFloatingPanel open={!!booking} onOpenChange={() => onClose()} maxWidth="560px">
      <div className="p-5 pb-3 border-b border-border/40">
        <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {booking.stylist_name}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <Label>Status</Label>
          <Select value={booking.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", option.color)} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Booking Details */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Booking Details
          </h4>

          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{formatDate(bookingDate, 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-muted-foreground">Booking Date</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{locationName}</p>
                <p className="text-sm text-muted-foreground">Location</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{formatCurrency(booking.amount_paid || 0)}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.stripe_payment_id ? 'Paid' : 'Payment Pending'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Contact Info */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Contact Information
          </h4>

          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a href={`mailto:${booking.stylist_email}`} className="hover:underline">
                {booking.stylist_email}
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${booking.stylist_phone}`} className="hover:underline">
                {booking.stylist_phone}
              </a>
            </div>

            {booking.instagram_handle && (
              <div className="flex items-center gap-3">
                <Instagram className="w-4 h-4 text-muted-foreground" />
                <span>{booking.instagram_handle}</span>
              </div>
            )}

            {booking.business_name && (
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>{booking.business_name}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* License Info */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            License Information
          </h4>

          <div className="flex items-center gap-3">
            <Award className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{booking.license_number}</p>
              <p className="text-sm text-muted-foreground">{booking.license_state} License</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Agreement */}
        {booking.agreement_signed_at && (
          <>
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Agreement
              </h4>

              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Version {booking.agreement_version}</p>
                  <p className="text-sm text-muted-foreground">
                    Signed {formatDate(new Date(booking.agreement_signed_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Notes */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Admin Notes
          </h4>

          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Add notes about this booking..."
            className="min-h-[100px]"
          />

          {hasChanges && (
            <Button onClick={handleSaveNotes} size={tokens.button.card}>
              Save Notes
            </Button>
          )}
        </div>

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Created: {formatDate(new Date(booking.created_at), 'MMM d, yyyy h:mm a')}
          </div>
          {booking.updated_at !== booking.created_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Updated: {formatDate(new Date(booking.updated_at), 'MMM d, yyyy h:mm a')}
            </div>
          )}
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}
