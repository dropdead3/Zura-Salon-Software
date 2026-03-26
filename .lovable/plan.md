

## Price Intelligence Page — UI & Tokenization Compliance Audit

### Issues Found

---

#### 1. KPI Strip Not Using `tokens.kpi.tile` Pattern

The 4 KPI cards use raw `<Card><CardContent className="p-4">` with inline icon-box classes instead of the standardized `tokens.kpi.tile` wrapper. The label uses a fallback chain (`tokens.kpi?.label || 'font-display...'`) instead of trusting the token directly — the tokens exist and are defined.

**Fix:** Replace each KPI card with `<div className={tokens.kpi.tile}>` pattern. Use `tokens.kpi.label` and `tokens.kpi.value` directly without fallback strings.

---

#### 2. Excessive Fallback Chains Throughout

Multiple lines use `tokens.card?.iconBox || 'w-10 h-10...'` or `tokens.empty?.container || '...'`. All these tokens exist in `design-tokens.ts`. The optional chaining + fallback adds visual noise and risks divergence if someone updates the token but the fallback stays stale.

**Fix:** Remove all `|| '...'` fallback strings. Use tokens directly: `tokens.card.iconBox`, `tokens.card.title`, `tokens.empty.container`, `tokens.empty.icon`, `tokens.empty.heading`, `tokens.empty.description`, `tokens.loading.spinner`.

---

#### 3. Page Container Not Using `tokens.layout.pageContainer`

Line 148 uses `"container max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6"` — a custom padding string. The design system mandates `tokens.layout.pageContainer` for dashboard pages.

**Fix:** Replace with `<div className={cn(tokens.layout.pageContainer, 'max-w-[1600px] mx-auto')}>`.

---

#### 4. `font-medium` on Table Cell (Line 182, 228)

`PriceRecommendationsTable` line 182 uses `font-medium` on a table cell for service name, and line 228 uses `font-medium` on the recommended price cell. While `font-medium` is the max allowed, these are body-text cells — `tokens.body.emphasis` should be used for the service name and `tokens.body.default` with `text-primary` for the recommended price.

**Fix:** Use `tokens.body.emphasis` and appropriate token classes instead of raw strings.

---

#### 5. Button Size Token Not Used on "Accept All"

Line 174 uses `className={tokens.button?.page || 'h-10 px-6'}`. This should be `size={tokens.button.page}` as a prop, not a className. The button size token is meant for the `size` prop.

**Fix:** Change to `<Button size={tokens.button.page} disabled={isAccepting}>`.

---

#### 6. History Card Has No Header — Just Bare Content

The History section (line 400-404) wraps `PriceRecommendationHistory` in a Card with only `CardContent className="p-2"` — no `CardHeader`, no icon box, no title. This breaks the card header standard (icon-box + CardTitle + MetricInfoTooltip).

**Fix:** Add a proper `CardHeader` with icon box, title "Price Action History", and a `MetricInfoTooltip`.

---

#### 7. Margin Trend Chart Missing `tokens.card.iconBox` and `tokens.card.title` Direct Usage

Lines 353-358 use the fallback pattern again. These tokens exist — use them directly.

---

#### 8. Export CSV Button Missing `font-sans` Token Consistency

Line 159 manually adds `font-sans` to the Export button. Should use `tokens.button.card` for size since it's a page-level secondary action (outline variant).

**Fix:** Use `size={tokens.button.card}` prop.

---

#### 9. No `PinnableCard` Wrapping on Any Card

The design system requires analytics cards to be wrapped in `PinnableCard` for visibility toggle and AI insight support. None of the cards on this page use it.

**Fix:** Wrap the KPI strip, recommendations table card, margin trend card, and history card in `PinnableCard` with appropriate `elementKey` and `elementName` props.

---

#### 10. `CardDescription` on Main Table Card Uses Raw Classes

Line 313: `className="font-sans text-sm text-muted-foreground"` — this is exactly `tokens.body.muted`.

**Fix:** Use `className={tokens.body.muted}`.

---

### Summary

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | KPI strip not using `tokens.kpi.tile` | Medium | Small |
| 2 | Stale fallback chains on all tokens | Medium | Trivial |
| 3 | Page container not using layout token | Medium | Trivial |
| 4 | Raw `font-medium` on table cells | Low | Trivial |
| 5 | Button size as className vs prop | Low | Trivial |
| 6 | History card missing header | Medium | Small |
| 7 | Trend chart fallback tokens | Low | Trivial |
| 8 | Export button size token | Low | Trivial |
| 9 | No PinnableCard wrapping | Medium | Medium |
| 10 | CardDescription raw classes | Low | Trivial |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/dashboard/admin/PriceRecommendations.tsx` | Items 1-3, 5-10 — token compliance, PinnableCard wrapping, layout token, history header |
| `src/components/dashboard/backroom-settings/PriceRecommendationsTable.tsx` | Item 4 — body tokens on cells |

