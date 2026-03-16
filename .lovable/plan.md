

# Fix ROI Badge Icon

**Problem**: The ROI multiplier badge (e.g., "20× ROI") uses `TrendingDown` icon, which visually contradicts the positive meaning of high ROI.

## Change (`BackroomPaywall.tsx`, line 371)

Replace `TrendingDown` with `TrendingUp` — a single icon swap on the ROI badge.

```tsx
// Before
<TrendingDown className="w-3 h-3" />

// After
<TrendingUp className="w-3 h-3" />
```

Ensure `TrendingUp` is in the existing imports (it likely already is given the file uses multiple Lucide icons).

