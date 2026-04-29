# Show Full Name + Employee ID in Archive Wizard Header

The wizard title currently shows whatever is in `display_name` (a nickname like "Chelsea") and falls back to `full_name`. Operators archiving a team member need the unambiguous identity — legal full name plus a stable employee identifier — for HR/compliance traceability. Misidentifying a teammate during archive is unrecoverable damage.

## What you'll see

Header line stack:
```text
ARCHIVE · STEP 1 OF 4
ARCHIVE CHELSEA RODRIGUEZ                    [×]
EMPLOYEE ID  A8F3C201
Historical data is preserved. You can un-archive within 90 days.
```

- **Title** uses `member.full_name` (the legal/HR name), no longer the casual `display_name`.
- **Employee ID line** sits between the title and the un-archive disclaimer:
  - Small uppercase `EMPLOYEE ID` label in `font-display` (Termina, tracked)
  - The ID itself rendered in `font-mono` so it's visually unambiguous (no "1 vs l" / "0 vs O" confusion when read aloud)
- The stepper added in the previous turn stays directly below.

## Identifier source

The codebase has no dedicated `employee_id` column on `employee_profiles` — the canonical stable identifier is `member.user_id` (UUID). To keep it scannable we display the **last 8 characters, uppercased** (e.g. `A8F3C201`). This matches how other Zura surfaces show user references and is unique within an organization.

If a true HR-issued employee number gets added to `employee_profiles` later (e.g. a payroll system import), this is the single line to swap.

## Technical Details

**File:** `src/components/dashboard/team-members/archive/ArchiveWizard.tsx`

1. Replace the single `name` derivation at line 304 with two values:
   - `fullName = member.full_name || member.display_name || 'this team member'` — used in the title
   - `employeeId = member.user_id ? member.user_id.slice(-8).toUpperCase() : null`
2. Keep `name` as-is for use in body copy ("Notify reassigned clients of...", confirmation checkbox text). Body copy stays friendly.
3. Update the header `<h2>` to render `ARCHIVE {fullName.toUpperCase()}` and add `truncate` + a `min-w-0` parent for safety on long names.
4. Insert a new `<p>` between the title and the disclaimer with the `EMPLOYEE ID` label + mono-rendered ID. Render conditionally on `employeeId` being non-null.
5. No prop changes, no new imports, no new files.
