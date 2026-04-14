

# Rebuild Display Tab — Live Config-Driven Simulator

## Problem
The current Display tab has a fake "Customize Preview" editor where users manually type cart items and business names. This is pointless — no org needs to customize a preview. The simulator should reflect the **actual configured checkout flow** using real settings from the database.

## Architecture

The simulator already renders 7 screens (Splash → Idle → Cart → Tip → Tap → Processing → Success). The change is **data source**, not structure.

```text
Current:  useState defaults → Simulator
Proposed: useBusinessSettings + useTipConfig + useReceiptConfig → Simulator
```

## Changes

### 1. `CheckoutDisplayConcept.tsx` — Gut the Editor, Wire Real Data

**Remove entirely:**
- The `editing` state, `previewName` state, `cartItems` state
- The "Customize Preview" panel (lines 98–171) — the entire editable section
- `updateItem`, `addItem`, `removeItem` helpers

**Add:**
- Import `useColorBarSetting` to fetch `tip_config`
- Import `useReceiptConfig` to fetch receipt branding (custom message/slogan, accent color)
- Pass real data to the simulator:
  - `businessName` from the existing prop (already sourced from `useBusinessSettings`)
  - `tipPercentages` from `tip_config.percentages` (default `[20, 25, 30]`)
  - `tipEnabled` from `tip_config.enabled`
  - `receiptSlogan` from receipt config's `custom_message`
  - `orgLogoUrl` already threaded through
- Keep the **S710 Specs** panel and **Checkout Experience** summary panel
- Replace the editor panel with a **"Live Configuration"** summary card showing current settings pulled from the database (tip %, tipping on/off, receipt slogan) — read-only, with links to the relevant config tabs

**Cart items** become a static representative sample (hardcoded defaults) since the actual cart varies per appointment. Label it "Sample transaction" in the UI.

### 2. `S710CheckoutSimulator.tsx` — Accept Config Props

**New props:**
- `tipPercentages?: number[]` — defaults to `[20, 25, 30]`, used by `TipScreen`
- `tipEnabled?: boolean` — if `false`, skip the tip screen entirely in the auto-play sequence
- `receiptSlogan?: string` — shown on the success screen (e.g. "Thank you for visiting!")

**TipScreen** already accepts `tipPercentages` — just thread it from the top-level props.

**Screen sequence** becomes dynamic: if `tipEnabled === false`, filter `'tip'` out of the `screens` array.

**SuccessScreen** enhancement: if `receiptSlogan` is provided, display it below "Thank you".

### 3. `ZuraPayDisplayTab.tsx` — No Changes Needed
Already threads `businessName` and `orgLogoUrl`. The new hooks will be consumed inside `CheckoutDisplayConcept` directly.

## What Users See After This

- The simulator auto-plays through the actual configured checkout flow
- If tipping is disabled in the Tipping tab, the tip screen is skipped in the simulator
- The tip percentages match what's configured
- The receipt slogan/message appears on the success screen
- A read-only "Live Configuration" card replaces the editor, showing current settings with quick-links to Tipping and Receipts tabs
- Device specs and experience summary panels remain unchanged

## Files Modified
1. `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx` — Major rewrite
2. `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx` — Add props, dynamic screen sequence

