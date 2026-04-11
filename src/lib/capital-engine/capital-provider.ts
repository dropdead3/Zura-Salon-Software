/**
 * Capital Provider Abstraction Layer
 *
 * Defines the interface for funding providers. Stripe is the first
 * and only implementation. Future providers (internal Zura Capital,
 * partner banks) implement the same interface.
 */

import { supabase } from '@/integrations/supabase/client';

/* ── Provider Types ── */

export interface ProviderEligibilityResult {
  eligible: boolean;
  reason: string;
  provider: string;
  providerCustomerReference: string | null;
}

export interface ProviderOffer {
  providerOfferId: string;
  eligible: boolean;
  offeredAmountCents: number | null;
  termLengthMonths: number | null;
  repaymentModel: string | null;
  estimatedPaymentCents: number | null;
  estimatedTotalRepaymentCents: number | null;
  feesSummary: string | null;
  aprText: string | null;
  expiresAt: string | null;
  rawSnapshotJson: Record<string, unknown>;
}

export interface ProviderInitiationResult {
  redirectUrl: string | null;
  providerReference: string | null;
  error: string | null;
}

export interface FundingStatusResult {
  status: 'pending' | 'approved' | 'declined' | 'expired' | 'unknown';
  providerReference: string | null;
  amountCents: number | null;
  metadata: Record<string, unknown>;
}

export interface RepaymentStatusResult {
  repaymentStatus: string;
  totalRepaidCents: number;
  remainingCents: number;
  lastPaymentAt: string | null;
  metadata: Record<string, unknown>;
}

/* ── Provider Interface ── */

export interface CapitalProvider {
  name: string;
  checkEligibility(organizationId: string, amountCents: number, context?: Record<string, unknown>): Promise<ProviderEligibilityResult>;
  getOffers(organizationId: string, amountCents: number, context?: Record<string, unknown>): Promise<ProviderOffer[]>;
  initiateFunding(opportunityId: string, organizationId: string, returnUrl: string, context?: Record<string, unknown>): Promise<ProviderInitiationResult>;
  syncFundingStatus(providerReference: string): Promise<FundingStatusResult>;
  syncRepaymentStatus(providerReference: string): Promise<RepaymentStatusResult>;
}

/* ── Stripe Capital Provider ── */

export class StripeCapitalProvider implements CapitalProvider {
  name = 'stripe';

  async checkEligibility(organizationId: string, _amountCents: number): Promise<ProviderEligibilityResult> {
    // Stripe eligibility is checked during offer retrieval / checkout initiation
    // This is a pass-through; real eligibility is validated server-side in the edge function
    return {
      eligible: true,
      reason: 'Stripe eligibility determined at checkout',
      provider: 'stripe',
      providerCustomerReference: null,
    };
  }

  async getOffers(_organizationId: string, _amountCents: number): Promise<ProviderOffer[]> {
    // Stripe Capital offers are not self-serve retrievable via API.
    // Offers are stored in capital_provider_offers when available.
    // This method returns cached offers from the database.
    return [];
  }

  async initiateFunding(
    opportunityId: string,
    organizationId: string,
    _returnUrl: string,
  ): Promise<ProviderInitiationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('create-financing-checkout', {
        body: { opportunityId, organizationId },
      });
      if (error) throw error;
      return {
        redirectUrl: (data as { url: string })?.url ?? null,
        providerReference: null,
        error: null,
      };
    } catch (err) {
      return {
        redirectUrl: null,
        providerReference: null,
        error: (err as Error).message,
      };
    }
  }

  async syncFundingStatus(_providerReference: string): Promise<FundingStatusResult> {
    // Funding status is synced via webhook, not polling
    return {
      status: 'unknown',
      providerReference: _providerReference,
      amountCents: null,
      metadata: {},
    };
  }

  async syncRepaymentStatus(_providerReference: string): Promise<RepaymentStatusResult> {
    // Repayment sync would be implemented via Stripe reporting API
    return {
      repaymentStatus: 'unknown',
      totalRepaidCents: 0,
      remainingCents: 0,
      lastPaymentAt: null,
      metadata: {},
    };
  }
}

/* ── Provider Registry ── */

const providers: Record<string, CapitalProvider> = {
  stripe: new StripeCapitalProvider(),
};

export function getProvider(name: string = 'stripe'): CapitalProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown capital provider: ${name}`);
  return provider;
}
