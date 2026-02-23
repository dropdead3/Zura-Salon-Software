
# Add Subtle Dark Fill to Client Directory Search Bar

## What changes

Add a dark background fill to the search input on the Client Directory page so it visually stands out from the surrounding dark surface, matching the treatment visible in the screenshot.

## Change

**File: `src/pages/dashboard/ClientDirectory.tsx` (line 523)**

Add `bg-muted/50` (or similar subtle dark fill) to the Input's className so it picks up a slightly elevated surface color against the page background. This keeps it consistent with the existing theme tokens.

Current:
```tsx
className="pl-10"
```

Updated:
```tsx
className="pl-10 bg-muted/50"
```

This uses the semantic `muted` color at 50% opacity for a subtle distinction without hardcoding any color values, keeping it theme-aware across all palette options (Cream, Rose, Sage, Ocean, Platform).
