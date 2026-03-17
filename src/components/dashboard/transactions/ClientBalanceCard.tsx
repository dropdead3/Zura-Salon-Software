import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Gift, Plus } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useClientBalance } from '@/hooks/useClientBalances';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface ClientBalanceCardProps {
  clientId: string | null;
  showActions?: boolean;
  onIssueCredit?: () => void;
  compact?: boolean;
}

export function ClientBalanceCard({ 
  clientId, 
  showActions = false, 
  onIssueCredit,
  compact = false 
}: ClientBalanceCardProps) {
  const { data: balance, isLoading } = useClientBalance(clientId);
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card className={cn(compact && "p-3")}>
        <DashboardLoader size="sm" className="py-4" />
      </Card>
    );
  }

  const salonCredit = balance?.salon_credit_balance || 0;
  const giftCardBalance = balance?.gift_card_balance || 0;
  const hasBalance = salonCredit > 0 || giftCardBalance > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {salonCredit > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1">
            <CreditCard className="w-3 h-3" />
            {formatCurrency(salonCredit)} credit
          </Badge>
        )}
        {giftCardBalance > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1">
            <Gift className="w-3 h-3" />
            {formatCurrency(giftCardBalance)} gift card
          </Badge>
        )}
        {!hasBalance && (
          <span className="text-sm text-muted-foreground">No credits on file</span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
          {showActions && onIssueCredit && (
            <Button variant="ghost" size={tokens.button.card} onClick={onIssueCredit}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              salonCredit > 0 ? "bg-primary/10" : "bg-muted"
            )}>
              <CreditCard className={cn(
                "w-5 h-5",
                salonCredit > 0 ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Salon Credit</p>
              <p className={cn(
                "font-medium",
                salonCredit > 0 ? "text-primary" : "text-muted-foreground"
              )}>
                {formatCurrency(salonCredit)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              giftCardBalance > 0 ? "bg-amber-100 dark:bg-amber-950" : "bg-muted"
            )}>
              <Gift className={cn(
                "w-5 h-5",
                giftCardBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gift Card</p>
              <p className={cn(
                "font-medium",
                giftCardBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              )}>
                {formatCurrency(giftCardBalance)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
