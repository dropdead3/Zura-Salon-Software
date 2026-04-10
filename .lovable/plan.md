

# Fix: God Mode Bar Overlap on Sheets, Dialogs, and Team Chat

## Problem

The God Mode bar (44px, fixed top, z-60) overlaps several UI surfaces:
- **Sheet drawers** (Transactions, Appointments): `SheetContent` uses `fixed inset-y-0` — starts at `top: 0`, hidden behind the bar
- **Sheet/Dialog overlays**: `fixed inset-0` — backdrop covers the God Mode bar
- **TeamChat mobile sidebar**: `fixed inset-0` — same issue

The `PremiumFloatingPanel` already handles this correctly (lines 92-99 of `premium-floating-panel.tsx`). Sheets and Dialogs do not.

## Solution

Use a CSS custom property `--god-mode-offset` set on the root layout div, then consume it in `Sheet` and `Dialog` components. This is a single-source-of-truth approach that automatically propagates to all instances.

### 1. Set CSS variable — `DashboardLayout.tsx`

Add `'--god-mode-offset': isImpersonating ? '44px' : '0px'` to the root div's style prop (line 430). This makes it available to all descendants and portaled elements via `:root`-level propagation.

Actually, since Sheet/Dialog use Radix portals (rendering into `document.body`), the CSS variable needs to be on `document.body` or `:root`. We'll set it on `<body>` via a `useEffect` in `DashboardLayout`.

### 2. Update `Sheet` — `src/components/ui/sheet.tsx`

- **SheetOverlay**: Change `fixed inset-0` to include `top: var(--god-mode-offset, 0px)` via inline style
- **SheetContent** (side variants): For `right` and `left` variants, replace `inset-y-0` with explicit `top` / `bottom` positioning that respects the offset. Add `style={{ top: 'var(--god-mode-offset, 0px)' }}` for side panels.

### 3. Update `Dialog` — `src/components/ui/dialog.tsx`

- **DialogOverlay**: Add `style={{ top: 'var(--god-mode-offset, 0px)' }}` so the backdrop doesn't cover the God Mode bar

### 4. TeamChat mobile sidebar — `src/components/team-chat/TeamChatContainer.tsx`

- The mobile sidebar overlay at line 29 (`fixed inset-0`) needs `style={{ top: 'var(--god-mode-offset, 0px)' }}`

## Files

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardLayout.tsx` | Add `useEffect` to set `--god-mode-offset` on `document.documentElement` |
| `src/components/ui/sheet.tsx` | Add God Mode offset to overlay and content positioning |
| `src/components/ui/dialog.tsx` | Add God Mode offset to overlay |
| `src/components/team-chat/TeamChatContainer.tsx` | Add offset to mobile sidebar overlay |

## Why This Approach

- CSS custom property on `:root` is inherited by all portaled elements automatically
- No need to pass `isImpersonating` into every Sheet/Dialog consumer
- Consistent with how `PremiumFloatingPanel` already solves this
- Single change propagates to all ~16 drilldown dialogs and all sheet-based drawers

