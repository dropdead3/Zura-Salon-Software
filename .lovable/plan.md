

## Restyle EditServicesDialog for Dock Dark Theme

### Problem
The `EditServicesDialog` uses light-theme semantic classes (`bg-background`, `text-muted-foreground`, `border-border`) and base shadcn components (`DialogContent`, `Button`, `Badge`). When rendered inside the dark Dock, it clashes with the `--platform-*` dark theme.

### Approach
Since this dialog is shared between the org dashboard (light theme) and the Dock (dark theme), add a `variant` prop:
- `variant="default"` — current light-theme styling (used by dashboard/hub)
- `variant="dock"` — dark platform styling using `hsl(var(--platform-*))` tokens

### Changes

**File: `src/components/shared/EditServicesDialog.tsx`**

1. Add `variant?: 'default' | 'dock'` prop
2. When `variant === 'dock'`, apply dark classes:
   - `DialogContent`: `bg-[hsl(var(--platform-bg-elevated))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))]`
   - Search input: `bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground))]`
   - Category headers: `text-[hsl(var(--platform-foreground-muted))]`
   - Service rows: hover `bg-[hsl(var(--platform-bg-card))]`, selected `bg-violet-500/10`
   - Checkboxes: selected `bg-violet-500 border-violet-500`
   - Chips: `bg-[hsl(var(--platform-bg-card))] text-[hsl(var(--platform-foreground))] border-[hsl(var(--platform-border)/0.3)]`
   - Footer text: `text-[hsl(var(--platform-foreground-muted))]`
   - Save button: `bg-violet-500 hover:bg-violet-600 text-white rounded-full`
   - Separator: `bg-[hsl(var(--platform-border)/0.3)]`

**File: `src/components/dock/appointment/DockAppointmentDetail.tsx`**

- Pass `variant="dock"` to `EditServicesDialog`

Dashboard/Hub callers remain unchanged (default variant).

