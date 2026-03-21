import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Star, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useFeedbackByToken, useSubmitFeedback } from '@/hooks/useFeedbackSurveys';
import { useReviewThresholdSettings, checkPassesReviewGate, checkBelowFollowUpThreshold } from '@/hooks/useReviewThreshold';
import { ReviewShareScreen } from '@/components/feedback/ReviewShareScreen';
import { ReviewThankYouScreen } from '@/components/feedback/ReviewThankYouScreen';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

function StarRatingInput({ 
  value, 
  onChange, 
  label 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  label: string;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-1 transition-transform hover:scale-110"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
          >
            <Star 
              className={cn(
                'h-8 w-8 transition-colors',
                (hovered || value) >= star 
                  ? 'fill-amber-400 text-amber-400' 
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function NPSInput({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        How likely are you to recommend us to a friend? (0-10)
      </Label>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              'w-10 h-10 rounded-lg font-medium transition-all border',
              value === score 
                ? score >= 9 
                  ? 'bg-green-500 text-white border-green-500'
                  : score >= 7
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-red-500 text-white border-red-500'
                : 'bg-background hover:bg-muted border-input'
            )}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Not at all likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );
}

type SubmissionState = 'form' | 'share' | 'thankyou';

export default function ClientFeedback() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const { data: feedback, isLoading, error } = useFeedbackByToken(token || undefined);
  const { data: thresholdSettings } = useReviewThresholdSettings();
  const submitFeedback = useSubmitFeedback();

  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [serviceQuality, setServiceQuality] = useState(0);
  const [staffFriendliness, setStaffFriendliness] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comments, setComments] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>('form');
  const [passedGate, setPassedGate] = useState(false);
  const [showManagerFollowUp, setShowManagerFollowUp] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Invalid feedback link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">This feedback link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (feedback.responded_at) {
    return <ReviewThankYouScreen showManagerFollowUp={false} />;
  }

  // Show share screen for happy customers
  if (submissionState === 'share' && thresholdSettings) {
    return (
      <ReviewShareScreen
        settings={thresholdSettings}
        comments={comments}
        feedbackToken={token}
        onSkip={() => setSubmissionState('thankyou')}
      />
    );
  }

  // Show thank you screen
  if (submissionState === 'thankyou') {
    return <ReviewThankYouScreen showManagerFollowUp={showManagerFollowUp} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine if passes review gate
    const passes = thresholdSettings 
      ? checkPassesReviewGate(thresholdSettings, overallRating, npsScore)
      : false;
    
    const belowThreshold = thresholdSettings
      ? checkBelowFollowUpThreshold(thresholdSettings, overallRating)
      : false;
    
    setPassedGate(passes);
    setShowManagerFollowUp(belowThreshold);

    await submitFeedback.mutateAsync({
      token,
      npsScore: npsScore ?? undefined,
      overallRating: overallRating || undefined,
      serviceQuality: serviceQuality || undefined,
      staffFriendliness: staffFriendliness || undefined,
      cleanliness: cleanliness || undefined,
      wouldRecommend: wouldRecommend ?? undefined,
      comments: comments || undefined,
      isPublic,
    });

    // Update with gate status
    await supabase
      .from('client_feedback_responses')
      .update({ passed_review_gate: passes })
      .eq('token', token);

    // If low score, trigger manager notification
    if (belowThreshold && thresholdSettings?.privateFollowUpEnabled) {
      try {
        await supabase.functions.invoke('notify-low-score', {
          body: { token }
        });
      } catch (err) {
        console.error('Failed to notify manager:', err);
      }
    }

    // Route to appropriate screen
    if (passes && (thresholdSettings?.googleReviewUrl || thresholdSettings?.appleReviewUrl)) {
      setSubmissionState('share');
    } else {
      setSubmissionState('thankyou');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">How Was Your Visit?</CardTitle>
            <CardDescription>
              We'd love to hear about your experience. Your feedback helps us improve!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* NPS Score */}
            <NPSInput value={npsScore} onChange={setNpsScore} />

            {/* Overall Rating */}
            <StarRatingInput 
              label="Overall Experience" 
              value={overallRating} 
              onChange={setOverallRating} 
            />

            {/* Service Quality */}
            <StarRatingInput 
              label="Service Quality" 
              value={serviceQuality} 
              onChange={setServiceQuality} 
            />

            {/* Staff Friendliness */}
            <StarRatingInput 
              label="Staff Friendliness" 
              value={staffFriendliness} 
              onChange={setStaffFriendliness} 
            />

            {/* Cleanliness */}
            <StarRatingInput 
              label="Cleanliness" 
              value={cleanliness} 
              onChange={setCleanliness} 
            />

            {/* Would Recommend */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Would you visit us again?</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={wouldRecommend === true ? 'default' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => setWouldRecommend(true)}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={wouldRecommend === false ? 'destructive' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => setWouldRecommend(false)}
                >
                  <ThumbsDown className="h-4 w-4" />
                  No
                </Button>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Tell us more about your experience..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
              />
            </div>

            {/* Public Review */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public">Share publicly</Label>
                <p className="text-xs text-muted-foreground">
                  Allow us to display your feedback on our website
                </p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={submitFeedback.isPending}
        >
          {submitFeedback.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </Button>
      </form>
    </div>
  );
}
