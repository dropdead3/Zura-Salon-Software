import { useState } from 'react';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
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
import { useChangeDates } from '@/hooks/useContractAdjustments';

interface ChangeDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  currentStartDate: string | null;
  currentEndDate: string | null;
}

export function ChangeDatesDialog({
  open,
  onOpenChange,
  organizationId,
  currentStartDate,
  currentEndDate,
}: ChangeDatesDialogProps) {
  const { formatDate } = useFormatDate();
  const [newStartDate, setNewStartDate] = useState(currentStartDate || '');
  const [newEndDate, setNewEndDate] = useState(currentEndDate || '');
  const [reason, setReason] = useState('');
  const changeDates = useChangeDates();

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setNewStartDate(currentStartDate || '');
      setNewEndDate(currentEndDate || '');
      setReason('');
    }
    onOpenChange(isOpen);
  };

  const hasChanges = newStartDate !== currentStartDate || newEndDate !== currentEndDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !hasChanges) return;

    changeDates.mutate(
      {
        organizationId,
        newStartDate: newStartDate !== currentStartDate ? newStartDate : undefined,
        newEndDate: newEndDate !== currentEndDate ? newEndDate : undefined,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setReason('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Contract Dates</DialogTitle>
          <DialogDescription>
            Manually adjust the contract start and/or end dates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current dates display */}
          <div className="grid grid-cols-2 gap-3">
            {currentStartDate && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <p className="text-xs text-slate-500">Current Start</p>
                <p className="text-sm text-slate-300">
                  {formatDate(parseISO(currentStartDate), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            {currentEndDate && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <p className="text-xs text-slate-500">Current End</p>
                <p className="text-sm text-slate-300">
                  {formatDate(parseISO(currentEndDate), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-slate-300">New Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-slate-300">New End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-300">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Correcting date entry error"
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
              disabled={!reason.trim() || !hasChanges || changeDates.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {changeDates.isPending ? 'Updating...' : 'Update Dates'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
