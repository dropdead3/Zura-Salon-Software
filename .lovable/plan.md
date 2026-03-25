

## Tokenize Bowl/Bottle Card Sizing

### Problem
The bowl/bottle cards in the Dock formulations tab use hardcoded sizes that are too small for iPad/gloved use. Text like "BOWL 1", status labels, mixed-by info, and ingredient lines are all undersized and inconsistent.

### Solution
Add a `DOCK_CARD` token group to `dock-ui-tokens.ts` specifically for formulation cards, then apply those tokens in `BowlCard`, `DemoBowlCard`, and `AddBowlCard`.

### Token Definition

Add to `dock-ui-tokens.ts`:

```typescript
export const DOCK_CARD = {
  /** Outer card wrapper */
  wrapper: 'w-full text-left rounded-xl p-5 border transition-all duration-150 min-h-[180px] flex flex-col bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)] hover:border-[hsl(var(--platform-border)/0.5)] active:scale-[0.98]',
  /** Icon box in card header */
  iconBox: 'w-12 h-12 rounded-lg border flex items-center justify-center flex-shrink-0',
  /** Icon inside iconBox */
  icon: 'w-5 h-5',
  /** Card title — e.g. "BOWL 1", "BOTTLE 2" */
  title: 'font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]',
  /** Status label below title — e.g. "Draft", "Active" */
  statusLabel: 'text-sm mt-0.5',
  /** Supporting info — e.g. "Mixed by Demo Stylist" */
  meta: 'text-sm text-[hsl(var(--platform-foreground-muted)/0.6)]',
  /** Flagged/warning text */
  flag: 'text-xs text-amber-400/70',
  /** Notes / description preview */
  notes: 'text-sm text-[hsl(var(--platform-foreground-muted)/0.5)] truncate',
  /** Ingredient line text in demo cards */
  ingredientLine: 'text-sm text-[hsl(var(--platform-foreground-muted)/0.6)] truncate leading-snug',
  ingredientName: 'text-[hsl(var(--platform-foreground-muted)/0.8)]',
  /** Overflow "+N more" text */
  overflow: 'text-xs text-[hsl(var(--platform-foreground-muted)/0.4)]',
  /** Footer stats row */
  footer: 'mt-2 pt-2 border-t border-[hsl(var(--platform-border)/0.15)] flex items-center justify-between',
  footerText: 'text-xs text-[hsl(var(--platform-foreground-muted)/0.5)]',
  /** Menu button */
  menuButton: 'p-1 -mr-1 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors',
  menuIcon: 'w-6 h-6 text-[hsl(var(--platform-foreground-muted)/0.4)] flex-shrink-0',
  /** Add card specific */
  addWrapper: 'w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed min-h-[180px] border-violet-500/30 text-violet-400 hover:bg-violet-600/10 hover:border-violet-500/50 active:scale-[0.98] transition-all duration-150 disabled:opacity-40',
  addIconBox: 'w-14 h-14 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center',
  addIcon: 'w-7 h-7',
  addLabel: 'text-sm font-medium',
} as const;
```

Key size bumps vs current:
- Icon box: `w-10 h-10` → `w-12 h-12`; icon `w-4.5` → `w-5`
- Title: `text-sm` → `text-base`
- Status label: `text-xs` → `text-sm`
- Meta/notes: `text-[11px]` → `text-sm`
- Ingredient lines: `text-xs` → `text-sm`
- Card min height: `160px` → `180px`
- Add card icon: `w-12 h-12` → `w-14 h-14`, plus icon `w-6` → `w-7`

### Files
1. `src/components/dock/dock-ui-tokens.ts` — add `DOCK_CARD` export
2. `src/components/dock/appointment/DockServicesTab.tsx` — replace hardcoded classes in `BowlCard`, `DemoBowlCard`, and `AddBowlCard` with `DOCK_CARD.*` tokens

