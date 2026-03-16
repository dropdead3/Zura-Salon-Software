import { useState, useMemo } from 'react';
import { format, parseISO, addMonths } from 'date-fns';
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
import { useExtendTerm } from '@/hooks/useContractAdjustments';

interface ExtendTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  currentEndDate: string | null;
}

export function ExtendTermDialog({
  open,
  onOpenChange,
  organizationId,
  currentEndDate,
}: ExtendTermDialogProps) {
  const [monthsToAdd, setMonthsToAdd] = useState(1);
  const [reason, setReason] = useState('');
  const extendTerm = useExtendTerm();

  const newEndDate = useMemo(() => {
    if (!currentEndDate) return null;
    return addMonths(parseISO(currentEndDate), monthsToAdd);
  }, [currentEndDate, monthsToAdd]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || monthsToAdd < 1) return;

    extendTerm.mutate(
      {
        organizationId,
        monthsToAdd,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setMonthsToAdd(1);
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
          <DialogTitle>Extend Contract Term</DialogTitle>
          <DialogDescription>
            Add months to the end of the current contract.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentEndDate && (
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-400">Current End Date</p>
              <p className="text-white font-medium">
                {format(parseISO(currentEndDate), 'MMMM d, yyyy')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="months" className="text-slate-300">Months to Add</Label>
            <Input
              id="months"
              type="number"
              min={1}
              max={24}
              value={monthsToAdd}
              onChange={(e) => setMonthsToAdd(parseInt(e.target.value, 10) || 1)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {newEndDate && (
            <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/30">
              <p className="text-sm text-violet-300">New End Date</p>
              <p className="text-white font-medium">
                {format(newEndDate, 'MMMM d, yyyy')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-300">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Loyalty bonus for 3-year client"
              className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              This will be logged in the billing audit trail.
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
              disabled={!reason.trim() || monthsToAdd < 1 || extendTerm.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {extendTerm.isPending ? 'Extending...' : 'Extend Contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
