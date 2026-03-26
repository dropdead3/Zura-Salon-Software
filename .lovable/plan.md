

## Analysis: Billing Method Education — Gaps, Improvements & Enhancements

### What's Working Well
- Clean three-card layout with consistent structure (icon, description, pros/cons, pro tip)
- Hybrid correctly highlighted as recommended
- Appears in both Setup Wizard (step 4) and Allowances section (collapsible)
- Wizard step indexes and save logic correctly shifted
- Educational-only — no premature selection forced

---

### Gap 1: No Connection Between Education and Action
The education cards explain methods but there's no bridge to "what to do next." After reading, the owner lands on the Allowances step where policies default to `billing_mode: 'allowance'` with no prompt to consider Parts & Labor for specific services.

**Fix:** Add a contextual hint at the bottom of BillingMethodEducation when rendered inside the wizard: "In the next step, you'll set allowances for each service. You can switch any service to Parts & Labor later in Allowances & Billing."

### Gap 2: Collapsible Defaults to Closed
In `AllowancesBillingSection`, `showEducation` starts `false`. A first-time user who skipped the wizard never sees this content unless they notice and click "Learn about billing methods."

**Fix:** Default `showEducation` to `true` if the org has zero allowance policies configured (first visit). Once policies exist, default to collapsed.

### Gap 3: Missing "How Overages Work" Detail
The Allowance card says "overage charged if stylist uses more than budgeted" but doesn't clarify the two overage pricing options (at cost vs. retail markup). This is a key decision point the owner asked about.

**Fix:** Add a bullet or sub-line: "Overages can be charged at cost or at a set markup — configured per service."

### Gap 4: Missing "How Markup Works" Detail for Parts & Labor
The Parts & Labor card mentions "set a markup %" in the pro tip but doesn't explain that charges can be at-cost OR at-margin in the card body itself.

**Fix:** Add to description or pros: "Charge at wholesale cost or apply a markup for retail pricing — your choice per service."

### Gap 5: No Visual Distinction in the Wizard Step
Step 4 (Billing Strategy) is purely text + cards — same visual weight as data-entry steps. Since it's the only read-only step, it should feel different so owners know they can absorb the info without pressure.

**Fix:** Add a subtle info banner or different background treatment to signal "this is a learning moment, not a configuration step." A simple "No action needed — just review" pill badge at the top.

### Enhancement: Receipt Preview Mockups
Owners may not fully grasp how each method looks to their clients. A small receipt-style mockup per card (2-3 line items) would make the difference visceral:
- **Allowance:** "Balayage — $185" (one clean line)
- **Parts & Labor:** "Balayage Labor — $145 / Color supplies — $38.50"
- **Hybrid:** Mix of both for a multi-service visit

---

### Proposed Changes

| File | Change |
|------|--------|
| `BillingMethodEducation.tsx` | Add optional `showWizardHint` prop for contextual CTA text; add overage/markup clarifications to card content; add receipt preview mockups per card |
| `AllowancesBillingSection.tsx` | Default `showEducation` to `true` when no policies exist |
| `BackroomSetupWizard.tsx` | Pass `showWizardHint` to the education component; add "No action needed" badge above the cards |

### Scope
Small content and UX refinements — no new data model or API changes. Roughly 3 files touched, ~40 lines changed.

