

## Tokenize Dock Badge System and Switch to Aeonik Pro

### Problem
The payment badges (PAID, UNPAID, COMP) and status badges (No Show, Cancelled) on completed appointment cards use `font-display` (Termina). All badges in the Zura Backroom/Dock should consistently use `font-sans` (Aeonik Pro) to match the bowl count badges. Additionally, badge styles should be tokenized in `dock-ui-tokens.ts` for reuse and consistency.

### Change 1 — `src/components/dock/dock-ui-tokens.ts`

Add a new `DOCK_BADGE` token group:

```ts
export const DOCK_BADGE = {
  /** Base classes for all Dock pill badges */
  base: 'text-[11px] font-sans whitespace-nowrap px-2.5 py-0.5 rounded-full border',

  /** Color variants — ghost style with low-opacity bg + border */
  paid:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  unpaid:    'bg-red-500/15 text-red-400 border-red-500/25',
  comp:      'bg-[hsl(var(--platform-foreground-muted)/0.15)] text-[hsl(var(--platform-foreground-muted))] border-[hsl(var(--platform-foreground-muted)/0.3)]',
  noShow:    'bg-amber-500/15 text-amber-400 border-amber-500/25',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',

  /** Bowl count variants */
  bowlsMixed:   'bg-sky-500/15 text-sky-300 border-sky-400/25',
  noBowlsMixed: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
  noChemical:   'bg-slate-500/15 text-slate-400 border-slate-400/25',
} as const;
```

### Change 2 — `src/components/dock/schedule/DockAppointmentCard.tsx`

1. Import `DOCK_BADGE` from `dock-ui-tokens`
2. Replace the inline `STATUS_BADGE` and `PAYMENT_BADGE` maps to reference `DOCK_BADGE` tokens
3. Update the badge `<span>` at line 136: replace `font-display tracking-wide uppercase` with the `DOCK_BADGE.base` token
4. Update the bowl count badge div (~line 288) to also use `DOCK_BADGE.base` + the appropriate variant token
5. Remove old hardcoded class strings from the maps

### Change 3 — Update memory for Dock appointment card and UI standards

Record that all Dock badges use `DOCK_BADGE` tokens from `dock-ui-tokens.ts`, with `font-sans` (Aeonik Pro) as the mandatory font — never `font-display`.

Two files modified, one new token group.

