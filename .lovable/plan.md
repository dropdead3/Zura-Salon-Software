

## Shorten "Enable Product Billing" Column Header for Responsiveness

### Problem
The column header "Enable Product Billing" is too long for narrow container widths — it clips to "Ena… Prod… Bill…" as shown in the screenshot.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

1. **Column header (line 714)**: Replace the static text with two spans — show "Billing" by default, show "Enable Product Billing" only at wider container widths:
   ```tsx
   <span className="@[800px]:hidden">Billing</span>
   <span className="hidden @[800px]:inline">Enable Product Billing</span>
   ```

2. **Inline toggle labels in the detail panel (lines 886, 1200)**: These are already inside the narrow-only dropdown, so "Enable Product Billing" is fine there — no change needed.

3. **Remove `min-w-[180px]`** from the Service column header if present, to allow better flex at narrow widths (optional, will check if it's causing issues).

### Result
- At narrower container widths: header reads simply "Billing" — clean, no clipping
- At wider widths (≥800px container): full "Enable Product Billing" text displays
- No functionality change

