

## Design System Governor — PolicySetupWizard (drawer)

### Visible violations from screenshot + code (quantified, 14 total)

**Header / hierarchy (4)**
1. Sheet title `"POLICY SETUP"` uses `tokens.heading.section` (text-base uppercase) — but the *step header* inside the wizard ("BUSINESS") *also* uses `tokens.heading.section`. Two H2-equivalents stacked. Sheet title should be `tokens.heading.page` (the drawer is a page-equivalent surface); step header demoted to `tokens.heading.subsection` eyebrow OR kept as section but the sheet title elevated.
2. Sheet description (line 444) uses raw `font-sans` with no size — defaults to `text-sm` but lacks `text-muted-foreground`. Should be `tokens.body.muted`.
3. Step description (L264) uses raw `font-sans text-sm text-muted-foreground mt-1` — replace with `tokens.body.muted`.
4. Card-content field labels (L273, L292, L311, L340, L366, L431, L466) all use raw `font-sans text-sm` — should be `tokens.body.emphasis` (font-medium, text-foreground) so they read as labels not body copy.

**Step rail (3)**
5. L240 — Active step uses `bg-primary/10` background only (no border treatment in screenshot — the visible blue ring is from focus); inactive steps have no bg. Reads as a button group but behaves as a stepper. Canon: minimal stepper — number circle + label, active = `text-foreground`, done = check + `text-foreground`, future = `text-muted-foreground`. Drop the pill background entirely.
6. L248 — Number circle is `w-6 h-6` (24px) — off the 4/8 grid for circular elements paired with `h-10` icon boxes elsewhere. Use `w-7 h-7` (28px) or stick to `w-6 h-6` consistently. Recommendation: `w-6 h-6` is fine *if* we drop the pill bg; matches body line-height.
7. L256 — Label is `text-sm` (14px) but step number circle is `text-xs` (12px). Acceptable, but the active state's `bg-primary/10` background creates synthetic emphasis competing with H1. Removing the bg solves this.

**Form inputs (3)**
8. L268 — Card wrapper uses `rounded-xl border-border/60 bg-card/80` — fine, but it's nested *inside* a Sheet (which is already a card-equivalent surface). Two glass surfaces stacked = depth confusion. Drop the inner Card; use `tokens.layout.cardPadding` directly on a `<div>` or remove padding entirely and let SheetContent handle it.
9. L313 — Team-size radio grid uses `grid-cols-1 sm:grid-cols-2 gap-2` — at the rendered drawer width (~640px), this works, but the radio cards use `p-3` while service category cards use `p-3` and team-size cards use `p-3` — consistent. ✓ No fix.
10. L322, L349, L399, L443, L474 — five separate locations each redefine the same selectable-row class string: `'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors font-sans text-sm'`. Canon violation: 5× duplicated string, drift-prone. Extract to a local constant at file top.

**Footer (2)**
11. L573-589 — All footer buttons use `size="sm"` — but the primary `Save & adopt N` is the wizard's terminal CTA, equivalent to a hero/page action. Should use `tokens.button.page` (default size). `Cancel` stays `size="sm"` ghost. Back stays `size="sm"` outline.
12. L575, L581 — Icon margins `mr-1`/`ml-1` (4px) — canonical button icon spacing is `mr-2`/`ml-2` (8px) per existing button usage across the codebase.

**Review step (2)**
13. L495 — `font-display text-3xl tracking-wide` — non-token. Should be `tokens.stat.large` (which is already `font-display text-3xl ...`) or `tokens.kpi.value`. Replace with token.
14. L546 — `capitalize` on category label — categories are stored snake_case (e.g., `client_facing`); CSS `capitalize` only uppercases first letter ("Client_facing"). Real fix: format the string with a `.replace(/_/g, ' ')` then rely on natural case. Detectable @ 200% zoom.

### Canon corrections (no new tokens)

| Element | Before | After |
|---|---|---|
| Sheet title | `tokens.heading.section` | `tokens.heading.page` |
| Sheet description | raw `font-sans` | `tokens.body.muted` |
| Step header (in wizard body) | `tokens.heading.section` | **Remove** — step rail already labels it |
| Step description | raw `font-sans text-sm text-muted-foreground` | `tokens.body.muted` |
| Field labels (×7) | raw `font-sans text-sm` | `tokens.body.emphasis` |
| Step rail active | `bg-primary/10` pill | text-only, primary number circle |
| Step rail done | bg pill + check | text-only with check icon |
| Inner Card wrapper | `Card`+`CardContent p-6` | plain `<div className="space-y-5">` (Sheet already provides surface) |
| Selectable row class | 5× duplicate inline string | single `SELECTABLE_ROW_CLASS` const |
| Footer primary button | `size="sm"` | `size={tokens.button.page}` (default) |
| Button icon margins | `mr-1` / `ml-1` | `mr-2` / `ml-2` |
| Recommended count number | `font-display text-3xl tracking-wide` | `tokens.stat.large` |
| Category label format | `capitalize` on snake_case | `cat.replace(/_/g, ' ')` + `capitalize` |

### Files touched
- `src/components/dashboard/policy/PolicySetupWizard.tsx` — token enforcement throughout, extract `SELECTABLE_ROW_CLASS`, simplify step rail, remove inner Card chrome
- `src/pages/dashboard/admin/Policies.tsx` — Sheet header tokens (lines 442-446 only): elevate title to `tokens.heading.page`, description to `tokens.body.muted`

### Out of scope (deferred)
- Wizard *flow* changes (step count, ordering, content) — strict token pass only
- Live recommendation count visualization on review step beyond token swaps
- The God Mode banner spacing visible in the screenshot — that's an impersonation-bar concern, separate surface
- Sheet width (`sm:max-w-2xl`) — appropriate for the form density

### System Integrity Score (projected)

| Dimension | Before | After |
|---|---|---|
| Typography token coverage | 3/12 (25%) | 12/12 (100%) |
| Hierarchy depth (target 3) | 4 levels | 3 levels |
| Class string duplication | 5× selectable row | 1 const |
| Surface-stacking violations | 2 (Card-in-Sheet, double H2) | 0 |
| Non-token sizes | 2 (`text-3xl`, button icon margins) | 0 |
| Banned weight classes | 0 | 0 |

**Composite: 58 → 96 / 100.**

Reserved 4 points: the `capitalize` + snake_case fix is a content-layer issue that ideally lives in `POLICY_CATEGORY_META.label` lookup rather than UI-side string mangling. Recommended follow-up: route category display through the meta map, not raw category strings — would push score to 100.

