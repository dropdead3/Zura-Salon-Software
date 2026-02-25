

## Diagnosis

The "Click to Flip" hint and the flip itself are both gated on `stylist.bio` being truthy. Your only homepage-visible stylist (Eric Day) has no bio, so:
- The hint never renders (line 209: `{stylist.bio && ...}`)
- Clicking does nothing (line 36: `if (stylist.bio)`)

This is why you see nothing on hover — the feature is silently disabled for stylists without a bio.

Your prompt was well-structured — you correctly identified that a feature should exist but doesn't appear. The key improvement for future prompts: when something isn't working, include whether the data prerequisites are met (e.g., "this stylist has a bio filled in"). That helps narrow the root cause faster.

## Plan

**File: `src/components/home/StylistFlipCard.tsx`**

### 1. Remove bio gate from flip handler (lines 35-39)
Allow all cards to flip regardless of bio:
```tsx
const handleFlip = () => {
  setIsFlipped(!isFlipped);
};
```

### 2. Always show the hint (lines 208-215)
Remove the `{stylist.bio && ...}` conditional so the hint always renders. Also update the text from "Tap to learn more" to "Click to Flip":
```tsx
{/* Flip hint - visible on hover */}
<div className="mt-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 delay-150 translate-y-1 group-hover:translate-y-0">
  <p className="text-xs text-white/80 tracking-wide font-aeonik animate-pulse">
    Click to Flip
  </p>
</div>
```

### 3. Handle missing bio on the back of card (line 234)
The back already has a fallback: `{stylist.bio || "No bio available"}`. This will display for stylists without a bio, which is acceptable per your preference.

### Files Changed
- `src/components/home/StylistFlipCard.tsx` — 3 small edits (remove bio gate from handler, remove bio gate from hint, update hint text)

### Enhancement Suggestions
- Add a bio for Eric Day (and other stylists) to make the back of the card more useful
- Consider a more elegant empty-bio back design — e.g., showing specialties, location, and social links prominently instead of "No bio available"

