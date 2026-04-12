

# Add "How to Talk About It" Tiered Messaging Section

## What

Add a new section to the Capital Knowledge Base page that gives platform admins three layers of messaging clarity — so they know exactly how to describe the feature depending on context (marketing, product explanation, or full transparency).

## Change

**File:** `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx`

Insert a new `PlatformCard` before the FAQ section (before line 335) with:

- **Title**: "How to Talk About It" with a `MessageSquare` icon
- **Description**: "Three layers of explanation for different contexts."
- **Three tier blocks**, each with a label badge and the corresponding copy:
  - **Layer 1 — Marketing** (front-end messaging): "Zura doesn't just tell you how to grow — it helps you fund it."
  - **Layer 2 — Product Explanation** (admin/org conversations): "When Zura identifies a strong growth opportunity, it may surface funding options so you can act on it."
  - **Layer 3 — Full Transparency** (details/legal): "Funding is provided by third-party partners such as Stripe and is subject to their underwriting criteria."

Each tier rendered as a styled row with a muted label pill and the quote in a slightly larger font. Clean, scannable, no decoration.

Add `MessageSquare` to the lucide-react import.

| File | Change |
|---|---|
| `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx` | Add tiered messaging section before FAQ, add `MessageSquare` import |

