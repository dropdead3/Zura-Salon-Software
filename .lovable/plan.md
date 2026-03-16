

# Add Lock Icon to Unlock Button

Add a `Lock` icon before the text on the CTA button to visually reinforce that the feature is currently locked.

## Change (`BackroomPaywall.tsx`)

- Import `Lock` from `lucide-react` (if not already imported)
- Add `<Lock className="w-4 h-4" />` before the text in all three button states (lines 377-390):
  - "Unlock $X/yr in savings" → Lock icon + text + arrow
  - "Start saving $X/mo" → Lock icon + text + arrow  
  - "Subscribe & Activate" → Lock icon + text + arrow

Single file, 3 small insertions.

