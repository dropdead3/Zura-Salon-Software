

## Add Hyperlink to Empty State CTA

### Problem
The empty state text "Set up recipe baselines on tracked services to generate price recommendations." is plain text with no navigation. Users seeing this have no way to get to the recipe baselines section.

### Fix

**File: `src/pages/dashboard/admin/PriceRecommendations.tsx` (lines 350-352)**

Replace the plain `<p>` with a message containing a `<Link>` to the Backroom Hub's formulas section (`/admin/backroom?section=formulas`):

```tsx
<p className={tokens.empty.description}>
  <Link
    to={dashPath('/admin/backroom?section=formulas')}
    className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
  >
    Set up recipe baselines
  </Link>
  {' '}on tracked services to generate price recommendations.
</p>
```

Uses the existing `dashPath` helper and `Link` import already present in the file. One line change, no new dependencies.

