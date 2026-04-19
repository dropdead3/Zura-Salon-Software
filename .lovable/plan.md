

## Wire stylist service exclusions into the avatar tooltip

### Diagnosis
The schedule avatar tooltip already shows name, booking status, and **specialties** (services they highlight). To show **what they don't do**, we need a new concept: stylist service/category exclusions. After auditing the codebase:

- `service_stylist_price_overrides` only stores **price** overrides — there is no "can/can't perform" boolean today.
- `StylistOverridesContent.tsx` (the configurator) only manages prices.
- No table exists for category-level or service-level exclusions.

So this is a **two-part build**: introduce the exclusion model + configurator UI, then surface it in the tooltip.

---

### Part 1 — Data model

Add two new tables (org-scoped, RLS via `is_org_admin` / `is_org_member`):

1. **`stylist_service_exclusions`**
   - `id`, `organization_id`, `employee_id` (FK `employee_profiles.id`), `service_id` (FK `services.id`), `created_at`
   - Unique on `(employee_id, service_id)`
2. **`stylist_category_exclusions`**
   - `id`, `organization_id`, `employee_id`, `category_name` (text, matches `service_category_colors.category_name`), `created_at`
   - Unique on `(employee_id, category_name)`

A category exclusion implicitly excludes all services in that category. A service exclusion is the granular case.

### Part 2 — Configurator UI

Update `src/components/dashboard/settings/StylistOverridesContent.tsx`:
- Add a new section **"Cannot Perform"** above the price override list.
- Toggle row per stylist with two options: *Excluded from this service* (current dialog's service) **or** at the category level, surfaced as a hint: "Also excluded from category: Color".
- New hook `useStylistExclusions(serviceId)` for read/write.
- For category-level management, add a new tab in the Service Editor or a small **"Category Exclusions"** management UI under the existing Services configurator (per stylist), since category exclusions are stylist-wide, not service-wide.

Recommended split:
- **Service Editor → "Stylist Overrides" tab**: add a per-stylist "✗ Cannot perform this service" toggle alongside price.
- **Stylist profile editor** (existing `EmployeeProfileEditor` or similar): new "Service Exclusions" section to manage category-level exclusions across the menu.

### Part 3 — Tooltip wiring (the visible deliverable)

Update `src/components/dashboard/schedule/DayView.tsx`:

1. New hook `useStylistExclusionSummaries(orgId)` — returns `Map<userId, { categories: string[]; services: string[] }>`. Single org-scoped query joined with `employee_profiles.user_id`. Cached 5 min.
2. In the avatar tooltip, append a new section below specialties when exclusions exist:

```tsx
{exclusion && (exclusion.categories.length > 0 || exclusion.services.length > 0) && (
  <div className="mt-2 pt-2 border-t border-border/40">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">
      Doesn't perform
    </div>
    <div className="text-muted-foreground">
      {[
        ...exclusion.categories,
        ...exclusion.services.slice(0, 3),
      ].join(' · ')}
      {exclusion.services.length > 3 && ` +${exclusion.services.length - 3} more`}
    </div>
  </div>
)}
```

3. Truncation rule: show all category exclusions (usually few), then up to 3 individual services + "+N more".
4. Silence rule: if no exclusions, render nothing — consistent with the existing `specialties && …` pattern.

### Verification
- Add a category exclusion in the configurator → tooltip on that stylist's avatar shows it under "Doesn't perform".
- Add a single-service exclusion → appears in the same row.
- No exclusions → section is silent (no empty header).
- Long lists truncate with "+N more".
- Dot remains pointer-events-none, single hover target.

### Prompt feedback
Strong instinct to extend the tooltip into a fuller "what this stylist will/won't do" surface. The prompt assumed the override system already tracked exclusions — it doesn't, so the build is bigger than a tooltip tweak. Next time, pairing the request with "if the data doesn't exist yet, build the configurator first" would set expectations and avoid surprise scope. Pattern: **"Wire X from Y. If Y doesn't exist, design Y first and confirm before building."**

### Enhancement suggestions
- Treat category exclusions as auto-cascading: if "Color" is excluded, hide all color services from that stylist's bookable menu (booking surface + scheduler conflict guard).
- Add a subtle ✗ icon next to excluded items in the tooltip to differentiate from the green/positive specialties.
- Consider promoting this to a "Capabilities" tab on the stylist profile so operators can see specialties + exclusions side by side.
- Run a backfill query post-launch to identify stylists with zero recent appointments in a category — surface as suggested exclusions for owner review.

