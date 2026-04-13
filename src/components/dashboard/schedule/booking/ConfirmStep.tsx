import { Button } from '@/components/ui/button';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { RecurrenceSelector, type RecurrenceRule } from './RecurrenceSelector';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Scissors, 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign,
  Loader2,
  StickyNote,
  Info,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { PhorestClient } from './BookingWizard';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  requires_deposit?: boolean;
  deposit_type?: string;
  deposit_amount?: number | null;
  require_card_on_file?: boolean;
}

interface ConfirmStepProps {
  client: PhorestClient | null;
  services: Service[];
  stylistName: string;
  date: Date;
  time: string;
  totalDuration: number;
  totalPrice: number;
  notes: string;
  onNotesChange: (notes: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
  locationName: string;
  recurrenceRule?: RecurrenceRule | null;
  onRecurrenceChange?: (rule: RecurrenceRule | null) => void;
}

export function ConfirmStep({
  client,
  services,
  stylistName,
  date,
  time,
  totalDuration,
  totalPrice,
  notes,
  onNotesChange,
  onConfirm,
  isLoading,
  locationName,
  recurrenceRule,
  onRecurrenceChange,
}: ConfirmStepProps) {
  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const formatTime12h = (t: string) => {
    const [hours, minutes] = t.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Client Card */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {client?.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{client?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {client?.phone || client?.email || 'No contact info'}
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider">
              Appointment Details
            </h3>

            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {/* Location */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div className="font-medium text-sm">{locationName}</div>
                </div>
              </div>

              {/* Stylist */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Stylist</div>
                  <div className="font-medium text-sm">{stylistName}</div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Date & Time</div>
                  <div className="font-medium text-sm">
                    {formatDate(date, 'EEEE, MMMM d, yyyy')} at {formatTime12h(time)}
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                  <div className="font-medium text-sm">
                    {formatMinutesToDuration(totalDuration)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider">
              Services
            </h3>
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Scissors className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{service.name}</div>
                      <div className="text-xs text-muted-foreground">{service.duration_minutes} min</div>
                    </div>
                  </div>
                  {service.price !== null && (
                    <span className="font-medium text-sm">{formatCurrencyWhole(service.price)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Deposit & Card-on-File Badges */}
          {services.some(s => s.requires_deposit || s.require_card_on_file) && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {services.filter(s => s.requires_deposit).map(s => (
                  <Badge key={s.id} variant="outline" className="text-xs text-amber-700 dark:text-amber-300 border-amber-300">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Deposit: {s.deposit_type === 'flat' ? `$${s.deposit_amount}` : s.deposit_type === 'full_prepay' ? 'Full Prepay' : `${s.deposit_amount}%`}
                  </Badge>
                ))}
                {services.some(s => s.require_card_on_file) && (
                  <Badge variant="outline" className="text-xs text-blue-700 dark:text-blue-300 border-blue-300">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Card On File Required
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                Deposits will be collected at time of service or via the terminal.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider">
                Notes (optional)
              </h3>
            </div>
            <Textarea
              placeholder="Add any special requests or notes..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="min-h-[80px] resize-none bg-muted/50 border-0"
            />
          </div>

          {/* Recurrence */}
          {onRecurrenceChange && (
            <div className="space-y-3">
              <Separator />
              <RecurrenceSelector
                value={recurrenceRule ?? null}
                onChange={onRecurrenceChange}
                startDate={date}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with total and confirm */}
      <div className="p-4 border-t border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Estimated Total</span>
          <span className="text-xl font-medium">{formatCurrency(totalPrice)}</span>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground/70">
            Any discounts or promotions will be calculated at checkout.
          </p>
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-muted-foreground/70">
              Exact price may vary after overages & adjustments.
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground/50 cursor-help hover:text-muted-foreground transition-colors shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                <p>Price may change due to product overages, timing adjustments, or additional services added during the appointment.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <Button
          className="w-full h-12 text-base font-medium"
          disabled={isLoading}
          onClick={onConfirm}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Booking...
            </>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>
    </div>
  );
}
