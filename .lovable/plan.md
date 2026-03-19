

# Consolidate Reorder Tab into Stock Tab

## Summary
Remove the Reorder tab entirely. Move its two unique capabilities — the **bulk email preview/send flow** and the **"Create & Email" action** — into the Stock tab. The Stock tab already has selection, qty overrides, supplier grouping, PO Builder, and Auto Build PO.

## What the Reorder Tab Has That Stock Doesn't
1. **Email preview dialog** with HTML email rendering (`buildEmailPreviewHtml`) and "Create & Send with PDF" action
2. **`useBatchCreatePurchaseOrders`** hook usage for batch PO creation + email send
3. **AI Recommendations** display (`useReplenishmentRecommendations`) — minor, can be deferred

## Changes

### 1. StockTab.tsx — Add Email Send Flow
- Import `useBatchCreatePurchaseOrders`, `fetchLogoAsDataUrl`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `ScrollArea`, `Separator`, `Tabs/TabsList/TabsTrigger/TabsContent` (for the email preview dialog), and icons `Send`, `Mail`, `Eye`
- Add state: `showEmailPreview` (boolean)
- Add `emailPreviewGroups` memo: filters `supplierGroups` to those with email + selected items
- Add `selectedWithoutEmail` memo
- Port `buildEmailPreviewHtml` function from ReorderTab
- Port `handleCreateAndEmailPOs` function (uses `batchCreatePOs.mutate`)
- Add "Create & Email" button to the **bulk action bar** (the sticky bar that shows when items are selected)
- Add the **email preview dialog** JSX (the `Dialog` with Order Summary + Email Preview tabs) at the bottom of the component, alongside existing dialogs

### 2. StockTab.tsx — Bulk Action Bar Enhancement
- Add a "Create & Email" primary button next to existing "Add Selected to PO" when emailable items are selected
- This mirrors the ReorderTab's bottom toolbar capability

### 3. BackroomInventorySection.tsx — Remove Reorder Tab
- Remove `ReorderTab` import
- Remove the Reorder `TabsTrigger` and `TabsContent`
- Update health banner: change `onClick={() => setActiveTab('reorder')}` to `onClick={() => setActiveTab('stock')}` for Out of Stock and Low Stock chips
- Remove `RefreshCcw` icon import (was only used for Reorder tab trigger)
- Update comment from "7-tab" to "6-tab"

### 4. Delete ReorderTab.tsx
- Remove `src/components/dashboard/backroom-settings/inventory/ReorderTab.tsx`

## Files
| File | Change |
|------|--------|
| `StockTab.tsx` | Add email preview dialog, batch email send, "Create & Email" button in bulk bar |
| `BackroomInventorySection.tsx` | Remove Reorder tab, update health chip nav targets |
| `ReorderTab.tsx` | Delete file |

