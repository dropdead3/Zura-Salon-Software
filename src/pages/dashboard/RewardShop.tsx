import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, History, Loader2, Coins } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { RewardCard } from '@/components/points/RewardCard';
import { PointsHistoryPanel } from '@/components/points/PointsHistoryPanel';
import {
  usePointsBalance,
  useRewardsCatalog,
  useRedeemReward,
  useMyRedemptions,
} from '@/hooks/usePoints';
import { Badge } from '@/components/ui/badge';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function RewardShop() {
  const { formatDate } = useFormatDate();
  const { formatNumber } = useFormatNumber();
  const [activeTab, setActiveTab] = useState('shop');
  const [confirmRewardId, setConfirmRewardId] = useState<string | null>(null);

  const { data: balance = 0, isLoading: balanceLoading } = usePointsBalance();
  const { data: rewards = [], isLoading: rewardsLoading } = useRewardsCatalog();
  const { data: redemptions = [], isLoading: redemptionsLoading } = useMyRedemptions();
  const redeemReward = useRedeemReward();

  const confirmingReward = rewards.find((r) => r.id === confirmRewardId);

  const handleRedeem = () => {
    if (confirmRewardId) {
      redeemReward.mutate(confirmRewardId, {
        onSuccess: () => setConfirmRewardId(null),
      });
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600',
    approved: 'bg-blue-500/10 text-blue-600',
    fulfilled: 'bg-green-500/10 text-green-600',
    denied: 'bg-red-500/10 text-red-600',
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Reward Shop"
          description="Redeem your points for amazing rewards"
          actions={
            <Card className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your Balance</p>
                {balanceLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <p className="text-xl font-medium">{formatNumber(balance)}</p>
                )}
              </div>
            </Card>
          }
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="shop" className="gap-2">
              <Gift className="w-4 h-4" />
              Shop
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              My Redemptions
            </TabsTrigger>
            <TabsTrigger value="points" className="gap-2">
              <Coins className="w-4 h-4" />
              Points History
            </TabsTrigger>
          </TabsList>

          {/* Shop Tab */}
          <TabsContent value="shop" className="mt-6">
            {rewardsLoading ? (
              <DashboardLoader size="md" className="py-12" />
            ) : rewards.length === 0 ? (
              <Card className="p-12 text-center">
                <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No rewards available yet. Check back soon!
                </p>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    userBalance={balance}
                    onRedeem={setConfirmRewardId}
                    isRedeeming={
                      redeemReward.isPending && confirmRewardId === reward.id
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Redemptions Tab */}
          <TabsContent value="history" className="mt-6">
            {redemptionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : redemptions.length === 0 ? (
              <Card className="p-12 text-center">
                <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No redemptions yet. Browse the shop to redeem rewards!
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {redemptions.map((redemption) => (
                  <Card key={redemption.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {redemption.reward?.name || 'Unknown Reward'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(new Date(redemption.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          -{formatNumber(redemption.points_spent)} pts
                        </span>
                        <Badge
                          variant="secondary"
                          className={statusColors[redemption.status] || ''}
                        >
                          {redemption.status}
                        </Badge>
                      </div>
                    </div>
                    {redemption.notes && (
                      <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                        Note: {redemption.notes}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Points History Tab */}
          <TabsContent value="points" className="mt-6">
            <PointsHistoryPanel />
          </TabsContent>
        </Tabs>

        {/* Confirm Dialog */}
        <AlertDialog
          open={!!confirmRewardId}
          onOpenChange={() => setConfirmRewardId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Redemption</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmingReward && (
                  <>
                    Are you sure you want to redeem{' '}
                    <strong>{confirmingReward.name}</strong> for{' '}
                    <strong>{formatNumber(confirmingReward.points_cost)} points</strong>?
                    <br />
                    <br />
                    Your remaining balance will be{' '}
                    <strong>
                      {formatNumber(balance - confirmingReward.points_cost)} points
                    </strong>
                    .
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRedeem}>
                Confirm Redemption
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
