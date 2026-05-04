/**
 * ShareReviewDialog — "Share this review with your followers" modal.
 * Mirrors Phorest's share affordance: Facebook share intent + copy-to-clipboard.
 * Pure presentational; no DB writes.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Copy, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';

export interface ShareableReview {
  rating: number | null;
  comments: string | null;
  clientFirstName: string | null;
  staffName: string | null;
  serviceLabel: string | null;
  date: string | null;
}

interface ShareReviewDialogProps {
  review: ShareableReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatShareText(r: ShareableReview): string {
  const stars = r.rating ? '★'.repeat(r.rating) : '';
  const sig = r.clientFirstName ? `\n\n— ${r.clientFirstName}` : '';
  return `${stars}\n\n"${r.comments ?? ''}"${sig}`.trim();
}

export function ShareReviewDialog({ review, open, onOpenChange }: ShareReviewDialogProps) {
  if (!review) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatShareText(review));
    toast.success('Review copied to clipboard');
  };

  const handleFacebook = () => {
    const text = encodeURIComponent(formatShareText(review));
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=626,height=436');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">
            Share this review with your followers
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-1">
            {review.rating != null && (
              <>
                <span className={tokens.kpi.value + ' text-2xl mr-2'}>{review.rating}</span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${s <= (review.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </>
            )}
          </div>
          {review.comments && (
            <p className="text-sm text-foreground leading-relaxed">"{review.comments}"</p>
          )}
          {review.clientFirstName && (
            <p className="text-xs text-muted-foreground">— {review.clientFirstName}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {review.date && <Badge variant="outline" className="text-xs">{review.date}</Badge>}
            {review.staffName && <Badge variant="outline" className="text-xs">{review.staffName}</Badge>}
            {review.serviceLabel && (
              <Badge variant="outline" className="text-xs">{review.serviceLabel}</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" onClick={handleFacebook} className="gap-2">
            <Facebook className="h-4 w-4" /> Facebook
          </Button>
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            <Copy className="h-4 w-4" /> Copy Text
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
