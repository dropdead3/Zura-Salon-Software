

## Update "Launch Dock Preview" to Open Org-Less Demo with Real-Style Faux Data

### What Changes

**1. Update `DockAppTab.tsx` button to open `/dock?demo=preview`**
- Change the "Launch Dock Preview" button from `/dock` to `/dock?demo=preview`
- This uses the special sentinel value `preview` (not a UUID) to signal "generic demo, no org"

**2. Update `Dock.tsx` to handle `?demo=preview` as a pure-faux-data demo**
- When `demoOrgId === 'preview'`, create a session with `organizationId: 'demo-org-000'` (the sentinel that triggers `usesRealData = false` in the context)
- This ensures the Dock boots into full mock-data mode with no DB queries

**3. Replace `DEMO_SERVICES` with Drop Dead Salons' real service catalog**
- Replace the current 10 generic services in `dockDemoData.ts` with the actual Drop Dead Salons menu (~70 services across Blonding, Color, Vivids, Haircuts, Styling, Extensions, Extras, Consultation categories)
- This gives the preview a realistic, rich service catalog that looks like a real salon

### Files Changed

| File | Change |
|------|--------|
| `src/components/platform/backroom/DockAppTab.tsx` | Change button URL to `/dock?demo=preview` |
| `src/pages/Dock.tsx` | Handle `demo=preview` sentinel → `organizationId: 'demo-org-000'` |
| `src/hooks/dock/dockDemoData.ts` | Replace `DEMO_SERVICES` with full Drop Dead Salons catalog (~70 services across 8 categories) |

### Data Preview (sample from each category)

- **Blonding**: Full Balayage ($240, 270min), Full Highlight ($240, 240min), Lightener Retouch ($155, 120min), etc.
- **Color**: Single Process Color ($145, 90min), Root Smudge + Blowout ($120, 90min), Glaze + Blowout ($130, 60min), etc.
- **Vivids**: Full Vivid ($130, 120min), Custom Vivid ($170, 120min), Vivid Toner ($25, 30min), etc.
- **Haircuts**: Signature Haircut ($75, 60min), Clipper Cut ($40, 45min), Buzz Cut ($35, 30min), etc.
- **Styling**: Blowout ($50, 45min), Special Event Styling ($85, 90min), etc.
- **Extensions**: 1-3 Row installs/reinstalls, tape-in, removal, etc.
- **Extras**: Deep Conditioning ($25, 15min), CPR Treatment ($50, 90min), Clear Gloss ($50, 30min), etc.

