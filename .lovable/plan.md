

# Zura Pay Configurator — Full Rebuild of Terminal Settings

## Summary
Transform the current "Terminals" settings page from a flat list of cards into a tabbed **Zura Pay Configurator** — a cohesive hub for all payment hardware, connectivity, and display configuration. The entry point card is renamed from "Terminals" to "Zura Pay" with updated branding copy, and the content is restructured into four focused tabs.

## Current State
- Settings card: labeled "Terminals" with description referencing "Stripe Terminal"
- Content: a single scrollable column of cards (location picker → terminal locations → readers → offline status → purchase → checkout display concept)
- ~1150 lines in one file, mixing fleet management, purchasing, and display preview

## Proposed Structure

```text
┌──────────────────────────────────────────────────┐
│  ZURA PAY                                        │
│  Your complete in-person payment configurator    │
├──────────────────────────────────────────────────┤
│  [Fleet]  [Hardware]  [Connectivity]  [Display]  │
├──────────────────────────────────────────────────┤
│                                                  │
│  (Tab content renders here)                      │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Tab 1: Fleet
- Location picker (existing)
- All Locations Summary (existing)
- Terminal Locations card (existing) — create, delete, reader count badges
- Terminal Readers card (existing) — register, delete, firmware/IP metadata

### Tab 2: Hardware
- Order Terminal card (existing purchase flow, pricing, accessories, checkout dialog)
- Order History (existing request history list)

### Tab 3: Connectivity
- OfflinePaymentStatus card (existing) — shown unconditionally in this tab
- NeverDown Payments callout (new, small) — brief explainer of cellular failover and store-and-forward

### Tab 4: Display
- CheckoutDisplayConcept with S710 simulator (existing)

## Changes

### 1. Rename settings entry point
**File:** `src/pages/dashboard/admin/Settings.tsx`
- Change `terminals` label from "Terminals" to "Zura Pay"
- Update description: "Configure your Zura Pay hardware fleet, purchase readers, monitor connectivity, and preview checkout display."
- Remove "Stripe" from description
- Change icon to `CreditCard` (more payment-focused)

### 2. Decompose into tab-based layout
**File:** `src/components/dashboard/settings/TerminalSettingsContent.tsx`
- Add `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` at the top level
- Move existing card groups into their respective tab panels
- Extract sub-components into separate files for maintainability:
  - `terminal/ZuraPayFleetTab.tsx` — location picker, summary, terminal locations, readers
  - `terminal/ZuraPayHardwareTab.tsx` — purchase card + order history (the existing `TerminalPurchaseCard`)
  - `terminal/ZuraPayConnectivityTab.tsx` — OfflinePaymentStatus + NeverDown callout
  - `terminal/ZuraPayDisplayTab.tsx` — thin wrapper around CheckoutDisplayConcept

### 3. Add page-level header inside TerminalSettingsContent
- Use existing card header pattern with `CreditCard` icon
- Title: "ZURA PAY" (font-display)
- Subtitle: "In-person payment infrastructure for your locations."
- No back button (parent settings handles that)

### 4. Connectivity tab — NeverDown callout
- Small informational card explaining "NeverDown Payments" as the value proposition
- Uses `ShieldCheck` icon and emerald accent styling (consistent with existing patterns)
- Static content — no data fetching

### 5. Preserve all existing functionality
- All hooks, mutations, dialogs, and state management remain identical
- RegisterReaderDialog, delete confirmations — all stay
- useEffect for payment verification stays in Hardware tab
- `useZuraPayLocations` query stays as-is

## Files Modified
| File | Action |
|------|--------|
| `src/pages/dashboard/admin/Settings.tsx` | Update label, description, icon for `terminals` |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Refactor into tabbed shell, extract sub-components |
| `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` | New — fleet management UI |
| `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx` | New — purchase + order history |
| `src/components/dashboard/settings/terminal/ZuraPayConnectivityTab.tsx` | New — connectivity + NeverDown |
| `src/components/dashboard/settings/terminal/ZuraPayDisplayTab.tsx` | New — display preview wrapper |

## Technical Details
- Tabs use the existing `@/components/ui/tabs` (Radix-based)
- Tab triggers use `font-sans` per UI Canon (never uppercase on tab triggers)
- All state that spans tabs (like `selectedLocationId`, `showAllLocations`) remains in the parent `TerminalSettingsContent` and is passed down as props
- The `RegisterReaderDialog` and `AlertDialog` confirmations remain at the parent level since they're triggered from Fleet tab but need portal-level rendering
- No new dependencies, no migrations, no edge function changes
- Existing bug fixes from the previous plan (refs, failedImages, dialog reset) are preserved

