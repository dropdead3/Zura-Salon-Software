

## Tokenize Dock Confirmation Dialogs

**Problem:** The Cancel/No-Show confirmation dialog in `DockScheduleTab.tsx` uses raw inline classes (`bg-[hsl(var(--platform-bg-card))]`, `border-[hsl(var(--platform-border)/0.3)]`, etc.) instead of design tokens. This violates the project's tokenization standards and makes the dialog styling inconsistent and hard to maintain.

### Changes

**File: `src/components/dock/dock-ui-tokens.ts`**

Add a `DOCK_DIALOG` token group:

```ts
export const DOCK_DIALOG = {
  overlay: 'absolute inset-0 bg-black/40 backdrop-blur-sm z-50',
  content: 'bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground))] rounded-xl shadow-2xl',
  title: 'font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]',
  description: 'text-sm text-[hsl(var(--platform-foreground-muted))]',
  cancelButton: 'bg-transparent border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground-muted)/0.1)]',
  destructiveAction: 'bg-red-600 hover:bg-red-700 text-white',
  warningAction: 'bg-amber-600 hover:bg-amber-700 text-white',
} as const;
```

**File: `src/components/dock/schedule/DockScheduleTab.tsx`**

- Import `DOCK_DIALOG` from `dock-ui-tokens`
- Replace all raw classes on the AlertDialog with token references:
  - `AlertDialogContent` → `className={DOCK_DIALOG.content}`
  - `AlertDialogTitle` → `className={DOCK_DIALOG.title}`
  - `AlertDialogDescription` → `className={DOCK_DIALOG.description}`
  - `AlertDialogCancel` → `className={DOCK_DIALOG.cancelButton}`
  - `AlertDialogAction` → use `DOCK_DIALOG.destructiveAction` for Cancel, `DOCK_DIALOG.warningAction` for No-Show (conditionally)

Two files, token definitions + class replacements. No logic changes.

