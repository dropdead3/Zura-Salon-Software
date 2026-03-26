

## Add Developer-Required Prompt for Permanent/Demi Color Products

### Problem
When a user adds a permanent or demi-permanent color to a bowl and no developer product exists in that bowl, there's no warning. The user may forget to add developer, leading to an incomplete recipe and inaccurate cost calculations.

### Detection Logic

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

Add a helper function to identify products that require developer:

```tsx
const DEVELOPER_REQUIRING_KEYWORDS = ['permanent', 'demi'];
const SEMI_PERMANENT_KEYWORDS = ['semi-permanent', 'semi permanent', 'semi'];

function requiresDeveloper(product: CatalogProduct): boolean {
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const combined = `${name} ${category}`;
  // Exclude semi-permanent first
  if (SEMI_PERMANENT_KEYWORDS.some(kw => combined.includes(kw))) return false;
  // Check for permanent or demi
  return DEVELOPER_REQUIRING_KEYWORDS.some(kw => combined.includes(kw));
}
```

### Prompt Behavior

**When:** Inside `addProductToBowl`, after adding the new line, check if:
1. The added product `requiresDeveloper()` returns true
2. The bowl (after adding) has **no** lines where `isDeveloper === true`

**Then:** Show an inline alert banner at the top of the bowl (not a modal — keeps the flow non-blocking). The banner:
- Amber/warning style matching existing Alert patterns
- Icon: `AlertTriangle`
- Text: *"This bowl contains permanent/demi color but no developer. Add a developer product for accurate cost calculation."*
- A dismiss button (X) so users can acknowledge if intentional
- Auto-dismisses when a developer product is added to the bowl

### Implementation

1. **Add state:** `const [developerWarningBowls, setDeveloperWarningBowls] = useState<Set<number>>(new Set());`

2. **In `addProductToBowl`:** After adding the line, check if the product requires developer and bowl lacks one — if so, add `bowlIdx` to the warning set.

3. **In `addProductToBowl`:** Also check if the product being added IS a developer — if so, remove `bowlIdx` from the warning set.

4. **In bowl render:** At the top of each bowl's content area, conditionally render the amber warning banner when `developerWarningBowls.has(bowlIdx)`.

5. **Dismiss handler:** Removes the bowl index from the set.

### Scope
- Single file, ~30 lines added
- No new components or files needed
- Non-blocking UX (inline banner, not modal)

