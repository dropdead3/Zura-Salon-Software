

## Add Non-Chemical Demo Appointments

**Problem:** All current demo appointments are color/chemical services (Balayage, Root Touch-Up, Highlight, Color Correction, Vivids, Toner). When the toggle is switched to show all appointments, no additional non-chemical appointments appear because none exist in the demo data.

**File:** `src/hooks/dock/dockDemoData.ts`

**Changes:** Add 4 non-chemical demo appointments across statuses so the toggle has visible effect:

| Client | Service | Status | Timing |
|---|---|---|---|
| Olivia Barnes | Signature Haircut | `checked_in` (Active) | now-20 → now+40 |
| Megan Foster | Blowout | `scheduled` | now+60 → now+105 |
| Danielle Wright | Special Event Styling | `scheduled` | now+180 → now+270 |
| Natalie Brooks | Signature Haircut + Deep Conditioning Treatment | `completed` | now-240 → now-180 |

These use services from the existing demo catalog (Haircuts, Styling, Extras). None have `has_mix_session`, so they'll be filtered out in "Color & Chemical" mode but appear when toggled to "All Appointments."

Also add corresponding `DemoClient` entries for the new clients (Megan Foster, Danielle Wright, Natalie Brooks).

