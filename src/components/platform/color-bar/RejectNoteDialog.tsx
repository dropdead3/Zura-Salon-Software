import { useState } from 'react';
import { Dialog, PlatformDialogContent as DialogContent, DialogHeader, PlatformDialogTitle as DialogTitle, DialogFooter, PlatformDialogDescription as DialogDescription } from '@/components/platform/ui/PlatformDialog';
import { PlatformButton as Button } from '@/components/platform/ui/PlatformButton';
import { PlatformTextarea as Textarea } from '@/components/platform/ui/PlatformTextarea';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { X, Loader2 } from 'lucide-react';

interface RejectNoteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName: string;
  onConfirm: (notes: string) => void;
  isPending: boolean;
}

export function RejectNoteDialog({ open, onOpenChange, productName, onConfirm, isPending }: RejectNoteDialogProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setNotes(''); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-sans text-base flex items-center gap-2">
            <X className="w-4 h-4 text-destructive" /> Reject Price Update
          </DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Rejecting price update for <span className="font-medium text-foreground">{productName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="font-sans text-xs">Reason (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Price seems incorrect, vendor confirmed different rate..."
            className="font-sans text-sm min-h-[80px] resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-sans" disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending} className="font-sans">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
