/**
 * RebookDeclineReasonDialog — blocking gate that captures *why* the rebook
 * didn't happen. Cannot be dismissed without selecting a reason.
 *
 * Doctrine: structural enforcement. Force the ask.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  REBOOK_DECLINE_REASONS,
  type RebookDeclineReasonCode,
} from '@/hooks/useRebookDeclineReasons';

interface RebookDeclineReasonDialogProps {
  open: boolean;
  isSubmitting?: boolean;
  /** Confirm: passes selected code + notes (required when 'other'). Modal stays open until consumer closes. */
  onConfirm: (reasonCode: RebookDeclineReasonCode, reasonNotes: string | null) => void;
  /** Optional back action — when omitted, dialog has no escape until reason captured. */
  onBack?: () => void;
}

export function RebookDeclineReasonDialog({
  open,
  isSubmitting = false,
  onConfirm,
  onBack,
}: RebookDeclineReasonDialogProps) {
  const [reasonCode, setReasonCode] = useState<RebookDeclineReasonCode | null>(null);
  const [otherText, setOtherText] = useState('');

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setReasonCode(null);
      setOtherText('');
    }
  }, [open]);

  const isOther = reasonCode === 'other';
  const isValid =
    reasonCode !== null && (!isOther || otherText.trim().length >= 3);

  const handleConfirm = () => {
    if (!isValid || !reasonCode) return;
    const notes = isOther ? otherText.trim() : null;
    onConfirm(reasonCode, notes);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Prevent overlay/escape close — must capture reason
        if (!next && onBack) onBack();
      }}
    >
      <DialogContent
        className="max-w-md"
        hideClose
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle>Quick coaching moment</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            Capturing why helps the team improve rebook rate. No judgment — honesty is the lever.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup
            value={reasonCode}
            onValueChange={(v) => setReasonCode(v as RebookDeclineReasonCode)}
            className="space-y-2"
          >
            {REBOOK_DECLINE_REASONS.map((r) => {
              const selected = reasonCode === r.code;
              return (
                <label
                  key={r.code}
                  htmlFor={`decline-reason-${r.code}`}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                    'hover:bg-muted/50',
                    selected ? 'border-primary bg-primary/5' : 'border-border',
                    r.isLever && !selected && 'border-primary/30',
                  )}
                >
                  <RadioGroupItem
                    value={r.code}
                    id={`decline-reason-${r.code}`}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{r.label}</p>
                    {r.isLever && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Honest answer — this is the biggest lever for rebook rate.
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </RadioGroup>

          {isOther && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="decline-other-notes" className="text-xs">
                Tell us more (required)
              </Label>
              <Textarea
                id="decline-other-notes"
                placeholder="What happened?"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={isSubmitting}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
