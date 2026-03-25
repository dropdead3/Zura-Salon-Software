

## Group Services by Category with Bulk Classify Buttons

### Problem
The classify step shows a flat list of 74 services. Users want them organized by category (Blonding, Color, Haircut, etc.) with the ability to bulk-classify an entire category at once.

### Solution

**1. Group services by category**

Group the `services` array by `service.category` (falling back to `getServiceCategory(service.name)` for null categories). Render each group under a collapsible section header showing the category name and count.

**2. Add bulk classify buttons per category**

Each category header gets two small buttons: "All No Color/Chemical" and "All Requires Color/Chemical". Clicking one sets all services in that group to the corresponding value in local `classifications` state.

**3. Layout per category group**

```text
┌─────────────────────────────────────────────────────┐
│ Blonding (5)     [All No Color/Chemical] [All Requires Color/Chemical] │
│  ┌ Full Balayage  [Suggested]  [No C/C] [Req C/C] │
│  ┌ Chunky Highlight [Suggested] [No C/C] [Req C/C]│
│  └ ...                                             │
├─────────────────────────────────────────────────────┤
│ Haircut (8)      [All No Color/Chemical] [All Requires Color/Chemical] │
│  ┌ Men's Cut                   [No C/C] [Req C/C] │
│  └ ...                                             │
└─────────────────────────────────────────────────────┘
```

### Technical Details

- Use `SERVICE_CATEGORIES` ordering from `serviceCategorization.ts` to sort groups
- Compute grouped services with `useMemo`:
  ```tsx
  const grouped = useMemo(() => {
    const map = new Map<string, ServiceRow[]>();
    for (const s of services) {
      const cat = s.category || getServiceCategory(s.name);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    // Sort by SERVICE_CATEGORIES order
    return SERVICE_CATEGORIES
      .filter(c => map.has(c))
      .map(c => ({ category: c, items: map.get(c)! }));
  }, [services]);
  ```
- Bulk buttons update local state only (no mutations until "Save & Next")
- Individual per-service buttons remain unchanged

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx` (classify step content)

