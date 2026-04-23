## Top Menu Bar — Cleanup, Reorganization & Theme-Aware Owner Badge

### What's wrong today (visible in your screenshot)

Reading the right side of the bar left → right, the user sees four different visual languages stacked next to each other:

```text
[ 👁 Show/hide $ ]   [📕]   [💎 Owner]   [ 🚫👁 View As ]   [☀︎/☾]   [🔔]   [👤]
   ghost text pill    orphan  filled       ghost text pill    icon     icon    icon
                       icon    badge
```

Three concrete problems:

1. **Owner badge is theme-blind.** It's hardcoded to a stone/amber gradient (`ACCOUNT_OWNER_BADGE` in `roleBadgeConfig.ts`). It looks correct on dark Zura, washed-out on Rose Gold light, and alien on Cream/Sage. It should pick up the active theme's primary color the same way the rest of the chrome does.
2. **Mixed control vocabulary, no grouping.** Two text pills ("Show/hide $", "View As") sandwich a lone icon (Page Explainers) and a filled badge (Owner). There's no visual logic to the order — admin tools, identity, view tools, and personal tools are all mashed together.
3. **Page Explainers icon (📕) reads as an orphan** between two text pills. Once the others normalize, it has nowhere to belong.

### Proposed reorganization — three logical groups, one separator each

```text
LEFT                    CENTER              RIGHT
[← →]  [🔍 Search]      (Next Client)       [👁 $] [📕]  │  [💎 Owner] [🚫👁 View As]  │  [☀︎] [🔔] [👤]
                                              admin tools    identity & simulation       system & personal
```

Three intentional groups, separated by a thin vertical divider (`h-5 w-px bg-border/60`):

1. **Admin tools** — Show/hide $, Page Explainers. Both convert to **icon-only buttons with tooltips** (matching theme/notifications/avatar). The "$" icon makes "Show/hide $" self-evident.
2. **Identity & simulation** — Owner badge, then View As. These belong together: "who you are" + "who you're pretending to be." Keep the Owner badge as a labeled pill (it's earned chrome), keep View As as a labeled pill (it's a stateful action).
3. **System & personal** — Theme toggle, Notifications, Avatar. Already correct; just gets a divider on its left edge.

### Owner badge — theme-aware restyle

Replace the hardcoded stone/amber gradient with a dynamic primary-tinted treatment that adapts to whichever dashboard theme is active (Zura violet, Rose Gold, Cream, Sage, Ocean, Ember, Noir):

```text
Light mode:  soft primary tint background, deep primary text,
             primary/30 border, gem icon in deep primary
Dark mode:   primary/15 background, primary-200 text equivalent,
             primary/40 border, gem icon in primary-300 equivalent
```

Implementation uses `hsl(var(--primary) / α)` + `color-mix()` so it reskins automatically when the user changes themes — same mechanism we just used for the God Mode bar wordmark. Result: on Rose Gold the Owner pill becomes a soft bronze; on Zura it becomes deep violet; on Sage it becomes muted green. The Gem icon stays — it's the "owner" signifier — but its color participates in the theme.

Keeps the existing `ACCOUNT_OWNER_BADGE` API (label/icon/order) so the avatar dropdown's role list stays consistent.

### Micro-polish (cheap, high-leverage)

- **Show/hide $ → icon-only** (`Eye` / `EyeOff`) with tooltip "Hide monetary values". Saves ~110px of horizontal bar real estate at xl.
- **Page Explainers** stays icon-only (already is) but moves next to Show/hide $ where it belongs (admin toggles).
- **View As stays labeled** — it's a stateful action with consequences; the label is protective UX.
- **Tooltip consistency** — all icon buttons get `side="bottom"` tooltips with sentence-case copy.
- **Divider rendering**: `<div className="h-5 w-px bg-border/60 mx-1" aria-hidden />` between groups — not visible in light themes when subtle, but adds rhythm in dark.

### Files touched

- `src/lib/roleBadgeConfig.ts` — rewrite `ACCOUNT_OWNER_BADGE.colorClasses` to use `hsl(var(--primary)/α)` tokens instead of hardcoded stone/amber.
- `src/components/dashboard/SuperAdminTopBar.tsx` — reorder the right zone, insert two `<Divider />` spans, swap the inline `HideNumbersToggle` rendering hook to use icon-only mode.
- `src/components/dashboard/DashboardLayout.tsx` — add an `iconOnly` prop to the inline `HideNumbersToggle` component (defaults to current text-pill behavior; SuperAdminTopBar opts in). Mobile layout keeps the labeled pill.

### What stays untouched

- Left zone (back/forward, search) — already clean.
- Center zone (Next Client for stylists) — already clean.
- Notifications, Avatar dropdown, Theme toggle — already icon-led, just get a divider in front.
- God Mode bar — unrelated, keep recent fixes.
- Mobile top bar — out of scope; this targets the desktop `SuperAdminTopBar` (lg+).

### One open call I'd flag before building

Owner badge: **keep the "Owner" word, or go icon-only with a tooltip?** Two viable paths:

- **A. Keep label** (recommended): "Owner" is rare, prestigious, and earned chrome — worth the 60px.
- **B. Icon-only Gem** with "Account Owner" tooltip: maximally clean, matches the rest of the right cluster, but loses the badge-of-honor read.

Default plan above is **A**. Reply "go icon-only" if you'd rather **B**.

---

### Better-prompt note (per your standing instruction)

Strong prompt — you named the element ("Owner badge color styling") AND gave the qualitative goal ("match the theme/s") AND scoped the work ("clean up, reorganization, and enhancement"). That trio is exactly what lets me act fast.

The one upgrade for next time: when you say "reorganization," briefly state the **mental model** you want users to walk away with. E.g. "I want a clear left-to-right hierarchy of: navigation → admin tools → identity → personal." Without that, I'm inferring the grouping logic — which I did here, but you'd get to your preferred answer in one round instead of two if I had the model up front. The construct is **"organize by [grouping principle]"**, e.g. "organize by frequency of use" vs "organize by who the control belongs to" vs "organize by reversibility of action." Each yields a different bar.