import { useState, useMemo } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  PlatformDialogDescription as DialogDescription,
  DialogFooter,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
} from '@/components/platform/ui/PlatformDialog';
import { PlatformButton as Button } from '@/components/platform/ui/PlatformButton';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { PlatformTextarea } from '@/components/platform/ui/PlatformTextarea';
import { useCompMonths } from '@/hooks/useContractAdjustments';

interface CompMonthsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  monthlyRate: number;
}

export function CompMonthsDialog({
  open,
  onOpenChange,
  organizationId,
  monthlyRate,
}: CompMonthsDialogProps) {
  const [monthsToComp, setMonthsToComp] = useState(1);
  const [reason, setReason] = useState('');
  const compMonths = useCompMonths();
  const { formatCurrency } = useFormatCurrency();

  const compValue = useMemo(() => {
    return monthsToComp * monthlyRate;
  }, [monthsToComp, monthlyRate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || monthsToComp < 1) return;

    compMonths.mutate(
      {
        organizationId,
        monthsToComp,
        monthlyRate,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setMonthsToComp(1);
          setReason('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comp Free Months</DialogTitle>
          <DialogDescription>
            Add complimentary months to extend the contract at no charge.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="months" className="text-slate-300">Months to Comp</Label>
            <Input
              id="months"
              type="number"
              min={1}
              max={12}
              value={monthsToComp}
              onChange={(e) => setMonthsToComp(parseInt(e.target.value, 10) || 1)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm text-green-300">Credit Value</p>
            <p className="text-white font-medium text-lg">
              {formatCurrency(compValue)}
            </p>
            <p className="text-xs text-green-400/70">
              Based on {formatCurrency(monthlyRate)}/month × {monthsToComp} month{monthsToComp > 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-300">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Service outage compensation - Ticket #4521"
              className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              This extends the contract term by {monthsToComp} month{monthsToComp > 1 ? 's' : ''} and will be logged in the billing audit trail.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!reason.trim() || monthsToComp < 1 || compMonths.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {compMonths.isPending ? 'Applying...' : 'Apply Credit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
