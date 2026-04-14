

# Receipt Improvements — Black/White Only + Logo Size Selectors

## Problem
1. The accent color picker allows colored dividers, but printed/emailed receipts are black and white. The accent color concept should be limited to grayscale shades only, or removed entirely in favor of a simple gray.
2. Review platform links render in `text-blue-500` — should be black.
3. No way to control the size of the header logo or the footer icon logo.

## Changes

### `src/hooks/useReceiptConfig.ts`
- Add two new fields: `logo_size: 'sm' | 'md' | 'lg'` (default `'md'`) and `footer_icon_size: 'sm' | 'md' | 'lg'` (default `'sm'`).

### `src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx`

**Preview fixes (black/white only):**
- Remove `accentColor` variable. Replace all `style={{ borderBottom: \`1px solid ${accentColor}\` }}` with a static `borderBottom: '1px solid #e5e5e5'` (light gray, standard receipt divider).
- Line 123: Change `text-blue-500` on review platform names to `text-gray-600` — no color on receipts.

**Remove accent color picker entirely** (lines 380-403): Since receipts are B&W, remove the color input, hex input, and reset button. Remove `accent_color` from the config interface if desired, or simply hide the control and keep the field for backward compat.

**Add Logo Size selector** under the Logo Position select (inside the `local.show_logo` conditional block):
- Label: "Logo Size"
- Select with three options: Small (h-6), Medium (h-10), Large (h-14)
- Maps to `local.logo_size`

**Add Footer Icon Size selector** under the Footer Icon toggle (inside the `local.show_footer_icon` conditional):
- Label: "Icon Size"  
- Select: Small (h-4), Medium (h-6), Large (h-8)
- Maps to `local.footer_icon_size`

**Preview rendering:**
- Header logo: Replace fixed `className="h-10"` with dynamic height based on `config.logo_size` (`sm`→`h-6`, `md`→`h-10`, `lg`→`h-14`)
- Footer icon: Replace fixed `className="h-6"` with dynamic height based on `config.footer_icon_size` (`sm`→`h-4`, `md`→`h-6`, `lg`→`h-8`)

### `src/components/dashboard/transactions/ReceiptPrintView.tsx`
- Apply matching logo/icon size logic to the print template HTML.
- Ensure no colored elements exist — all text black/gray, all borders light gray.

