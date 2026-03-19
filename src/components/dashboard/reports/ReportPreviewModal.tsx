import { useFormatDate } from '@/hooks/useFormatDate';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { cn } from '@/lib/utils';

export interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string;
  dateFrom: string;
  dateTo: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Modal that shows a report preview with branded header (org name, title, date range)
 * and a body slot. Use for "Preview" before downloading PDF/CSV.
 */
export function ReportPreviewModal({
  open,
  onOpenChange,
  reportTitle,
  dateFrom,
  dateTo,
  children,
  className,
}: ReportPreviewModalProps) {
  const { formatDate } = useFormatDate();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const orgName = effectiveOrganization?.name ?? 'Organization';
  const logoUrl = businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null;
  const dateRange = `${formatDate(new Date(dateFrom), 'MMM d, yyyy')} – ${formatDate(new Date(dateTo), 'MMM d, yyyy')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('max-w-4xl max-h-[90vh] overflow-hidden flex flex-col', className)}
        aria-describedby="report-preview-description"
      >
        <DialogHeader className="border-b pb-4 space-y-1">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`${orgName} logo`}
                className="h-8 w-auto max-w-[160px] object-contain"
              />
            )}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {orgName}
            </p>
          </div>
          <DialogTitle className="text-lg">{reportTitle}</DialogTitle>
          <DialogDescription id="report-preview-description">
            {dateRange} · Generated on {formatDate(new Date(), 'MMM d, yyyy h:mm a')}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 py-4 pr-2 -mr-2">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
