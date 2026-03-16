import { useState } from 'react';
import { parseISO, differenceInMonths } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Calendar, Gift, CalendarCog, FileEdit, Clock } from 'lucide-react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton as Button } from '@/components/platform/ui/PlatformButton';
import { useContractAdjustments } from '@/hooks/useContractAdjustments';
import { ExtendTermDialog } from './ExtendTermDialog';
import { CompMonthsDialog } from './CompMonthsDialog';
import { ChangeDatesDialog } from './ChangeDatesDialog';

interface ContractAdjustmentsPanelProps {
  organizationId: string;
  contractStartDate: string | null;
  contractEndDate: string | null;
  monthlyRate: number;
}

export function ContractAdjustmentsPanel({
  organizationId,
  contractStartDate,
  contractEndDate,
  monthlyRate,
}: ContractAdjustmentsPanelProps) {
  const { formatDate } = useFormatDate();
  const { data: adjustments, isLoading } = useContractAdjustments(organizationId);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [datesDialogOpen, setDatesDialogOpen] = useState(false);

  const contractMonths = contractStartDate && contractEndDate
    ? differenceInMonths(parseISO(contractEndDate), parseISO(contractStartDate))
    : null;

  return (
    <>
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-violet-400" />
            Contract Adjustments
          </PlatformCardTitle>
          <PlatformCardDescription>
            Extend terms, comp months, or manually adjust contract dates
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-6">
          {/* Current Contract Info */}
          {contractStartDate && contractEndDate && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Current Contract</p>
              <p className="text-white font-medium">
                {formatDate(parseISO(contractStartDate), 'MMM d, yyyy')} → {formatDate(parseISO(contractEndDate), 'MMM d, yyyy')}
                {contractMonths !== null && (
                  <span className="text-slate-400 font-normal ml-2">
                    ({contractMonths} months)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-slate-700 hover:bg-slate-800 hover:border-violet-500/50"
              onClick={() => setExtendDialogOpen(true)}
              disabled={!contractEndDate}
            >
              <Calendar className="h-5 w-5 text-violet-400" />
              <div className="text-center">
                <p className="font-medium text-white">Extend Term</p>
                <p className="text-xs text-slate-400">Add months to end</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-slate-700 hover:bg-slate-800 hover:border-violet-500/50"
              onClick={() => setCompDialogOpen(true)}
            >
              <Gift className="h-5 w-5 text-green-400" />
              <div className="text-center">
                <p className="font-medium text-white">Comp Free Months</p>
                <p className="text-xs text-slate-400">Credit at $0 rate</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-slate-700 hover:bg-slate-800 hover:border-violet-500/50 col-span-2"
              onClick={() => setDatesDialogOpen(true)}
            >
              <CalendarCog className="h-5 w-5 text-blue-400" />
              <div className="text-center">
                <p className="font-medium text-white">Change Dates</p>
                <p className="text-xs text-slate-400">Edit start/end dates manually</p>
              </div>
            </Button>
          </div>

          {/* Recent Adjustments */}
          {!isLoading && adjustments && adjustments.length > 0 && (
            <div className="border-t border-slate-700/50 pt-4">
              <p className="text-sm font-medium text-slate-400 mb-3">Recent Adjustments</p>
              <div className="space-y-2">
                {adjustments.slice(0, 5).map((adjustment) => (
                  <div
                    key={adjustment.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Clock className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-300">
                        {formatDate(new Date(adjustment.created_at), 'MMM d')}: {adjustment.description}
                      </p>
                      <p className="text-xs text-slate-500">{adjustment.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>

      <ExtendTermDialog
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
        organizationId={organizationId}
        currentEndDate={contractEndDate}
      />

      <CompMonthsDialog
        open={compDialogOpen}
        onOpenChange={setCompDialogOpen}
        organizationId={organizationId}
        monthlyRate={monthlyRate}
      />

      <ChangeDatesDialog
        open={datesDialogOpen}
        onOpenChange={setDatesDialogOpen}
        organizationId={organizationId}
        currentStartDate={contractStartDate}
        currentEndDate={contractEndDate}
      />
    </>
  );
}
