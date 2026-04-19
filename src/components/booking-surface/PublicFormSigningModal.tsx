import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { ServiceFormRequirement } from '@/hooks/useServiceFormRequirements';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';

interface PublicFormSigningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forms: ServiceFormRequirement[];
  theme: BookingSurfaceTheme;
  /** Pre-fill the typed-signature with the client's name for confirmation. */
  defaultSignerName?: string;
  /**
   * Called with the list of `form_template_id`s the client agreed to.
   * The actual `client_form_signatures` rows are written server-side by
   * `create-public-booking` after the visitor confirms — this modal only
   * captures intent, never writes directly (the visitor is unauthenticated
   * and RLS would block it anyway).
   */
  onComplete: (signedTemplateIds: string[]) => void;
}

/**
 * Wave 9 — Public-booking inline form signer.
 *
 * Walks the visitor through each required form (content + agree-to-terms +
 * typed name). On completion, returns the set of `form_template_id`s to the
 * caller, which forwards them to `create-public-booking`. The edge function
 * validates the claim against the actual server-side requirements before
 * inserting `client_form_signatures` rows with `collected_by = null`
 * (self-signed via public booking).
 *
 * NOTE: This is the public counterpart to the staff-side `FormSigningDialog`,
 * which writes signatures directly via the authenticated supabase client. We
 * cannot reuse that here — the visitor has no session and no client_id until
 * the appointment is created.
 */
export function PublicFormSigningModal({
  open,
  onOpenChange,
  forms,
  theme,
  defaultSignerName,
  onComplete,
}: PublicFormSigningModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [typedSignature, setTypedSignature] = useState(defaultSignerName ?? '');
  const [signedTemplateIds, setSignedTemplateIds] = useState<string[]>([]);

  const currentForm = forms[currentIndex];
  const template = currentForm?.form_template;
  const progress = useMemo(
    () => (forms.length > 0 ? (signedTemplateIds.length / forms.length) * 100 : 0),
    [signedTemplateIds.length, forms.length],
  );

  if (!currentForm || !template) return null;

  const isLast = currentIndex >= forms.length - 1;
  const canSign = agreed && typedSignature.trim().length >= 2;

  const handleSign = () => {
    const nextSigned = signedTemplateIds.includes(template.id)
      ? signedTemplateIds
      : [...signedTemplateIds, template.id];
    setSignedTemplateIds(nextSigned);

    if (isLast) {
      onComplete(nextSigned);
      onOpenChange(false);
      // Reset for next open
      setCurrentIndex(0);
      setAgreed(false);
      setTypedSignature(defaultSignerName ?? '');
      setSignedTemplateIds([]);
    } else {
      setCurrentIndex(currentIndex + 1);
      setAgreed(false);
      setTypedSignature(defaultSignerName ?? '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{template.name}</DialogTitle>
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} of {forms.length}
            </span>
          </div>
          {template.description && (
            <DialogDescription>{template.description}</DialogDescription>
          )}
          <Progress value={progress} className="h-1 mt-2" />
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4 my-2 max-h-[45vh]">
          <div
            className="text-sm whitespace-pre-wrap leading-relaxed"
            style={{ color: theme.textColor }}
          >
            {template.content}
          </div>
        </ScrollArea>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-start gap-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="agree" className="text-sm leading-snug cursor-pointer">
              I have read and agree to the terms above.
            </Label>
          </div>
          <div>
            <Label htmlFor="signature" className="text-xs text-muted-foreground">
              Type your full name to sign
            </Label>
            <Input
              id="signature"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Your full name"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {currentIndex > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCurrentIndex(currentIndex - 1);
                setAgreed(false);
                setTypedSignature(defaultSignerName ?? '');
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button type="button" onClick={handleSign} disabled={!canSign}>
            {isLast ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Sign &amp; finish
              </>
            ) : (
              <>
                Sign &amp; continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
