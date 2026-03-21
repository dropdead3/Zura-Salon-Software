import { CheckCircle2, Calendar, MapPin, Clock, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BookingData } from './BookingWizard';
import { format, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';

interface ConfirmationStepProps {
  bookingData: BookingData;
  onNewBooking: () => void;
}

export function ConfirmationStep({ bookingData, onNewBooking }: ConfirmationStepProps) {
  const { formatDate } = useFormatDate();
  const bookingDate = parseISO(bookingData.booking_date + 'T00:00:00');

  const generateICSFile = () => {
    const startDate = format(bookingDate, "yyyyMMdd");
    const endDate = format(bookingDate, "yyyyMMdd");
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Day Rate Booking//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
SUMMARY:Day Rate Chair Rental - ${bookingData.location_name}
DESCRIPTION:Chair rental at ${bookingData.location_name}. Address: ${bookingData.location_address}
LOCATION:${bookingData.location_address}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `day-rate-booking-${bookingData.booking_date}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
      </div>

      {/* Heading */}
      <div>
        <h2 className="text-xl font-display tracking-wide mb-2">
          BOOKING SUBMITTED
        </h2>
        <p className="text-muted-foreground">
          Thank you, {bookingData.stylist_name.split(' ')[0]}! Your booking request has been received.
        </p>
      </div>

      {/* Status Notice */}
      <Card className="bg-amber-500/10 border-amber-500/20 p-4">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          <strong>Status: Pending Confirmation</strong>
          <br />
          Your booking will be confirmed once payment is processed. 
          We'll contact you shortly with payment instructions.
        </p>
      </Card>

      {/* Booking Details */}
      <Card className="p-4 text-left space-y-4">
        <h3 className="font-medium text-center">Booking Details</h3>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{bookingData.location_name}</p>
              <p className="text-sm text-muted-foreground">{bookingData.location_address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                {formatDate(bookingDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">Full Day Rental</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Operating Hours</p>
              <p className="text-sm text-muted-foreground">
                Please arrive within 30 minutes of opening
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount Due</span>
            <span className="text-xl font-medium">${bookingData.daily_rate}</span>
          </div>
        </div>
      </Card>

      {/* What to Bring */}
      <Card className="p-4 text-left">
        <h3 className="font-medium mb-3">What to Bring</h3>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Valid cosmetology license (physical or digital copy)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Your own tools and products
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Cape and towels for your clients
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Business cards (optional)
          </li>
        </ul>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button onClick={generateICSFile} variant="outline" className="w-full">
          <Download className="w-4 h-4 mr-2" />
          Add to Calendar
        </Button>

        <Button onClick={onNewBooking} variant="ghost" className="w-full">
          Book Another Day
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Confirmation Email Notice */}
      <p className="text-xs text-muted-foreground">
        A confirmation email has been sent to {bookingData.stylist_email}
      </p>
    </div>
  );
}
