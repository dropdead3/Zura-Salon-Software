import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { CreditCard, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrgPaymentInfo, useOpenBillingPortal } from '@/hooks/useOrgPaymentInfo';

const BRAND_ICONS: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
};

function getExpiryStatus(exp_month: number, exp_year: number): 'valid' | 'expiring' | 'expired' {
  const now = new Date();
  const expiryDate = new Date(exp_year, exp_month); // first day of month after expiry
  const warningDate = new Date(now.getFullYear(), now.getMonth() + 2);
  
  if (expiryDate <= now) return 'expired';
  if (expiryDate <= warningDate) return 'expiring';
  return 'valid';
}

export function PaymentMethodCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data, isLoading } = useOrgPaymentInfo(orgId);
  const openPortal = useOpenBillingPortal();

  const pm = data?.payment_method;
  const expiryStatus = pm ? getExpiryStatus(pm.exp_month, pm.exp_year) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Payment Method</CardTitle>
              <CardDescription>Card on file for recurring billing</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => orgId && openPortal.mutate(orgId)}
            disabled={openPortal.isPending || !orgId}
          >
            {openPortal.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Update
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : pm ? (
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/60">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{BRAND_ICONS[pm.brand] || '💳'}</span>
              <div>
                <p className="font-sans text-sm text-foreground">
                  {pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} ···· {pm.last4}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {String(pm.exp_month).padStart(2, '0')}/{pm.exp_year}
                </p>
              </div>
            </div>
            {expiryStatus === 'expired' && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Expired
              </Badge>
            )}
            {expiryStatus === 'expiring' && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/10 gap-1">
                <AlertTriangle className="w-3 h-3" />
                Expiring Soon
              </Badge>
            )}
            {expiryStatus === 'valid' && (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-500/10">
                Active
              </Badge>
            )}
          </div>
        ) : (
          <div className={tokens.empty.container}>
            <CreditCard className={tokens.empty.icon} />
            <p className={tokens.empty.description}>No payment method on file</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => orgId && openPortal.mutate(orgId)}
              disabled={openPortal.isPending || !orgId}
            >
              Add Payment Method
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
