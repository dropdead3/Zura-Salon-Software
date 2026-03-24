

## Add Formula History Quick-Access on Services Tab

### Approach

Add a small floating button in the bottom-left corner of the Services tab (mirroring the lock icon position on the opposite side). Tapping it opens a bottom sheet showing the client's formula history — each entry with date, service name, stylist, formula type, and a compact ingredient list.

### Changes

**1. New component: `src/components/dock/appointment/DockFormulaHistorySheet.tsx`**

A top-anchored sheet (matching Dock conventions) containing:
- Header: "Formula History" + client name
- List of formula entries from `useClientFormulaHistory(clientId)`, each showing:
  - Date (formatted), service name, stylist name
  - Formula type badge (actual/refined)
  - Compact ingredient list (product name + weight, truncated to 3 lines)
- Empty state if no history
- Uses `DOCK_SHEET` tokens, `px-7` spacing

**2. Update `src/components/dock/appointment/DockServicesTab.tsx`**

- Import the new sheet + `History` icon from lucide
- Add state: `showFormulaHistory`
- Render a small circular button in the bottom-left (absolute positioned, `bottom-4 left-5 z-[25]`) with a `History` icon — subtle glass style matching the lock button aesthetic
- Render `<DockFormulaHistorySheet>` controlled by that state, passing `appointment.client_id` and `appointment.client_name`
- Only show the button when a `client_id` exists on the appointment

### Result

Stylists get one-tap access to the client's full formula history without leaving the Services tab. The button sits unobtrusively in the bottom-left, balancing the lock icon in the bottom-right.

