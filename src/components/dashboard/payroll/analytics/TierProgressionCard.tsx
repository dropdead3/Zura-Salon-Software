import { TrendingUp, Sparkles, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { TierProgressionOpportunity, CommissionImpactAnalysis } from '@/hooks/useTierDistribution';

interface TierProgressionCardProps {
  opportunities: TierProgressionOpportunity[];
  impactAnalysis: CommissionImpactAnalysis;
  isLoading: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TierProgressionCard({ opportunities, impactAnalysis, isLoading }: TierProgressionCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Tier Progression Opportunities
          <MetricInfoTooltip description="Identifies stylists close to reaching a higher commission tier. Shows the revenue gap remaining and projected timeline based on their current pace." />
        </CardTitle>
        <CardDescription>
          {opportunities.length > 0 
            ? `${opportunities.length} stylists are close to unlocking higher commission rates`
            : 'No employees are currently near a tier threshold')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>All team members are either at their target tier or have more ground to cover.</p>
          </div>
        ) : (
          <>
            {opportunities.slice(0, 5).map((opp) => (
              <div 
                key={opp.employeeId} 
                className="p-4 rounded-lg border bg-gradient-to-r from-amber-500/5 to-transparent"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={opp.photoUrl || undefined} />
                    <AvatarFallback>
                      {opp.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{opp.employeeName}</p>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        +{(opp.rateIncrease * 100).toFixed(0)}% rate
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <span>{opp.currentTier}</span>
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-medium text-foreground">{opp.nextTier}</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{opp.progressPercent.toFixed(1)}% complete</span>
                        <span className="font-medium text-amber-600">
                          {formatCurrency(opp.amountNeeded)} more needed
                        </span>
                      </div>
                      <Progress value={opp.progressPercent} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Impact Analysis Summary */}
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Commission Impact Analysis</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Period</p>
                  <p className="text-lg font-medium">{formatCurrency(impactAnalysis.currentPeriodCommissions)}</p>
                  <p className="text-xs text-muted-foreground">in commissions</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">If All Hit Next Tier</p>
                  <p className="text-lg font-medium text-success-foreground">
                    +{formatCurrency(impactAnalysis.potentialAdditional)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({impactAnalysis.potentialIncreasePercent.toFixed(1)}% increase)
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Additional revenue needed: <span className="font-medium">{formatCurrency(impactAnalysis.revenueNeeded)}</span>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
