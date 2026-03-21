import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Copy, ExternalLink, Check, MapPin, MessageSquare } from 'lucide-react';
import { ReviewThresholdSettings, trackExternalReviewClick } from '@/hooks/useReviewThreshold';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface ReviewShareScreenProps {
  settings: ReviewThresholdSettings;
  comments: string;
  feedbackToken: string;
  onSkip: () => void;
}

export function ReviewShareScreen({ 
  settings, 
  comments, 
  feedbackToken,
  onSkip 
}: ReviewShareScreenProps) {
  const [copied, setCopied] = useState(false);
  const [clickedPlatform, setClickedPlatform] = useState<string | null>(null);

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

  const handleShareTo = async (platform: 'google' | 'apple' | 'yelp' | 'facebook') => {
    const urls: Record<string, string> = {
      google: settings.googleReviewUrl,
      apple: settings.appleReviewUrl,
      yelp: settings.yelpReviewUrl,
      facebook: settings.facebookReviewUrl,
    };

    const url = urls[platform];
    if (!url) {
      toast.error(`${platform} review link not configured`);
      return;
    }

    // Copy review text first
    if (comments) {
      await navigator.clipboard.writeText(comments);
    }

    // Track the click
    await trackExternalReviewClick(feedbackToken, platform);
    setClickedPlatform(platform);

    // Open in new tab
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
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    { 
      id: 'apple', 
      label: 'Apple Maps', 
      url: settings.appleReviewUrl,
      icon: <MapPin className="h-4 w-4" />,
      color: 'bg-gray-800 hover:bg-gray-900'
    },
    { 
      id: 'yelp', 
      label: 'Yelp', 
      url: settings.yelpReviewUrl,
      icon: <span className="text-lg">🔴</span>,
      color: 'bg-red-500 hover:bg-red-600'
    },
    { 
      id: 'facebook', 
      label: 'Facebook', 
      url: settings.facebookReviewUrl,
      icon: <MessageSquare className="h-4 w-4" />,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
  ].filter(p => p.url);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
              </div>
            </div>
            <h2 className="text-2xl font-medium">
              {settings.publicReviewPromptTitle || "We're Thrilled You Loved Your Visit!"}
            </h2>
            <p className="text-muted-foreground">
              {settings.publicReviewPromptMessage || 'Would you mind taking a moment to share your experience?'}
            </p>
          </div>

          {/* Copy Review Section */}
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

          {/* Platform Buttons */}
          {platformButtons.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Share on your preferred platform:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {platformButtons.map((platform) => (
                  <Button
                    key={platform.id}
                    onClick={() => handleShareTo(platform.id as 'google' | 'apple' | 'yelp' | 'facebook')}
                    className={cn(
                      'text-white gap-2',
                      platform.color,
                      clickedPlatform === platform.id && 'ring-2 ring-offset-2 ring-primary'
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

          {/* Skip button */}
          <div className="text-center pt-2">
            <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
              Skip - I'll do it later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
