/**
 * Contract: the BillingGuide `#reputation` card MUST source pricing from
 * REPUTATION_PRICING_SHEET / REPUTATION_STRIPE — not hardcoded literals.
 *
 * Doctrine anchor: mem://features/reputation-billing-guide-section
 *
 * This is a source-level scan (cheap, no React render) — same shape as
 * other authoring-time canon tests. Companion to
 * src/hooks/reputation/__tests__/reputation-platform-console.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPUTATION_PRICING_SHEET, REPUTATION_STRIPE } from '@/config/reputationPricing';

const SOURCE = readFileSync(
  path.resolve(__dirname, '../BillingGuide.tsx'),
  'utf8',
);

// Strip the BILLING_CHANGELOG block — historical entries are allowed to
// quote prices as prose (that's the changelog's whole job).
const SOURCE_NO_CHANGELOG = SOURCE.replace(
  /const BILLING_CHANGELOG[\s\S]*?\n\];\n/,
  '',
);

describe('BillingGuide × Reputation pricing contract', () => {
  it('imports the canonical pricing constants', () => {
    expect(SOURCE).toMatch(
      /from ['"]@\/config\/reputationPricing['"]/,
    );
    expect(SOURCE).toContain('REPUTATION_PRICING_SHEET');
    expect(SOURCE).toContain('REPUTATION_STRIPE');
  });

  it('renders base monthly price via the constant, not a literal', () => {
    expect(SOURCE).toContain('REPUTATION_PRICING_SHEET.baseSku.monthlyPrice');
    // No raw "$49" or ">49<" outside changelog
    expect(SOURCE_NO_CHANGELOG).not.toMatch(/\$49\b/);
  });

  it('renders trial period via the constant', () => {
    expect(SOURCE).toContain('REPUTATION_PRICING_SHEET.baseSku.trialDays');
    expect(SOURCE_NO_CHANGELOG).not.toMatch(/\b14[\s-]day/i);
  });

  it('renders per-location add-on price via the constant', () => {
    expect(SOURCE).toContain(
      'REPUTATION_PRICING_SHEET.perLocationAddOn.monthlyPrice',
    );
    expect(SOURCE_NO_CHANGELOG).not.toMatch(/\$19\b/);
  });

  it('renders Stripe product id via the constant', () => {
    expect(SOURCE).toContain('REPUTATION_STRIPE.productId');
    expect(SOURCE_NO_CHANGELOG).not.toContain(REPUTATION_STRIPE.productId);
  });

  it('renders retention coupon id via the constant', () => {
    expect(SOURCE).toContain('REPUTATION_PRICING_SHEET.retentionCoupon');
    // Coupon id must not appear as a hardcoded string anywhere in the file
    // body (changelog mention is prose-only).
    expect(SOURCE_NO_CHANGELOG).not.toContain(
      `'${REPUTATION_PRICING_SHEET.retentionCoupon.id}'`,
    );
    expect(SOURCE_NO_CHANGELOG).not.toContain(
      `"${REPUTATION_PRICING_SHEET.retentionCoupon.id}"`,
    );
  });

  it('renders grace window via the constant', () => {
    expect(SOURCE).toContain('REPUTATION_PRICING_SHEET.graceWindow.days');
  });

  it('cross-links to the platform Pricing Sheet tab', () => {
    expect(SOURCE).toMatch(/\/platform\/reputation\?tab=pricing/);
  });

  it('registers the #reputation jump-nav anchor', () => {
    expect(SOURCE).toMatch(/id:\s*['"]reputation['"]/);
    expect(SOURCE).toMatch(/id=["']reputation["']/);
  });
});
