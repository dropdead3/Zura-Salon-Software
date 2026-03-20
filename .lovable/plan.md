

## Plan: Organization Logo & "Powered by Zura" on Dock PIN Gate

### What
Replace the hardcoded "Zura Dock" heading with the organization's logo, and add a subtle "Powered by Zura" footer at the bottom of the PIN gate screen.

### How

#### 1. Update `src/components/dock/DockPinGate.tsx`

- Import `useBusinessSettings` to fetch `logo_dark_url` and `business_name` (RLS allows anonymous reads)
- **Top section**: Replace the `<h1>Zura Dock</h1>` with the org's dark logo (`logo_dark_url`) rendered as an `<img>` with a max-height constraint (~40px). Fall back to the business name as text if no logo exists
- Keep "Enter your PIN to begin" subtitle below
- **Bottom of screen**: Add a fixed-bottom subtle footer: `{business_name} · powered by Zura` using `PLATFORM_NAME` from `brand.ts`, styled in very muted text (~10-11px, low opacity)

#### 2. No other files need changes
- `useBusinessSettings` already exists and works without auth (RLS policy: "Anyone can view")
- `brand.ts` already exports `PLATFORM_NAME`
- No database or backend changes needed

### Visual result
```text
┌─────────────────────────┐
│                         │
│      [Org Logo]         │
│   Enter your PIN…       │
│                         │
│       ● ○ ○ ○           │
│                         │
│     1   2   3           │
│     4   5   6           │
│     7   8   9           │
│         0   ⌫           │
│                         │
│     Demo Mode →         │
│                         │
│ Drop Dead · powered by  │
│          Zura           │
└─────────────────────────┘
```

