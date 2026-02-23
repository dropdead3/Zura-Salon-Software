
# Reorder Gender Options: Female First

## Summary
The gender dropdown in the Client Detail Sheet currently lists "Male" as the first option. Per the established UI standard (and the NewClientDialog which already has it correct), "Female" should be the first option.

## Change

**File: `src/components/dashboard/ClientDetailSheet.tsx` (~line 619)**

Swap the order of the first two `SelectItem` entries so "Female" appears before "Male":

```
<SelectItem value="Female">Female</SelectItem>
<SelectItem value="Male">Male</SelectItem>
<SelectItem value="Non-Binary">Non-Binary</SelectItem>
<SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
```

Single two-line swap. No other files affected.
