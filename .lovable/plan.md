

# Add Third-Party Provider Clarity to Capital Feature Guide

## Problem

The Overview section currently describes Capital as a "growth execution layer" but doesn't clarify that actual funding is powered by third-party providers. Platform admins need to understand this distinction.

## Change

**File:** `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx`

Update the Overview section's description paragraph (line 122) to include a clear statement that Zura identifies and validates opportunities, and when appropriate, surfaces funding options powered by third-party providers like Stripe.

Also update the closing philosophy paragraph (line 141-143) to reinforce this — Zura is the intelligence layer; funding execution flows through trusted payment infrastructure partners.

**Specific copy changes:**

- **Main paragraph** (line 122): After the existing sentence about deterministic scoring, add: *"When an opportunity qualifies, Zura surfaces funding options powered by third-party providers such as Stripe. Zura handles the intelligence — opportunity detection, scoring, and tracking — while funding execution flows through trusted financial infrastructure partners."*

- **Philosophy paragraph** (line 141-143): Append: *"Zura is the brain; third-party providers like Stripe are the funding rails."*

One file, two paragraph edits. No structural or component changes.

| File | Change |
|---|---|
| `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx` | Add third-party provider language to Overview section |

