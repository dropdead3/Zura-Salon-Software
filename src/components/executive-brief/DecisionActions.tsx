import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, PenLine, Clock, Loader2 } from 'lucide-react';
import { useDecideOnRecommendation, type LeverRecommendation } from '@/hooks/useLeverRecommendations';
import { tokens } from '@/lib/design-tokens';

interface DecisionActionsProps {
  recommendation: LeverRecommendation;
}

type DecisionType = 'approved' | 'declined' | 'modified' | 'snoozed';

export function DecisionActions({ recommendation }: DecisionActionsProps) {
  const decide = useDecideOnRecommendation();
  const [dialogType, setDialogType] = useState<DecisionType | null>(null);
  const [notes, setNotes] = useState('');
  const [modifiedAction, setModifiedAction] = useState('');

  const handleQuickAction = (status: 'approved' | 'snoozed') => {
    decide.mutate({ id: recommendation.id, status });
  };

  const handleSubmitDecision = () => {
    if (!dialogType) return;
    decide.mutate({
      id: recommendation.id,
      status: dialogType,
      notes: notes || undefined,
      modifiedAction: dialogType === 'modified' ? modifiedAction || undefined : undefined,
    });
    setDialogType(null);
    setNotes('');
    setModifiedAction('');
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size={tokens.button.card}
          className="gap-1.5"
          onClick={() => handleQuickAction('approved')}
          disabled={decide.isPending}
        >
          {decide.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Approve
        </Button>
        <Button
          variant="outline"
          size={tokens.button.card}
          className="gap-1.5"
          onClick={() => setDialogType('modified')}
        >
          <PenLine className="h-3.5 w-3.5" />
          Modify
        </Button>
        <Button
          variant="outline"
          size={tokens.button.card}
          className="gap-1.5"
          onClick={() => setDialogType('declined')}
        >
          <XCircle className="h-3.5 w-3.5" />
          Decline
        </Button>
        <Button
          variant="ghost"
          size={tokens.button.card}
          className="gap-1.5"
          onClick={() => handleQuickAction('snoozed')}
          disabled={decide.isPending}
        >
          <Clock className="h-3.5 w-3.5" />
          Snooze
        </Button>
      </div>

      {/* Modify / Decline dialog */}
      <Dialog open={!!dialogType && dialogType !== 'approved' && dialogType !== 'snoozed'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'modified' ? 'Modify Recommendation' : 'Decline Recommendation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {dialogType === 'modified' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">What will you do instead?</label>
                <Textarea
                  value={modifiedAction}
                  onChange={e => setModifiedAction(e.target.value)}
                  placeholder="Describe the modified action..."
                  rows={3}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {dialogType === 'declined' ? 'Reason for declining' : 'Notes (optional)'}
              </label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={dialogType === 'declined' ? 'Why is this not the right lever?' : 'Any additional context...'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Cancel</Button>
            <Button onClick={handleSubmitDecision} disabled={decide.isPending}>
              {decide.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
