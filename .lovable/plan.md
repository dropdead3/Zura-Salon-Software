

## Bug & Gap Fix Pass — Service Tracking Configuration

### Issues Found

1. **`needsAttention` ignores incomplete billing configuration** — A tracked service with a policy record but no billing method or unconfigured allowance is not flagged. Only services with *no* policy at all show as "needs attention." This means the "Needs Attention" filter tab misses partially-configured services.

2. **Category group "configured" count is too generous** — Line 413 counts a service as configured if it merely has a policy record (`allowanceByService.has(s.id)`), even if billing mode is unset or allowance is unconfigured. Inconsistent with the finalize guard we just added.

3. **Finalize footer uses `bg-primary/5` and `border-primary/20`** — Line 1033 still uses primary tokens instead of amber, breaking the unified amber ghost theme.

4. **Celebration overlay double-nests amber border/bg** — The celebration `motion.div` (line 55 in ProgressBar) applies `border-amber-500/30 bg-amber-50` inside the parent container that already has the same styling, creating a visible double border.

5. **Milestone 2 ("Set Billing Method") counts services with any policy, not services with an explicit billing_mode** — If a policy exists but `billing_mode` is null (shouldn't normally happen given current upsert logic, but defensive gap), it would still count.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

1. **`needsAttention` (lines 328–336)** — Expand to also flag tracked services where:
   - Policy exists but `billing_mode` is null
   - `billing_mode === 'allowance'` but allowance is not configured (`included_allowance_qty === 0 && overage_rate === 0`)

2. **Category group configured count (line 413)** — Align with finalize logic:
   ```typescript
   const policy = allowanceByService.get(s.id);
   const isFullyConfigured = s.backroom_config_dismissed || (
     policy?.billing_mode === 'parts_and_labor' ||
     (policy?.billing_mode === 'allowance' && policy.is_active && (policy.included_allowance_qty > 0 || policy.overage_rate > 0))
   );
   if (isFullyConfigured) g.configured++;
   ```

3. **Finalize footer (line 1033)** — Change from `bg-primary/5 border-t border-primary/20` to `bg-amber-500/5 border-t border-amber-500/20`.

4. **Milestone 2 count (line 342)** — Add explicit billing_mode check:
   ```typescript
   const withPolicy = tracked.filter(s => {
     const p = allowanceByService.get(s.id);
     return p && p.billing_mode !== null;
   });
   ```

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingProgressBar.tsx`**

5. **Celebration overlay (line 55)** — Remove the redundant `border` and `bg-amber-50` classes from the celebration `motion.div` since it's already inside the amber container. Use `bg-amber-500/5` for subtle differentiation instead.

### Result
- "Needs Attention" filter correctly catches partially-configured services
- Category checkmarks only appear when all services are genuinely complete
- Milestone counts are accurate and defensively coded
- Footer and celebration visuals match the amber ghost theme consistently

