import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReviewThankYouScreenProps {
  showManagerFollowUp?: boolean;
}

export function ReviewThankYouScreen({ showManagerFollowUp = false }: ReviewThankYouScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 space-y-6 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Heart className="h-8 w-8 text-green-600" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-medium">
              Thank You for Your Honest Feedback
            </h2>
            <p className="text-muted-foreground">
              Your feedback is incredibly valuable to us and helps us improve.
            </p>
          </div>

          {showManagerFollowUp && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                We're sorry your visit wasn't perfect. Your feedback has been shared with our management team, 
                and someone will reach out to you shortly to make things right.
              </p>
            </div>
          )}

          {/* Return button */}
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Return Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
