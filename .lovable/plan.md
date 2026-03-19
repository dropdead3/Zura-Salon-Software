

## Plan: Enable Live Dock Preview

The `/dock` route already exists and renders the full Dock app with PIN gate, schedule, mixing, etc. The only blocker is the `DockAppTab.tsx` button is disabled with "Coming Soon". We need two changes:

### 1. Enable the launch button in `DockAppTab.tsx`
- Remove `disabled` from the button
- Change label from "Launch Dock Preview (Coming Soon)" to "Launch Dock Preview"
- Replace `Lock` icon with `ExternalLink`
- Make it open `/dock` in a new tab (`window.open('/dock', '_blank')`) so it launches as a standalone full-screen app

### 2. Add a dev bypass to `DockPinGate`
The PIN gate requires a valid `login_pin` in `employee_profiles`. For testing, add a "Dev Bypass" button (only visible in development) that creates a mock staff session so you can access the full Dock UI without needing a real PIN in the database.

### Technical details
- Dev bypass checks `import.meta.env.DEV` to only show in development
- Mock session uses a placeholder userId/displayName
- The `/dock` route is already registered in `App.tsx` as a public route

