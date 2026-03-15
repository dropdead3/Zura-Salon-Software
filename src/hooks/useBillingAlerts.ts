import { useMemo } from 'react';
import { useTrialStatus } from './useTrialStatus';
import { useOrgPaymentInfo, useOpenBillingPortal } from './useOrgPaymentInfo';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationBilling } from './useOrganizationBilling';

export type AlertSeverity = 'amber' | 'red';

export interface BillingAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  ctaLabel: string;
  ctaAction: 'open-portal' | 'scroll-plans';
}

function getCardExpiryAlerts(
  paymentMethod: { exp_month: number; exp_year: number } | null | undefined,
): BillingAlert[] {
  if (!paymentMethod) return [];

  const now = new Date();
  const expiryDate = new Date(paymentMethod.exp_year, paymentMethod.exp_month); // first of month after expiry
  const warningDate = new Date(now.getFullYear(), now.getMonth() + 2);

  if (expiryDate <= now) {
    return [{
      id: 'card-expired',
      severity: 'red',
      title: 'Payment method expired',
      description: `Your card ending in •••• expired ${String(paymentMethod.exp_month).padStart(2, '0')}/${paymentMethod.exp_year}. Update it to avoid service interruption.`,
      ctaLabel: 'Update Card',
      ctaAction: 'open-portal',
    }];
  }

  if (expiryDate <= warningDate) {
    return [{
      id: 'card-expiring',
      severity: 'amber',
      title: 'Card expiring soon',
      description: `Your card expires ${String(paymentMethod.exp_month).padStart(2, '0')}/${paymentMethod.exp_year}. Update your payment method to prevent billing issues.`,
      ctaLabel: 'Update Card',
      ctaAction: 'open-portal',
    }];
  }

  return [];
}

export function useBillingAlerts(): { alerts: BillingAlert[]; isLoading: boolean } {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const trialStatus = useTrialStatus();
  const { data: paymentInfo, isLoading: isPaymentLoading } = useOrgPaymentInfo(orgId);
  const { data: billing, isLoading: isBillingLoading } = useOrganizationBilling(orgId);

  const alerts = useMemo(() => {
    const result: BillingAlert[] = [];

    // 1. Trial ending alerts
    if (trialStatus.isInTrial && trialStatus.daysRemaining !== null) {
      if (trialStatus.daysRemaining <= 7) {
        result.push({
          id: 'trial-ending',
          severity: trialStatus.daysRemaining <= 2 ? 'red' : 'amber',
          title: trialStatus.daysRemaining <= 1
            ? 'Trial ends today'
            : `Trial ends in ${trialStatus.daysRemaining} days`,
          description: 'Choose a plan to continue using all features without interruption.',
          ctaLabel: 'Choose a Plan',
          ctaAction: 'scroll-plans',
        });
      }
    }

    // 2. Trial expired
    if (trialStatus.isExpired) {
      result.push({
        id: 'trial-expired',
        severity: 'red',
        title: 'Trial has expired',
        description: 'Your trial period has ended. Select a plan to restore full access.',
        ctaLabel: 'Choose a Plan',
        ctaAction: 'scroll-plans',
      });
    }

    // 3. Card expiry alerts
    result.push(...getCardExpiryAlerts(paymentInfo?.payment_method));

    // 4. Failed / open invoices
    const failedInvoices = paymentInfo?.invoices?.filter(
      (inv) => inv.status === 'open' || inv.status === 'uncollectible',
    );
    if (failedInvoices && failedInvoices.length > 0) {
      result.push({
        id: 'failed-payment',
        severity: 'red',
        title: 'Payment failed',
        description: `You have ${failedInvoices.length} unpaid invoice${failedInvoices.length > 1 ? 's' : ''}. Update your payment method to resolve.`,
        ctaLabel: 'Retry Payment',
        ctaAction: 'open-portal',
      });
    }

    // 5. No payment method on a paid plan
    const isPaidPlan = billing?.plan_id && billing.subscription_status !== 'trialing';
    if (isPaidPlan && !paymentInfo?.payment_method) {
      result.push({
        id: 'no-payment-method',
        severity: 'amber',
        title: 'No payment method on file',
        description: 'Add a payment method to prevent service interruption at your next billing cycle.',
        ctaLabel: 'Add Payment Method',
        ctaAction: 'open-portal',
      });
    }

    return result;
  }, [trialStatus, paymentInfo, billing]);

  return {
    alerts,
    isLoading: trialStatus.isLoading || isPaymentLoading || isBillingLoading,
  };
}
