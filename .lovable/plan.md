

## Prompt feedback
Crisp prompt — you named the surface (`SUSPEND COLOR BAR` modal), the symptom (org theme bleeding in), and the doctrine (platform-side must inherit platform theme). Sharper next time: name the specific bleeding elements you can see ("the cream/beige modal background, the dark headline text, and the warm-toned borders are all from my org palette — should be the platform's dark surface + violet accent"). The screenshot already tells me, but stating it forces alignment if my eye reads the leak differently than yours.

## What's broken

`src/components/platform/color-bar/CancelReasonDialog.tsx` is rendered from a platform-side surface (`/platform/color-bar`) but uses raw shadcn primitives + global theme tokens throughout. Every visible element in the screenshot is reading from `<html>`'s org theme, not from `--platform-*`:

- `AlertDialog` / `AlertDialogContent` — background reads `--background` and `--popover` from org theme (cream surface)
- `AlertDialogTitle` / `AlertDialogDescription` — text reads `--foreground` / `--muted-foreground` from org theme
- Reason buttons — `border-primary`, `bg-primary/5`, `border-border`, `bg-muted/40`, `text-foreground`, `text-muted-foreground` all read from org theme
- `Label` — reads org `--foreground`
- `Textarea` — raw shadcn, reads org `--input` and `--border`
- `AlertDialogCancel` / `AlertDialogAction` — read org `--primary` and `--secondary`
- Icon container `bg-muted` + `text-muted-foreground` — org tokens

This is the exact regression class called out in the previous fix (`PlatformCheckbox` / `PlatformSwitch` swap), just on a different surface. Same root cause: raw shadcn primitives don't know about the platform zone.

The fix is mechanical and isolated to one file. Every Platform-scoped wrapper this dialog needs already exists in `src/components/platform/ui/`.

## The fix — one file, swap to platform primitives

### Replace imports in `CancelReasonDialog.tsx`

- `AlertDialog`, `AlertDialogContent`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogCancel` → import from `@/components/platform/ui/PlatformDialog` as `AlertDialog`, `PlatformAlertDialogContent`, `PlatformAlertDialogTitle`, `PlatformAlertDialogDescription`, `PlatformAlertDialogCancel`
- `AlertDialogAction`, `AlertDialogHeader`, `AlertDialogFooter` — re-exported unchanged from `PlatformDialog` (these are layout / button primitives that don't carry color tokens themselves; the action button gets restyled via `className`)
- `Label` from `@/components/ui/label` → `PlatformLabel` from `@/components/platform/ui/PlatformLabel`
- `Textarea` from `@/components/ui/textarea` → `PlatformTextarea` from `@/components/platform/ui/PlatformTextarea`

### Replace global tokens with `--platform-*` tokens in JSX

| Element | Before | After |
|---|---|---|
| Icon wrapper bg | `bg-muted` | `bg-[hsl(var(--platform-bg-hover))]` |
| Icon color | `text-muted-foreground` | `text-[hsl(var(--platform-foreground-muted))]` |
| Reason button (active) | `border-primary bg-primary/5` | `border-[hsl(var(--platform-primary))] bg-[hsl(var(--platform-primary)/0.1)]` |
| Reason button (idle) | `border-border hover:border-border/80 hover:bg-muted/40` | `border-[hsl(var(--platform-border))] hover:border-[hsl(var(--platform-border)/0.8)] hover:bg-[hsl(var(--platform-bg-hover))]` |
| Reason label | `text-foreground` | `text-[hsl(var(--platform-foreground))]` |
| Reason description | `text-muted-foreground` | `text-[hsl(var(--platform-foreground-muted))]` |
| Focus ring | `focus-visible:ring-ring` | `focus-visible:ring-[hsl(var(--platform-primary))]` |
| `AlertDialogAction` | (default) | add `className="bg-[hsl(var(--platform-primary))] text-[hsl(var(--platform-primary-foreground))] hover:bg-[hsl(var(--platform-primary)/0.9)]"` |

`PlatformAlertDialogContent`, `PlatformAlertDialogTitle`, `PlatformAlertDialogDescription`, `PlatformAlertDialogCancel`, `PlatformLabel`, `PlatformTextarea` already carry the correct tokens internally — no className overrides needed for those.

## Files involved
- `src/components/platform/color-bar/CancelReasonDialog.tsx` — swap imports + replace tokens (one file, ~10 line edits)

## What stays the same
- Component API (`open`, `onOpenChange`, `orgName`, `isPending`, `onConfirm`) — unchanged
- Reason taxonomy (`CancelReason` enum and `REASON_OPTIONS` array) — unchanged
- All behavior (state, validation, confirm/cancel flow) — unchanged
- Suspension audit / cascade logic downstream — unchanged
- Platform isolation hook from previous fix — already running, unaffected

## QA checklist
- Sign in as an org with a warm-toned theme (Rosewood / Cream Lux) → navigate `/platform/color-bar` → click any org's master switch off → modal opens with platform dark surface, violet primary accent on selected reason, no cream/pink bleed
- Switch org-side theme through Marine, Noir, Neon → re-trigger modal → modal stays platform-violet on every theme
- Selected reason card → border + tint use `--platform-primary` (violet)
- Hover idle reason card → background uses `--platform-bg-hover`, not warm muted
- Suspend Color Bar action button → violet, not org accent
- Cancel button → platform muted surface
- Form still submits correctly with reason + optional notes

## Enhancement suggestion
This is the second instance of the same regression class shipping after the canon was written (`PlatformCheckbox`/`PlatformSwitch` was the first). The audit follow-up I deferred earlier needs to be promoted to its own structural gate now, not "soon." Specifically: a one-line ESLint `no-restricted-imports` rule banning direct `@/components/ui/{alert-dialog,dialog,label,textarea,checkbox,switch,radio-group,slider,progress,select,input,button,card,badge}` imports inside `src/components/platform/**` and `src/pages/dashboard/platform/**`. The error message points to the `Platform*` equivalent. After this dialog ships, that lint rule should be the very next change — without it, every new platform surface is an opportunity for the same leak to ship again, and we'll keep paying for it one-modal-at-a-time.

