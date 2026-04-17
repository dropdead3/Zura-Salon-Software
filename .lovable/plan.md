

## Prompt review

Clear ask — names the surface (booking wizard) and the symptom (everything is small/hard to read). Sharper next time: tell me which **device class** is suffering most (desktop, iPad, phone) and whether you want bigger text **everywhere** or just on the confirm step (since other steps like the service grid have density tradeoffs). I'll assume desktop + all steps and flag the iPad case.

## Diagnosis

`QuickBookingPopover` (panel mode) was sized for a tight 440-px floating card:
- Container caps at `sm:max-w-md` (≈448px)
- Body copy: `text-xs` (12px) and `text-[10px]` (10px) labels
- Avatars: `h-8`/`h-10`, icon chips `w-6 h-6` to `w-7 h-7`
- Form controls: `h-8` selects/inputs
- Footer total: `text-lg` (18px) — fine, but disclaimers at `text-[10px]`
- Buttons: `h-10`

Per your screenshot, the legibility hit lands on: row labels ("Location", "Date & Time", "Duration"), service rows, the stylist row, the Redo/Assistant toggles, and the disclaimer copy.

## Plan — Wave 22.7: Booking wizard legibility pass

### Behavior

Bump the panel one tier up the type/size ladder so it reads comfortably on a 14"+ display while staying compact enough not to push content off-screen. Confirm step gets the most lift; earlier steps follow the same token shifts.

### Size shifts

| Element | Before | After |
|---|---|---|
| Panel max width | `sm:max-w-md` (448px) | `sm:max-w-lg` (512px) |
| Outer body padding | `p-3 space-y-3` | `p-4 space-y-4` |
| Section labels (SERVICES/STYLIST) | `text-[10px]` | `text-xs` |
| Row labels (Location/Date/Duration) | `text-[10px]` | `text-xs` |
| Row values | `text-xs` (12px) | `text-sm` (14px) |
| Client name in chip | `text-sm` | `text-base` |
| Client phone/email | `text-xs` | `text-sm` |
| Service name | `text-xs` | `text-sm` |
| Service duration | `text-[10px]` | `text-xs` |
| Service price | `text-xs` | `text-sm` |
| Stylist name | `text-sm` | `text-base` |
| Icon chips (location/date/duration) | `w-7 h-7` icon `h-3.5` | `w-9 h-9` icon `h-4` |
| Service icon chip | `w-6 h-6` icon `h-3` | `w-8 h-8` icon `h-4` |
| Stylist avatar | `h-8 w-8` | `h-10 w-10` |
| Redo/Assistant labels | `text-xs` | `text-sm` |
| Switches (`scale-90`) | scaled down | remove `scale-90` (default size) |
| Form inputs/selects | `h-8 text-xs` | `h-9 text-sm` |
| Footer disclaimers | `text-[10px]` | `text-xs` |
| Total label | `text-sm` | `text-base` |
| Total value | `text-lg` | `text-xl` |
| Buttons (Save/Confirm) | `h-10` | `h-11`, button text `text-sm` → `text-base` |
| Add special notes link | `text-xs` | `text-sm` |

### Header (top of panel)

Already legible per screenshot, but align with the new density:
- "New Booking" title `text-sm` → `text-base`
- Subtitle ("Fri, Apr 17 at 4:15 PM") `text-xs` → `text-sm`
- Header icon button `h-8 w-8` → `h-9 w-9`
- Step progress bar height stays — it's a graphic element, not text

### Earlier steps (apply same token map)

- Service grid: name `text-xs` → `text-sm`, duration/price labels follow
- Stylist picker rows: name `text-sm` → `text-base`, level badge `text-[10px]` → `text-xs`, avatar `h-8` → `h-10`
- Client search input + result rows: input `h-9 text-sm`, result name `text-sm` → `text-base`, meta `text-xs` → `text-sm`
- Date/time tiles: time labels `text-xs` → `text-sm`

### Container width

Bump `sm:max-w-md` → `sm:max-w-lg` (panel mode only). The popover-mode centered modal stays at 440px (it's an inline column-click affordance, different ergonomics).

### What stays small (intentional)

- The 5-segment progress bar (graphic, not text)
- Internal counters/badges where compact density carries meaning (e.g., add-on count chips)
- The "+ Add special notes" inline trigger stays subtle (text-sm, muted) — it's an opt-in, not a primary action

### Acceptance checks

1. Confirm step row labels ("Location", "Date & Time", "Duration") are readable without leaning in
2. Service names render at `text-sm`, prices align right and don't wrap
3. Stylist row avatar grows to 40px, name reads at `text-base`
4. Total value renders at `text-xl`, disclaimers at `text-xs` (not 10px)
5. Save for Later / Confirm Booking buttons are `h-11` with `text-base` labels
6. Panel still fits within viewport at `sm:max-w-lg` (512px) on a 1280-wide display without horizontal scroll
7. Earlier steps (client / service / stylist / date) inherit the same scale shifts — no step is left mismatched
8. Switches in Redo/Assistant rows render at default size (no `scale-90`)
9. No regression to the popover-mode (column-click) variant — width stays 440px there

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — token shifts across all step renderers, panel container width, footer

### Open question

Want me to also bump the header sizes (title + subtitle + step bar height) for full visual consistency, or keep the header tight to maximize body real estate? My recommendation: bump the header too — current `text-sm` / `text-xs` will look mismatched once the body grows.

### Deferred

- **P2** Add a user preference toggle "Compact vs Comfortable booking wizard" stored on user_settings — trigger: when power-users (front desk on small monitors) ask for the old density back
- **P2** Apply the same legibility pass to `DockNewBookingSheet` (iPad prep station) — trigger: when Dock users report similar small-text complaints; Dock has its own 180px-card density rules so this needs a separate token map
- **P2** Tablet-specific layout (`md:` breakpoint) that switches to a two-column confirm step (services left, stylist+notes right) — trigger: when iPad usage of the front-desk schedule grows

