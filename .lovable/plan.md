

# Competitor Feature Analysis Component for Backroom Paywall

## Competitor Research Summary

### Vish (getvish.com)
**Verified features:** Formula tracking (to 0.1g), waste reduction via reweigh reporting, pricing control (adapts to various pricing models), POS integrations (Meevo, Square, Boulevard, Phorest, Shortcuts, SalonBiz, etc.), inventory reporting, integrated appointments, dashboard, front desk app, "Plan Ahead Mobile."

**Pricing (GBP, per-stylist tiers):** Solo £30/mo (1 user), Starter £80/mo (2 users), Vish 5 £130/mo (2-5), Vish 10 £185/mo (6-10), Vish 20 £240/mo (11+), Enterprise custom. Scales NOT included: £165 each. Training sold separately. iPad/tablet required (not included).

**Limitations:** No predictive reorder/demand forecasting, no assistant workflows, no service blueprinting, no ghost loss detection, no supply fee recovery automation, no integration with broader business intelligence platform, no multi-location unified dashboard (Enterprise only), training sold separately.

### SalonScale (salonscale.com)
**Verified features:** Real-time color costs, waste tracking, reporting & analytics, inventory & ordering (auto-updates as you mix), formula storage, Bluetooth scale support, POS integration (Square only), order forms, stylist insights, backbar management.

**Pricing (USD, per-stylist tiers):** Solo $49/mo or $499/yr (1 stylist), Essentials $99/mo or $1009/yr (up to 3), Signature $149/mo or $1520/yr (up to 7), Luxe $199/mo or $2030/yr (unlimited). Annual plans include 1 free scale. Monthly plans do NOT include scale.

**Limitations:** Square-only POS integration, no predictive reorder alerts, no demand forecasting, no assistant workflows, no service blueprints, no ghost loss detection, no operational alerts, no integration with scheduling or broader BI, no multi-location intelligence, no supply fee recovery automation.

### Zura Backroom Advantages (verified from codebase)
- Predictive reorder alerts and demand forecasting from appointment book
- Assistant prep workflows with service blueprints and task routing
- Ghost loss detection and variance alerts
- Supply fee recovery automation
- Cost-per-service profitability analytics
- Integrated with full salon platform (scheduling, BI, operations)
- Multi-location support with unified intelligence
- Usage-based pricing ($20/location + $0.50/service) -- scales with actual usage, not stylist count
- Operational alerts and backroom control tower

## Implementation Plan

### New file: `src/components/dashboard/backroom-settings/CompetitorComparison.tsx`

A self-contained component inserted into `BackroomPaywall.tsx` between Section 4 (What You Get) and Section 5 (Pricing).

**Structure:**
1. Section headline: "How Zura Backroom Compares"
2. Comparison grid with 3 columns (Zura Backroom, Vish, SalonScale) and ~12 feature rows grouped into 3 categories
3. Short summary statement below the grid

**Feature rows grouped by category:**

*Core Tracking*
- Per-gram formula tracking: All three have it
- Formula storage & recall: All three have it
- Waste tracking: All three have it
- Ghost loss detection: Zura only

*Workflow & Operations*
- Assistant prep workflows: Zura only
- Service blueprints: Zura only
- Predictive reorder alerts: Zura only
- Demand forecasting: Zura only

*Business Intelligence*
- Cost-per-service profitability: Zura only
- Supply fee recovery automation: Zura only
- Multi-location intelligence: Zura only
- Full platform integration (scheduling, BI): Zura only

**Visual indicators:**
- `CheckCircle2` (green) = full support
- `MinusCircle` or dash (muted) = partial/not available
- `XCircle` or empty = not available

**Pricing note row (optional, data is verified):**
- Zura: $20/location + $0.50/service (usage-based)
- Vish: £30-240/mo by stylist count + £165/scale
- SalonScale: $49-199/mo by stylist count

### Changes to `BackroomPaywall.tsx`

- Import `CompetitorComparison` component
- Insert `<CompetitorComparison />` between Section 4 (What You Get mid-page CTA, ~line 506) and Section 5 (Pricing, ~line 508)

### Design approach
- Uses existing `Card`, `CardContent` components and `tokens` for consistency
- Clean table layout with responsive stacking on mobile (scrollable horizontally or card-based)
- No aggressive language -- factual checkmarks/dashes only
- Follows Zura brand voice: minimal, precise, confident
- Mobile: horizontal scroll wrapper on the grid

