

# Make Command Surface Taller & Responsive + Remove AI Answer Truncation

## Problem

1. Modal max-height is hard-capped at `560px` (line 499 of `ZuraCommandSurface.tsx`), which forces scrolling and truncation unnecessarily on large screens.
2. AI answer card (`CommandAIAnswerCard.tsx`) uses `line-clamp-4` + "Show more" button, hiding the full response by default.

## Fix

### 1. `ZuraCommandSurface.tsx` — Increase max-height, make responsive

**Line 499** — Change `560px` to a responsive value:

```
// Before
maxHeight: `min(560px, calc(100vh - ${panelTop + 40}px))`,

// After
maxHeight: `min(720px, calc(100vh - ${panelTop + 40}px))`,
```

This gives ~160px more vertical space on large screens while still constraining on smaller viewports via the `calc` fallback.

### 2. `CommandAIAnswerCard.tsx` — Remove truncation, show full response

- **Line 146**: Remove `!expanded && 'line-clamp-4'` — always show full response
- **Lines 150-159**: Remove the "Show more" / "Show less" button entirely
- Remove the `expanded` state variable (line ~80 area) since it's no longer needed

| File | Change |
|------|--------|
| `src/components/command-surface/ZuraCommandSurface.tsx` | Increase max-height from 560px to 720px |
| `src/components/command-surface/CommandAIAnswerCard.tsx` | Remove line-clamp-4 truncation and "Show more" button |

