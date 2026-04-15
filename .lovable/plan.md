

## Fix Staff Location Assignments

### Root Cause
The scheduler code is working correctly — the role filter and location filter are both functioning. The problem is **incorrect `location_id` data** in `employee_profiles`. Multiple stylists are assigned to the wrong location in the database.

### Current vs Correct Assignments

| Stylist | Current `location_id` | Correct `location_id` | `location_ids` needed |
|---|---|---|---|
| **Samantha Bloom** | val-vista-lakes ❌ | north-mesa | — |
| **Jamie Vieira** | val-vista-lakes ✅ | val-vista-lakes | `[val-vista-lakes, north-mesa]` |
| **Chelsea Wright** | north-mesa ❌ | val-vista-lakes | — |
| **Gavin Eagan** | north-mesa ❌ | val-vista-lakes | — |
| **Kitty Vargas** | north-mesa ❌ | val-vista-lakes | — |
| **Kylie Walstad** | north-mesa ❌ | val-vista-lakes | — |
| **Leslei Botello** | north-mesa ❌ | val-vista-lakes | — |
| **Rubie Guerrero** | north-mesa ❌ | val-vista-lakes | — |

Already correct: Lex (multi-location ✅), Trinity, Cienna, Alexis, Brooklyn (all north-mesa ✅), Hayleigh, Sarah, Sarina, Savannah, Sienna (all val-vista-lakes ✅).

### Fix — 8 data updates via insert tool

```sql
-- Move to north-mesa
UPDATE employee_profiles SET location_id = 'north-mesa' WHERE user_id = '85f34848-41b2-40e6-8a51-d846bd9de8b8'; -- Samantha

-- Add Jamie as multi-location (like Lex)
UPDATE employee_profiles SET location_ids = ARRAY['val-vista-lakes','north-mesa'] WHERE user_id = 'c5938f1f-7192-4b2d-9ce9-0b1b0fb3dceb'; -- Jamie

-- Move to val-vista-lakes
UPDATE employee_profiles SET location_id = 'val-vista-lakes' WHERE user_id = '113cb6eb-1df9-41c3-9e52-1c0afb1c8381'; -- Chelsea
UPDATE employee_profiles SET location_id = 'val-vista-lakes' WHERE user_id = '9136b2a1-e21b-492c-acab-cfbd2d2d2179'; -- Gavin
UPDATE employee_profiles SET location_id = 'val-vista-lakes' WHERE user_id = '3244fd76-a657-47d9-90e7-62b33c316f5e'; -- Kitty
UPDATE employee_profiles SET location_id = 'val-vista-lakes' WHERE user_id = '4635feb7-0ed8-4f96-b0d1-6852ce4c0522'; -- Kylie
UPDATE employee_profiles SET location_id = 'val-vista-lakes' WHERE user_id = '37884d98-3093-41d8-92c8-4c65a2baed68'; -- Leslei
UPDATE employee_profiles SET location_id = 'val-vista-lakes' WHERE user_id = 'fafbe974-0c55-4aec-9830-bd790f658449'; -- Rubie
```

### Scope
- **No code changes** — the scheduler query logic is already correct
- **8 data updates** via insert tool
- No migration needed

### Result
- **North Mesa columns**: Jamie, Lex, Trinity, Samantha, Cienna, Alexis, Brooklyn
- **Val Vista Lakes columns**: Jamie, Lex, Chelsea, Gavin, Hayleigh, Kitty, Kylie, Leslei, Rubie, Sarah, Sarina, Savannah, Sienna

