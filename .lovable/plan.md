
## Make Page Title Responsive on Mobile

### Problem
The title "APPOINTMENTS & TRANSACTIONS" uses Termina (uppercase, wide tracking) at `text-2xl` on all screen sizes. On mobile, the wide tracking causes the title to truncate with an ellipsis, cutting off important context.

### Solution
Two small changes in a single file:

**File:** `src/components/dashboard/DashboardPageHeader.tsx`

1. **Scale the title font size responsively** -- Change the heading from the static `tokens.heading.page` class (which is `text-2xl` at all sizes) to a responsive override: `text-lg sm:text-xl md:text-2xl`. This keeps the existing Termina/medium/tracking styles but scales the size down on small screens so the full title fits.

2. **Remove `truncate`** from the `h1` -- The title should wrap naturally on mobile rather than being cut off with an ellipsis. Replace `truncate` with `break-words` so long titles flow to a second line when needed.

### Result
- **Mobile**: Title renders at `text-lg` and wraps if needed -- no truncation
- **Tablet**: `text-xl`
- **Desktop**: `text-2xl` (unchanged)

Single file, two class changes. No new dependencies.
