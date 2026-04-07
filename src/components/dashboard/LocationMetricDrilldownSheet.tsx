import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { TransactionsByHourPanel } from './sales/TransactionsByHourPanel';
import { AvgTicketByStylistPanel } from './sales/AvgTicketByStylistPanel';
import { LocationTrendPanel } from './sales/LocationTrendPanel';
import { MapPin } from 'lucide-react';

export type LocationDrilldownType =
  | 'services'
  | 'products'
  | 'transactions'
  | 'avgTicket'
  | 'trend'
  | 'status';

interface LocationMetricDrilldownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: LocationDrilldownType;
  locationId: string;
  locationName: string;
  dateFrom: string;
  dateTo: string;
}

const TYPE_LABELS: Record<LocationDrilldownType, string> = {
  services: 'Services',
  products: 'Products',
  transactions: 'Transactions by Hour',
  avgTicket: 'Avg Ticket by Stylist',
  trend: 'Daily Revenue Trend',
  status: 'Status',
};

export function LocationMetricDrilldownSheet({
  open,
  onOpenChange,
  type,
  locationId,
  locationName,
  dateFrom,
  dateTo,
}: LocationMetricDrilldownSheetProps) {
  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col duration-200 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        overlayClassName="backdrop-blur-sm bg-black/60 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      >
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-base font-medium tracking-wide">
                {locationName}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{TYPE_LABELS[type]}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 min-h-0 overflow-y-auto">
          {type === 'transactions' && (
            <TransactionsByHourPanel
              isOpen={open}
              dateFrom={dateFrom}
              dateTo={dateTo}
              locationId={locationId}
            />
          )}
          {type === 'avgTicket' && (
            <AvgTicketByStylistPanel
              isOpen={open}
              dateFrom={dateFrom}
              dateTo={dateTo}
              locationId={locationId}
            />
          )}
          {type === 'trend' && (
            <LocationTrendPanel
              isOpen={open}
              dateFrom={dateFrom}
              dateTo={dateTo}
              locationId={locationId}
            />
          )}
          {type === 'status' && (
            <TransactionsByHourPanel
              isOpen={open}
              dateFrom={dateFrom}
              dateTo={dateTo}
              locationId={locationId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
