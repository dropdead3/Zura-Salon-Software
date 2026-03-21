import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Gift, AlertCircle } from 'lucide-react';
import { useClientPortalByToken } from '@/hooks/useClientPortalData';
import { TierProgressCard } from '@/components/client-portal/TierProgressCard';
import { PointsActivityFeed } from '@/components/client-portal/PointsActivityFeed';

export default function ClientPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const { data, isLoading, error } = useClientPortalByToken(token || undefined);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Invalid rewards portal link</p>
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

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'This link is invalid or has expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { client, loyalty, tiers, pointsHistory } = data;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Gift className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-medium">Your Rewards</h1>
          </div>
          <p className="text-muted-foreground">
            Welcome back, {client.name}!
          </p>
        </div>

        {/* Tier Progress */}
        {loyalty && tiers.length > 0 ? (
          <TierProgressCard
            currentTier={loyalty.tier || 'bronze'}
            currentPoints={loyalty.current_points}
            lifetimePoints={loyalty.lifetime_points}
            tiers={tiers}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Start earning rewards on your next visit!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Points History */}
        <PointsActivityFeed transactions={pointsHistory} />

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          Points and rewards are subject to our terms and conditions. 
          Contact us for any questions about your rewards.
        </p>
      </div>
    </div>
  );
}
