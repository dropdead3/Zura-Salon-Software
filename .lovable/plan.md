

## Standardize Hub Card Titles to Termina (font-display)

The screenshot confirms titles should use Termina. Currently `ManagementCard` (in TeamHub, ClientHub, GrowthHub) uses `font-sans text-sm font-medium` -- should use `tokens.card.title` (`font-display text-base tracking-wide`).

`HubGatewayCard` already uses `font-display` but with `text-sm` and explicit `uppercase` -- should also use `tokens.card.title` for consistency (the token is `text-base tracking-wide` without forced uppercase).

### Changes

**All three hub files** -- update `HubCard` / `ManagementCard` title `<h3>` from:
```
font-sans text-sm font-medium
```
to:
```
tokens.card.title  →  "font-display text-base tracking-wide"
```

**TeamHub.tsx `HubGatewayCard`** -- update title from raw `font-display text-sm tracking-wide uppercase` to `tokens.card.title` (drops forced uppercase and normalizes to `text-base`).

**TeamHub.tsx `ManagementCard`** -- same swap from `font-sans text-sm font-medium` to `tokens.card.title`.

Files touched: `TeamHub.tsx`, `ClientHub.tsx`, `GrowthHub.tsx` -- one line each (two in TeamHub for both card types).

