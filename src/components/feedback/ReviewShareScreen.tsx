/**
 * ReviewShareScreen — Public review share surface shown after feedback submit.
 *
 * Doctrine: per `shareScreenGate.ts`, this screen is offered to EVERY client
 * who has at least one public link configured — never gated by rating. To
 * avoid feeling tone-deaf for low-rating clients while still capturing the
 * full conversion lift on high-rating clients, the surface adapts via
 * `emphasis`:
 *
 *   - 'celebrate'  → operator's custom Auto-Boost copy, prominent platform CTAs
 *   - 'neutral'    → muted, optional-feeling prompt with outline CTAs
 *
 * `emphasis` is a presentational hint only. Platform link visibility is
 * identical in both modes (Non-Gating Doctrine, Reputation Engine §3 + §10).
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Copy, ExternalLink, Check, MapPin, MessageSquare, Heart } from 'lucide-react';
import { ReviewThresholdSettings, trackExternalReviewClick } from '@/hooks/useReviewThreshold';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

export type ShareScreenEmphasis = 'celebrate' | 'neutral';

interface ReviewShareScreenProps {
  settings: ReviewThresholdSettings;
  comments: string;
  feedbackToken: string;
  onSkip: () => void;
  /**
   * Adaptive presentation based on whether the client passed the operator's
   * happiness threshold. Defaults to 'neutral' to stay safe if the caller
   * forgets to wire it. NEVER controls link visibility.
   */
  emphasis?: ShareScreenEmphasis;
  /**
   * Operator-authored celebratory copy. Used as the prompt body in
   * 'celebrate' mode; ignored in 'neutral' mode.
   */
  celebrateMessage?: string;
}

export function ReviewShareScreen({
  settings,
  comments,
  feedbackToken,
  onSkip,
  emphasis = 'neutral',
  celebrateMessage,
}: ReviewShareScreenProps) {
  const [copied, setCopied] = useState(false);
  const [clickedPlatform, setClickedPlatform] = useState<string | null>(null);
  const isCelebrate = emphasis === 'celebrate';

  const handleCopyReview = async () => {
    if (!comments) {
      toast.error('No review text to copy');
      return;
    }
    await navigator.clipboard.writeText(comments);
    setCopied(true);
    await trackExternalReviewClick(feedbackToken, 'copied');
    toast.success('Review copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareTo = async (platform: 'google' | 'apple' | 'facebook') => {
    const urls: Record<string, string> = {
      google: settings.googleReviewUrl,
      apple: settings.appleReviewUrl,
      facebook: settings.facebookReviewUrl,
    };
    const url = urls[platform];
    if (!url) {
      toast.error(`${platform} review link not configured`);
      return;
    }
    if (comments) {
      await navigator.clipboard.writeText(comments);
    }
    await trackExternalReviewClick(feedbackToken, platform);
    setClickedPlatform(platform);
    window.open(url, '_blank');
    toast.info('Review copied! Paste it on the page that just opened.', {
      duration: 5000,
    });
  };

  const platformButtons = [
    {
      id: 'google',
      label: 'Google Reviews',
      url: settings.googleReviewUrl,
      icon: <span className="text-lg">🔵</span>,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'apple',
      label: 'Apple Maps',
      url: settings.appleReviewUrl,
      icon: <MapPin className="h-4 w-4" />,
      color: 'bg-gray-800 hover:bg-gray-900',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      url: settings.facebookReviewUrl,
      icon: <MessageSquare className="h-4 w-4" />,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
  ].filter((p) => p.url);

  // Headline + body copy adapt to emphasis. Links themselves do not.
  const headline = isCelebrate
    ? settings.publicReviewPromptTitle || "We're Thrilled You Loved Your Visit!"
    : 'Thanks for sharing your feedback';
  const body = isCelebrate
    ? celebrateMessage ||
      settings.publicReviewPromptMessage ||
      'Would you mind taking a moment to share your experience publicly?'
    : "We've heard you and a manager will follow up shortly. If you'd still like to leave a public review, the options are below — entirely optional.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div
                className={cn(
                  'h-16 w-16 rounded-full flex items-center justify-center',
                  isCelebrate ? 'bg-amber-100' : 'bg-muted',
                )}
              >
                {isCelebrate ? (
                  <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
                ) : (
                  <Heart className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            </div>
            <h2 className="text-2xl font-medium">{headline}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{body}</p>
          </div>

          {/* Copy Review */}
          {comments && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Your Review
                </span>
                <Button
                  variant="ghost"
                  size={tokens.button.inline}
                  onClick={handleCopyReview}
                  className="gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground italic line-clamp-4">
                "{comments}"
              </p>
            </div>
          )}

          {/* Platform Buttons — present in both modes; styling differs only */}
          {platformButtons.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                {isCelebrate
                  ? 'Share on your preferred platform:'
                  : 'Optional — share publicly if you wish:'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {platformButtons.map((platform) => (
                  <Button
                    key={platform.id}
                    variant={isCelebrate ? 'default' : 'outline'}
                    onClick={() =>
                      handleShareTo(platform.id as 'google' | 'apple' | 'facebook')
                    }
                    className={cn(
                      'gap-2',
                      isCelebrate && cn('text-white', platform.color),
                      clickedPlatform === platform.id &&
                        'ring-2 ring-offset-2 ring-primary',
                    )}
                  >
                    {platform.icon}
                    {platform.label}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Skip */}
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              {isCelebrate ? "Skip - I'll do it later" : 'No thanks, close'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
