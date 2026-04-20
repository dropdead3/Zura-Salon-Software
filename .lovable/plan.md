

## Goal
All policy drawers must use the canonical luxury glass bento floating drawer (`PremiumFloatingPanel`) — not the flush-edge `Sheet` primitive. The screenshot shows the wizard rendering edge-to-edge with no float, no corner radius, no breathing room from the impersonation bar — violating the bento drawer doctrine.

## What's wrong today
Three drawers on the Policies surface bypass the canonical pattern by using `Sheet` directly:
1. **Policy Setup Wizard** — `<Sheet>` in `Policies.tsx` L440-450
2. **Policy Configurator** — `<Sheet>` in `Policies.tsx` L452-472
3. **Version History** — `<Sheet>` in `PolicyConfiguratorPanel.tsx` L341-352

`Sheet` ships full-height, flush-right, no inset, no rounded corners. `PremiumFloatingPanel` ships floating (16px inset), `rounded-xl`, `bg-card/80 backdrop-blur-xl`, spring physics, God Mode bar offset, mobile adaptation.

## Doctrine (codify)
**All slide-in detail panels in the dashboard MUST use `PremiumFloatingPanel`.** Direct `Sheet`/`SheetContent` usage is reserved for:
- Mobile sidebar drawer (already uses `PremiumFloatingPanel` via `sidebar.tsx`)
- Edge cases requiring non-floating full-height behavior (none currently exist on org dashboard)

`tokens.drawer.*` remains the styling source of truth (the panel already inherits these via its base classes).

## Scope of this wave
**Migrate the 3 policy drawers.** Out of scope: auditing the rest of the codebase for other `Sheet` usages — that's a separate sweep. The other current `Sheet` consumer (`TransactionDetailSheet`) already applies `tokens.drawer.content` and is functioning, so it's lower priority.

## Migration shape (per drawer)
Replace:
```tsx
<Sheet open={x} onOpenChange={setX}>
  <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
    <SheetHeader className="mb-6">
      <SheetTitle className={tokens.heading.page}>Policy setup</SheetTitle>
      <SheetDescription className={tokens.body.muted}>…</SheetDescription>
    </SheetHeader>
    <PolicySetupWizard … />
  </SheetContent>
</Sheet>
```

With:
```tsx
<PremiumFloatingPanel open={x} onOpenChange={setX} maxWidth="720px">
  <div className={tokens.drawer.header}>
    <h2 className={tokens.heading.page}>Policy setup</h2>
    <p className={cn(tokens.body.muted, 'mt-1')}>
      Tell us how your business operates. We'll recommend the right policy set.
    </p>
  </div>
  <div className={tokens.drawer.body}>
    <PolicySetupWizard onClose={() => setX(false)} />
  </div>
</PremiumFloatingPanel>
```

Key contracts honored automatically by `PremiumFloatingPanel`:
- 16px inset on desktop, full-screen on mobile
- `rounded-xl` corners + glass blur + shadow-2xl
- God Mode bar offset (`44px` push when impersonating — solves the visible overlap in the screenshot)
- Spring physics entry from the right
- Built-in close button (we keep `showCloseButton={true}` default)
- Backdrop click to close + ESC key

### Width tuning
- Setup wizard: `maxWidth="720px"` (form density) — wider than default `440px` because of step rail + grid radios
- Policy configurator: `maxWidth="720px"` (matches form density)
- Version history: `maxWidth="640px"` (read-only list, narrower)

### Wizard internal shell adjustments
The wizard component currently has its own outer `space-y-6`. Inside the panel's `tokens.drawer.body`, that still works — the body slot already gives `p-5` and `overflow-y-auto`. No changes to the wizard component itself; it remains panel-agnostic.

### Footer treatment
Wizard already has its own footer block at the bottom of its content. With `PremiumFloatingPanel`, the body scrolls and the footer scrolls with it (current behavior). If we want a sticky footer, that's a follow-up — not part of this strict-migration wave.

## Files touched
- `src/pages/dashboard/admin/Policies.tsx` — swap 2× `Sheet` → `PremiumFloatingPanel` (wizard + configurator)
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — swap 1× `Sheet` → `PremiumFloatingPanel` (version history)
- `mem://style/loader-unification.md` (or new entry under `mem://style/drawer-canon.md`) — codify the **"All dashboard drawers use `PremiumFloatingPanel`"** rule. Keeping it short: one file, references `tokens.drawer.*` and the panel component path.

## Out of scope (deferred)
- `TransactionDetailSheet` migration (separate domain, separate wave)
- Other `Sheet` consumers across the app (audit + batch migration is its own wave)
- Sticky footers inside the wizard (separate UX call)
- Animating step transitions (separate UX call)

## Sequencing
1. Migrate the 2 drawers in `Policies.tsx`.
2. Migrate the version history drawer in `PolicyConfiguratorPanel.tsx`.
3. Write the drawer canon memory entry.

