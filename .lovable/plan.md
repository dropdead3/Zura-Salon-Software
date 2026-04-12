

# Rewrite Zura Capital Feature Guide for Clarity

## Problem

The current page is overbuilt with technical jargon (ROE thresholds, risk weights, status nodes) that confuses rather than educates platform admins. The FAQ answers are inaccurate — they claim "no interest rates, no credit checks, no repayment schedules" which is misleading since funding flows through Stripe and is subject to their terms. The page needs to be restructured around the tiered messaging framework as the organizing principle.

## Approach

Rewrite `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx` with a cleaner, honest structure:

### New Page Structure

1. **Header** — "Zura Capital — Feature Guide" (unchanged)

2. **How to Talk About It** — Move to the top as the anchor section. Three tiers unchanged. This frames everything that follows.

3. **What Zura Capital Is** — Simplified overview. Zura identifies high-return growth opportunities and, when appropriate, surfaces funding options powered by third-party providers like Stripe. Not a loan product Zura offers — Zura is the intelligence layer. Short, declarative.

4. **How It Works** — Simplified to 4 steps instead of 7:
   - Zura detects growth opportunities from operational data
   - Opportunities are scored and filtered (only high-confidence, high-return surface)
   - Qualifying opportunities appear in the organization's Growth Hub
   - Organization admin reviews and decides whether to activate funding

5. **What Organizations See** — Streamlined. When enabled: Capital link appears in Growth Hub. Admins see ranked opportunities. Each has a detail view and activation option. If nothing qualifies, the section stays empty.

6. **Who Controls Access** — Simplified permissions. Platform admins enable/disable via Control Tower. Within orgs, only Super Admins and Account Owners see Capital.

7. **FAQ** — Rewritten with honest, clear answers:
   - "Is Zura providing the funding?" — No. Funding is provided by third-party partners like Stripe, subject to their terms.
   - "What happens when I enable Capital for an org?" — Zura begins evaluating opportunities. Qualifying ones surface in Growth Hub.
   - "Can organizations enable this themselves?" — No. Platform-controlled only.
   - "What if no opportunities qualify?" — Section stays empty. No false signals.
   - "How does Zura decide what qualifies?" — Deterministic scoring based on projected return, data confidence, risk level, and operational stability.
   - "Is there risk to the organization?" — Funding terms are set by the provider (e.g., Stripe). Zura surfaces the opportunity; the provider handles underwriting and terms.

### Removed

- Eligibility Criteria card with specific thresholds (too technical for this page)
- Opportunity Types grid (unnecessary detail)
- Funding Lifecycle status flow diagram (internal implementation detail)
- LifecycleStep, CriteriaRow, OpportunityType, StatusNode helper components
- Misleading FAQ answers about "no interest rates, no credit checks"

### Kept

- PlatformPageContainer, PlatformPageHeader, PlatformCard components
- How to Talk About It section (moved to top)
- Accordion for FAQ
- Back link to Control Tower

## File Summary

| File | Change |
|---|---|
| `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx` | Full rewrite — simplified, honest, anchored on tiered messaging |

