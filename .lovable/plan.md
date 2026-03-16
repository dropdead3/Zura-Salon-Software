

# Add "Zura Backroom" Eyebrow Above Hero Heading

**File:** `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (line 389)

Insert an eyebrow label before the `<h1>` tag using the existing `Eyebrow` component from `src/components/ui/Eyebrow.tsx`.

**Change:**
- Add `import { Eyebrow } from '@/components/ui/Eyebrow';` to the imports
- Insert `<Eyebrow className="text-muted-foreground mb-2">Zura Backroom</Eyebrow>` directly before the `<h1>` on line 389

The `Eyebrow` component already renders `text-xs uppercase tracking-[0.2em] block font-display font-medium`, which matches the design system. The parent `div` has `text-center lg:text-left`, so the eyebrow will be left-aligned on desktop automatically.

