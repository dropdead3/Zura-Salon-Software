

# Receipt Configurator

## Current State
`ReceiptPrintView.tsx` renders a hardcoded receipt with:
- Org name as plain text (no logo)
- Fixed footer: "Thank you for your visit!"
- No branding, no custom colors, no configurable fields

No receipt settings exist in `site_settings` or any other table.

## Design

### Data Layer
Store receipt configuration in `site_settings` with `id = 'receipt_config'`, org-scoped. Schema:

```text
{
  show_logo: boolean           // Show org logo at top
  logo_position: 'center'|'left'
  show_address: boolean        // Show salon address
  show_phone: boolean          // Show salon phone
  custom_message: string       // "We can't wait to see you again!"
  show_stylist: boolean        // Show stylist name on receipt
  show_payment_method: boolean
  accent_color: string         // Optional brand accent (hex)
  footer_text: string          // Optional secondary footer line
}
```

### Hook
New `useReceiptConfig.ts` — follows existing `useSiteSettings` pattern. Reads/writes `receipt_config` from `site_settings`, org-scoped. Provides defaults so receipts work without configuration.

### Configurator UI
New tab or card inside the Zura Pay Configurator (`TerminalSettingsContent.tsx`) — a "Receipts" sub-tab alongside Fleet, Hardware, Display, Connectivity. Contains:

- **Logo toggle** + position selector (pulls from `business_settings.logo_dark_url`)
- **Show address / phone toggles** (pulls from `business_settings`)
- **Custom message input** (text field, 120 char limit)
- **Footer text input** (secondary line, e.g. salon slogan)
- **Show stylist / payment method toggles**
- **Live preview panel** — renders a mock receipt side-by-side using the current settings, updating in real-time as the operator adjusts toggles

### Receipt Rendering
Update `ReceiptPrintView.tsx` to accept a `ReceiptConfig` parameter and render accordingly:
- Logo image at top (from `business_settings.logo_dark_url`)
- Address block if enabled
- Custom message replaces hardcoded "Thank you for your visit!"
- Footer text below
- Accent color on dividers

The same config will be usable by future email/SMS receipt sending.

### Navigation
Add "Receipts" as a sub-tab in the Zura Pay Configurator (alongside Fleet, Hardware, Connectivity, Display, Activation Checklist). No new top-level nav entry needed.

## Files

| File | Action |
|---|---|
| `src/hooks/useReceiptConfig.ts` | **New** — CRUD hook for receipt settings via `site_settings` |
| `src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx` | **New** — Configurator UI with toggles, inputs, and live preview |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | **Modify** — Add "Receipts" sub-tab |
| `src/components/dashboard/transactions/ReceiptPrintView.tsx` | **Modify** — Accept config, render logo/address/custom message |

No migrations needed — uses existing `site_settings` table. No edge function changes.

