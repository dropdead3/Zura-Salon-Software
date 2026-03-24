

## Propagate DOCK_BADGE Tokens to Remaining Badge Instances

### Problem
Three badge locations in the Dock still use hardcoded `font-display` classes instead of the `DOCK_BADGE` token system:
- **DockDemoBadge** — Termina + uppercase
- **DockClientTab** — 6 badge variants (visits, CLV tier, first visit, no-show, preferred stylist, "since" date) all with inline `font-display`
- **DockNewBookingSheet** — service tag pills (already `font-sans` but not using `DOCK_BADGE` tokens)

### Change 1 — `src/components/dock/dock-ui-tokens.ts`

Add new badge variant tokens for client profile badges:

```ts
/** Client profile variants */
visits:       'bg-violet-500/10 text-violet-400 border-violet-500/20',
clvPlatinum:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
clvGold:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
clvSilver:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
firstVisit:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
noShowRisk:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
neutral:      'bg-[hsl(var(--platform-bg-elevated))] text-[hsl(var(--platform-foreground-muted))] border-[hsl(var(--platform-border)/0.2)]',

/** System indicator */
demo:         'bg-amber-500/20 text-amber-300 border-amber-500/30',
```

### Change 2 — `src/components/dock/DockDemoBadge.tsx`

Replace inline classes with `DOCK_BADGE.base` + `DOCK_BADGE.demo`:

```tsx
<span className={cn(DOCK_BADGE.base, DOCK_BADGE.demo, 'inline-flex items-center gap-1.5 backdrop-blur-md')}>
```

### Change 3 — `src/components/dock/appointment/DockClientTab.tsx`

Replace all 6 hardcoded badge `<span>` elements to use `DOCK_BADGE.base` + the appropriate variant token. Remove `font-display tracking-wide uppercase` from each.

### Result

Every pill badge in the Dock uses `DOCK_BADGE` tokens with `font-sans` (Aeonik Pro). Three files updated, zero visual regressions (colors stay identical).

