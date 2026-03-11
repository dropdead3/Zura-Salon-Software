

## Fix: "Shaping Heat Spray" Falsely Matching Merch Pattern

### Root Cause

The merch regex pattern includes `pin` as a bare substring match. The word "Sha**pin**g" in "Shaping Heat Spray" triggers a false positive.

Current pattern:
```
/t.?shirt|tee|hat|cap|beanie|hoodie|sweatshirt|tote|bag|sticker|patch|pin|keychain|apparel|merch|branded/i
```

### Fix

Add word boundaries (`\b`) to ambiguous short terms that can appear as substrings in normal product names: `pin`, `cap`, `hat`, `tee`, `bag`.

Updated pattern:
```
/t.?shirt|\btee\b|\bhat\b|\bcap\b|beanie|hoodie|sweatshirt|tote|\bbag\b|sticker|patch|\bpin\b|keychain|apparel|merch|branded/i
```

### File
`src/utils/serviceCategorization.ts` — update `MERCH_PRODUCT_PATTERN` (line 95).

