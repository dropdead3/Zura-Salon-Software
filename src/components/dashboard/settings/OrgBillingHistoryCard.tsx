import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Receipt, Download, Loader2 } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrgPaymentInfo } from '@/hooks/useOrgPaymentInfo';
import { formatCurrency } from '@/hooks/useBillingCalculations';

const STATUS_STYLES: Record<string, string> = {
  paid: 'border-emerald-500/50 text-emerald-600 bg-emerald-500/10',
  open: 'border-amber-500/50 text-amber-600 bg-amber-500/10',
  draft: 'border-muted-foreground/50 text-muted-foreground bg-muted/50',
  uncollectible: 'border-destructive/50 text-destructive bg-destructive/10',
  void: 'border-muted-foreground/50 text-muted-foreground bg-muted/50',
};

export function OrgBillingHistoryCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data, isLoading } = useOrgPaymentInfo(orgId);

  const invoices = data?.invoices || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Billing History</CardTitle>
            <CardDescription>Recent invoices and payments</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : invoices.length === 0 ? (
          <div className={tokens.empty.container}>
            <Receipt className={tokens.empty.icon} />
            <p className={tokens.empty.description}>No invoices yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-sans text-sm text-foreground truncate">
                      {inv.number || 'Draft Invoice'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.date ? new Date(inv.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-sans text-sm text-foreground">
                    {formatCurrency(inv.amount)}
                  </span>
                  <Badge variant="outline" className={STATUS_STYLES[inv.status || 'draft'] || STATUS_STYLES.draft}>
                    {inv.status || 'draft'}
                  </Badge>
                  {inv.pdf_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
