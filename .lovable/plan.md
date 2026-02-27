

## Fix Specialty Options Saving as ALL CAPS

**Problem**: The `useAddSpecialtyOption` and `useUpdateSpecialtyOption` hooks both force `name.toUpperCase()` before inserting/updating the database. This overrides whatever casing the user typed.

### Implementation

**File: `src/hooks/useSpecialtyOptions.ts`**

1. **`useAddSpecialtyOption`** (~line 68): Change `name: name.toUpperCase()` → `name` (preserve as-is)
2. **`useUpdateSpecialtyOption`** (~line 95): Change `updates.name = name.toUpperCase()` → `updates.name = name` (preserve as-is)

**File: `src/components/dashboard/SpecialtyOptionsManager.tsx`**

3. **`handleSaveName`** (line 73): Fix the comparison — currently `editName.trim().toUpperCase() !== option.name` skips saves when only casing changed. Change to `editName.trim() !== option.name` so any text change (including casing) is saved.

### Scope
- Two files, three one-line fixes
- No schema or migration changes

