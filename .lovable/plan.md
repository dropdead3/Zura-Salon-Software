

## Remove Fallback Icon When No Logo Exists

The brand card currently shows a fallback initial letter box (`brandName[0]`) when there's no `logo_url`. Per the screenshot reference, the card should only show the logo area if an actual logo exists.

### Change in `BackroomProductCatalogSection.tsx` (lines 1158-1169)

- Remove the entire `else` branch (the fallback `div` with the initial letter)
- Only render the logo `img` when `meta?.logo_url` is truthy; otherwise render nothing in that spot

