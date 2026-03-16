

# Center & Improve Social Proof Section

## Changes (BackroomPaywall.tsx, lines 430–446)

1. **Center everything** — Change `items-center lg:items-start` to `items-center` and `text-center lg:text-left` to `text-center` so the testimonial is always centered regardless of breakpoint.

2. **Star color** — Replace `fill-amber-400 text-amber-400` with `fill-[hsl(var(--oat))] text-[hsl(var(--oat))]` to use the tan/oat brand color instead of yellow.

3. **Increase star size** — Bump from `h-4 w-4` to `h-5 w-5` for more presence.

4. **Increase quote font size** — Change from `text-sm md:text-base` to `text-base md:text-lg` and bump the attribution from `text-xs` to `text-sm` for better readability.

5. **Widen max-width** — Add `max-w-lg mx-auto` to the quote container so the text block doesn't stretch too wide but stays centered.

## File
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — lines 430–446

