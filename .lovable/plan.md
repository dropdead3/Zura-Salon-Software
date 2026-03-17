

# Hide Placeholder Logo Icons on Brand Cards

## Change

In `SupplyLibraryTab.tsx`, remove the fallback `<Package>` icon block (lines 818-821) when no logo exists. Keep the logo `<img>` when one is present. The card layout/size stays the same — only the placeholder icon is hidden.

## File

**`src/components/platform/backroom/SupplyLibraryTab.tsx`** — Lines 816-822: Replace the conditional with a simple render of the logo only when it exists, removing the else branch entirely.

