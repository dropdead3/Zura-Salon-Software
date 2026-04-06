import { useState } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CheckCircle2 } from 'lucide-react';
import { useActiveAgreement } from '@/hooks/useDayRateAgreement';
import { useCreateDayRateBooking } from '@/hooks/useDayRateBookings';
import type { BookingData } from './BookingWizard';
import { toast } from 'sonner';

interface AgreementStepProps {
  bookingData: BookingData;
  onAccept: (agreementData: { 
    agreement_signed_at: string; 
    agreement_version: string;
    booking_id: string;
  }) => void;
}

export function AgreementStep({ bookingData, onAccept }: AgreementStepProps) {
  const { data: agreement, isLoading: loadingAgreement } = useActiveAgreement();
  const createBooking = useCreateDayRateBooking();
  
  const [hasRead, setHasRead] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSign = hasRead && typedName.toLowerCase() === bookingData.stylist_name.toLowerCase();

  const handleSubmit = async () => {
    if (!canSign || !agreement) return;

    setIsSubmitting(true);
    try {
      const signedAt = new Date().toISOString();
      
      // Create the booking
      const result = await createBooking.mutateAsync({
        location_id: bookingData.location_id,
        booking_date: bookingData.booking_date,
        stylist_name: bookingData.stylist_name,
        stylist_email: bookingData.stylist_email,
        stylist_phone: bookingData.stylist_phone,
        license_number: bookingData.license_number,
        license_state: bookingData.license_state,
        business_name: bookingData.business_name,
        instagram_handle: bookingData.instagram_handle,
        amount_paid: bookingData.daily_rate,
        agreement_signed_at: signedAt,
        agreement_version: agreement.version,
      });

      onAccept({
        agreement_signed_at: signedAt,
        agreement_version: agreement.version,
        booking_id: result.id,
      });
      
      toast.success('Booking submitted successfully!');
    } catch (error) {
      console.error('Failed to create booking:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAgreement) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Agreement Not Available</h3>
        <p className="text-muted-foreground text-sm">
          The rental agreement is not available at this time.
          Please contact us to proceed with your booking.
        </p>
      </div>
    );
  }

  // Simple markdown to HTML conversion
  const formatContent = (content: string) => {
    return content
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-medium mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-medium mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-medium mt-6 mb-4">$1</h1>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="w-8 h-8 mx-auto text-primary mb-2" />
        <h3 className="font-medium">{agreement.title}</h3>
        <p className="text-xs text-muted-foreground">Version {agreement.version}</p>
      </div>

      {/* Agreement Content */}
      <ScrollArea className="h-[300px] border rounded-lg p-4 bg-muted/20">
        <div 
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatContent(agreement.content)) }}
        />
      </ScrollArea>

      {/* Acknowledgment */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="hasRead"
            checked={hasRead}
            onCheckedChange={(checked) => setHasRead(checked === true)}
          />
          <Label htmlFor="hasRead" className="text-sm leading-relaxed cursor-pointer">
            I have read and agree to the terms and conditions outlined in this 
            Day Rate Chair Rental Agreement. I understand that by typing my name 
            below, I am providing my electronic signature.
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signature">
            Type your full name to sign ({bookingData.stylist_name})
          </Label>
          <Input
            id="signature"
            placeholder={bookingData.stylist_name}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className="font-script text-lg"
            autoCapitalize="words"
          />
          {typedName && !canSign && hasRead && (
            <p className="text-xs text-destructive">
              Name must match exactly: {bookingData.stylist_name}
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Location</span>
          <span className="font-medium">{bookingData.location_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span className="font-medium">
            {new Date(bookingData.booking_date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2 mt-2">
          <span className="font-medium">Total Due</span>
          <span className="font-medium text-primary">${bookingData.daily_rate}</span>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSign || isSubmitting}
        className="w-full"
        size={tokens.button.hero}
      >
        {isSubmitting ? (
          'Submitting...'
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Sign & Submit Booking
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Payment will be collected separately. Your booking will be confirmed
        once payment is received.
      </p>
    </div>
  );
}
