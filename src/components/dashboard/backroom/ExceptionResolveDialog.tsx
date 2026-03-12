/**
 * ExceptionResolveDialog — Resolution workflow for backroom exceptions.
 * Captures notes and action type before resolving.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResolveException, type BackroomException } from '@/hooks/backroom/useBackroomExceptions';

interface ExceptionResolveDialogProps {
  exception: BackroomException | null;
  onClose: () => void;
}

export function ExceptionResolveDialog({ exception, onClose }: ExceptionResolveDialogProps) {
  const [notes, setNotes] = useState('');
  const resolveException = useResolveException();

  const handleResolve = () => {
    if (!exception) return;
    resolveException.mutate(
      { exceptionId: exception.id, action: 'resolved', notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setNotes('');
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={!!exception} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">
            Resolve Exception
          </DialogTitle>
        </DialogHeader>

        {exception && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="font-sans text-sm font-medium">{exception.title}</p>
              {exception.description && (
                <p className="font-sans text-xs text-muted-foreground mt-1">{exception.description}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="font-sans text-sm">Resolution notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Spoke with stylist, scale was miscalibrated"
                className="min-h-[80px] font-sans text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={resolveException.isPending}
          >
            Mark Resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
