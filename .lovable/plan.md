

## Add Action Menu to Formula Bowl Card (3-Dot Ellipsis)

### Problem
The MoreVertical icon on bowl cards is purely decorative — tapping it does nothing. Based on the reference screenshot, it should open an action menu with options.

### Design
When the 3-dot icon is tapped on a bowl card, show a bottom action sheet (consistent with the Dock's mobile-first UX) with these options:

1. **Edit Formula** — opens the bowl detail/dispensing view (same as tapping the card)
2. **Change Service** — reassign the bowl to a different service on the appointment
3. **Add To Favorites** — placeholder action (toast for now)
4. **View Notes** — placeholder action (toast for now)
5. **Rename Formula** — inline rename with a small dialog
6. **Remove Formula** — destructive action with confirmation

The menu will be triggered by stopping propagation on the 3-dot icon tap (so it doesn't also open the bowl), then rendering an action sheet overlay.

### Changes

**1. New file: `src/components/dock/mixing/DockBowlActionSheet.tsx`**
- Bottom sheet overlay with 6 action buttons (full-width, large touch targets)
- Props: `open`, `onClose`, `onAction(action: string)`
- Styled to match Dock's platform tokens and the reference screenshot (rounded buttons, dark bg)
- "Remove Formula" in red/destructive styling at the bottom

**2. `src/components/dock/appointment/DockServicesTab.tsx`**
- Add state: `bowlMenuTarget` (which bowl's menu is open)
- Wrap the MoreVertical icon in both `BowlCard` and `DemoBowlCard` with an `onClick` handler that stops propagation and opens the action sheet
- Render `DockBowlActionSheet` conditionally
- Handle actions:
  - **Edit Formula**: trigger the same `onTap` as the card
  - **Change Service**: placeholder toast for now
  - **Add To Favorites**: placeholder toast
  - **View Notes**: placeholder toast
  - **Rename Formula**: open a small rename dialog (text input + confirm)
  - **Remove Formula**: confirmation overlay, then remove bowl from state (demo) or delete from DB

**3. New file: `src/components/dock/mixing/DockRenameBowlDialog.tsx`**
- Small dialog with text input for renaming the formula
- Updates the bowl's display name in state (demo) or DB

### Files
- `src/components/dock/mixing/DockBowlActionSheet.tsx` — new
- `src/components/dock/mixing/DockRenameBowlDialog.tsx` — new
- `src/components/dock/appointment/DockServicesTab.tsx` — wire up menu

