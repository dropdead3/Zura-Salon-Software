import { useNavigate } from 'react-router-dom';
import { useFormatDate } from '@/hooks/useFormatDate';
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import type { OrganizationSubscription, SubscriptionInvoice } from '@/hooks/usePlatformRevenue';

interface SubscriptionTableProps {
  subscriptions: OrganizationSubscription[];
}

interface InvoiceTableProps {
  invoices: SubscriptionInvoice[];
}

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  trialing: 'warning',
  past_due: 'error',
  cancelled: 'default',
  inactive: 'default',
};

const invoiceStatusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  paid: 'success',
  pending: 'warning',
  unpaid: 'error',
  void: 'default',
};

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export function SubscriptionTable({ subscriptions }: SubscriptionTableProps) {
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();

  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    // Sort by status priority: past_due first, then active, trialing, inactive
    const statusOrder: Record<string, number> = {
      past_due: 0,
      active: 1,
      trialing: 2,
      inactive: 3,
      cancelled: 4,
    };
    const aOrder = statusOrder[a.subscription_status || 'inactive'] ?? 5;
    const bOrder = statusOrder[b.subscription_status || 'inactive'] ?? 5;
    return aOrder - bOrder;
  });

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/50">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700/50 hover:bg-transparent">
            <TableHead className="text-slate-400">Organization</TableHead>
            <TableHead className="text-slate-400">Plan</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400">Current Period</TableHead>
            <TableHead className="text-slate-400">Billing Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSubscriptions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                No subscriptions found
              </TableCell>
            </TableRow>
          ) : (
            sortedSubscriptions.map((subscription) => (
              <TableRow 
                key={subscription.id}
                className="border-slate-700/50 hover:bg-slate-800/50 cursor-pointer"
                onClick={() => navigate(`/dashboard/platform/accounts/${subscription.id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-white">{subscription.name}</p>
                    <p className="text-sm text-slate-500">{subscription.slug}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-slate-300">
                    {tierLabels[subscription.subscription_tier || 'starter'] || 'Starter'}
                  </span>
                </TableCell>
                <TableCell>
                  <PlatformBadge variant={statusColors[subscription.subscription_status || 'inactive']}>
                    {subscription.subscription_status || 'inactive'}
                  </PlatformBadge>
                </TableCell>
                <TableCell>
                  {subscription.current_period_start && subscription.current_period_end ? (
                    <span className="text-slate-400 text-sm">
                      {formatDate(new Date(subscription.current_period_start), 'MMM d')} - {formatDate(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-slate-400">{subscription.billing_email || '—'}</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/50">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700/50 hover:bg-transparent">
            <TableHead className="text-slate-400">Organization</TableHead>
            <TableHead className="text-slate-400">Amount</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400">Date</TableHead>
            <TableHead className="text-slate-400">Period</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                No invoices found
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => (
              <TableRow 
                key={invoice.id}
                className="border-slate-700/50 hover:bg-slate-800/50 cursor-pointer"
                onClick={() => invoice.organization && navigate(`/dashboard/platform/accounts/${invoice.organization_id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-white">
                      {invoice.organization?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {invoice.organization?.slug || '—'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-white">
                    {formatCurrency(invoice.amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <PlatformBadge variant={invoiceStatusColors[invoice.status]}>
                    {invoice.status}
                  </PlatformBadge>
                </TableCell>
                <TableCell>
                  <span className="text-slate-400">
                    {formatDate(new Date(invoice.created_at), 'MMM d, yyyy')}
                  </span>
                </TableCell>
                <TableCell>
                  {invoice.period_start && invoice.period_end ? (
                    <span className="text-slate-400 text-sm">
                      {formatDate(new Date(invoice.period_start), 'MMM d')} - {formatDate(new Date(invoice.period_end), 'MMM d')}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function AtRiskTable({ subscriptions }: SubscriptionTableProps) {
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();
  
  const atRiskSubscriptions = subscriptions.filter(
    sub => sub.subscription_status === 'past_due' || sub.subscription_status === 'cancelled'
  );

  if (atRiskSubscriptions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No at-risk accounts
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/50">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700/50 hover:bg-transparent">
            <TableHead className="text-slate-400">Organization</TableHead>
            <TableHead className="text-slate-400">Issue</TableHead>
            <TableHead className="text-slate-400">Period Ends</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {atRiskSubscriptions.map((subscription) => (
            <TableRow 
              key={subscription.id}
              className="border-slate-700/50 hover:bg-slate-800/50 cursor-pointer"
              onClick={() => navigate(`/dashboard/platform/accounts/${subscription.id}`)}
            >
              <TableCell>
                <div>
                  <p className="font-medium text-white">{subscription.name}</p>
                  <p className="text-sm text-slate-500">{subscription.billing_email || '—'}</p>
                </div>
              </TableCell>
              <TableCell>
                <PlatformBadge variant={statusColors[subscription.subscription_status || 'inactive']}>
                  {subscription.subscription_status === 'past_due' ? 'Payment Failed' : 'Cancelled'}
                </PlatformBadge>
              </TableCell>
              <TableCell>
                {subscription.current_period_end ? (
                  <span className="text-slate-400">
                    {formatDate(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
