

## Fix Dock Confirmation Dialog UI + Add Tokenization

**Problem:** The no-show/cancellation confirmation dialogs render with light-theme defaults (`bg-background`, `text-muted-foreground`) from the base `AlertDialogContent` component. The `DOCK_DIALOG.content` token classes get merged but the underlying `bg-background` still bleeds through, and the overlay uses `fixed` positioning (should be `absolute` for dock containment). The result is a transparent-looking, improperly themed dialog.

### Root causes

1. **`AlertDialogContent`** (line 37) has hardcoded `bg-background border` — the dock's `bg-[hsl(var(--platform-bg-card))]` class competes with it
2. **`AlertDialogOverlay`** uses `fixed inset-0` — breaks dock's `absolute inset-0` containment model
3. **`AlertDialogAction`/`AlertDialogCancel`** apply `buttonVariants()` defaults that override dock token classes
4. **`DOCK_DIALOG` tokens** lack button border-radius and padding specs for the dock's rounded pill style

### Fix

#### 1. `src/components/dock/dock-ui-tokens.ts` — Expand `DOCK_DIALOG` tokens

Add comprehensive dialog tokens matching the dock's premium dark visual identity:

- `overlay`: `'absolute inset-0 z-50 bg-black/60 backdrop-blur-sm'` (absolute containment + blur)
- `content`: Add explicit `!bg-[hsl(var(--platform-bg-card))]` with `!border` override, proper padding, max-width constraint
- `cancelButton`: Add `rounded-full` pill shape, proper padding
- `destructiveAction` / `warningAction`: Add `rounded-full` pill shape, proper padding, font-display

#### 2. `src/components/dock/schedule/DockScheduleTab.tsx` — Use custom dock dialog instead of default AlertDialog

Replace the `AlertDialog` with a custom dock-contained confirmation overlay using `AnimatePresence` + `motion.div` (consistent with all other dock overlays per memory). This avoids fighting the base AlertDialog's fixed positioning and light-theme defaults entirely.

The custom overlay structure:
- Backdrop: `absolute inset-0 z-50` with blur (uses `DOCK_DIALOG.overlay` token)
- Dialog panel: `absolute` centered card with `DOCK_DIALOG.content` token
- Title: `DOCK_DIALOG.title` token (font-display, tracking-wide)
- Description: `DOCK_DIALOG.description` token
- Buttons: `DOCK_DIALOG.cancelButton` / `warningAction` / `destructiveAction` tokens with pill shape

This aligns with the dock UI standard: all overlays use `absolute inset-0` with framer-motion spring physics, not Radix portals with `fixed` positioning.

#### 3. Token updates in `dock-ui-tokens.ts`

```ts
export const DOCK_DIALOG = {
  overlay: 'absolute inset-0 z-50 bg-black/60 backdrop-blur-sm',
  content: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-3rem)] max-w-sm bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] rounded-2xl shadow-2xl p-6 space-y-4',
  title: 'font-display text-xl tracking-wide uppercase text-[hsl(var(--platform-foreground))]',
  description: 'text-sm leading-relaxed text-[hsl(var(--platform-foreground-muted))]',
  cancelButton: 'w-full h-12 rounded-full border border-[hsl(var(--platform-border)/0.3)] bg-transparent text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground-muted)/0.1)] font-medium transition-colors',
  destructiveAction: 'w-full h-12 rounded-full border-0 bg-red-500/20 text-red-400 hover:bg-red-500/30 font-display tracking-wide transition-colors',
  warningAction: 'w-full h-12 rounded-full border-0 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-display tracking-wide transition-colors',
  buttonRow: 'flex gap-3 pt-2',
};
```

### Summary

| File | Change |
|------|--------|
| `dock-ui-tokens.ts` | Expand `DOCK_DIALOG` with overlay, content, buttonRow tokens |
| `DockScheduleTab.tsx` | Replace Radix AlertDialog with custom motion overlay using dock tokens |

Two files. Replaces broken Radix portal dialog with dock-native overlay that respects absolute containment and platform theme tokens.

