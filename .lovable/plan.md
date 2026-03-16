

# Separate Social Proof from Hero Section

## Problem
The testimonial/social proof block (stars + quote, lines 430–446) is nested inside the hero's left text column, making the layout feel cramped and awkward — it competes with the headline + CTA for space.

## Fix
Move the social proof block **out** of the hero grid and place it as its own centered strip **below** the hero section. This gives the hero breathing room and lets the testimonial stand on its own.

### Changes in `BackroomPaywall.tsx`

1. **Remove lines 430–446** (the `border-t` div containing stars, blockquote, and attribution) from inside the left column's `space-y-6` div.

2. **Insert a new centered social proof strip** between the hero `</section>` closing tag and the next section. Structure:
   - Centered container, no border-top, with `py-8` vertical padding
   - Stars row + quote + attribution, all centered, using the existing oat-colored stars and italic quote styling
   - `max-w-2xl mx-auto` for comfortable reading width

This keeps the hero left column clean: headline → subtitle → CTA button → setup note. The testimonial becomes a standalone visual break before the feature grid below.

### File
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — lines 410–450 (hero section restructure)

