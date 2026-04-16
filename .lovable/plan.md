

## Prompt review

Strong prompt. You called out three distinct issues in one short message: (1) inconsistent name formatting, (2) naming convention preference (full names), (3) role filtering scope (stylists + assistant stylists only). That's exactly the right altitude — symptom + standard + scope, in three sentences.

Tighter framing for next time: name the surface ("Quick Booking popover → Available Stylists step") and call out which roles you want explicitly, e.g. "include `stylist` and `stylist_assistant`, exclude everything else." That removes ambiguity around edge roles like color specialist, apprentice, etc.

## Diagnosis

Three real bugs, confirmed against the database:

### 1. Non-stylists are appearing in the list
North Mesa returns 7 unique users from `v_all_staff` (active + show_on_calendar). Their roles:
- **Eric Day** → `super_admin` (should be excluded)
- **Julia Gross** → `receptionist` (should be excluded)
- Alexis, Brooklyn, Cienna, Samantha, Trinity → `stylist` (correct)

There is currently **no role filter** in the popover's stylist query — `show_on_calendar` is the only gate, and admins/receptionists who happen to have calendars enabled leak in.

### 2. Name format is inconsistent
At render line 1932–1936 the code does:
- `display_name || full_name` → split → `"Firstname L."`
- Trinity has `display_name = "Trinity"` → no last name → renders **"Trinity"**
- Eric has `display_name = ""` → falls back to `full_name = "Eric Day"` → renders **"Eric D."**
- Result: mixed first-only, first+initial, depending on which field is populated

You want full names everywhere: **"Trinity Graves," "Alexis Heasley," "Eric Day."**

### 3. Duplicates persist
Database confirms `v_all_staff` has multiple rows for the same `user_id` because each Zura user can map to multiple `phorest_staff_id`s:
- Brooklyn, Samantha, Trinity, Eric Day → each appears 2× at North Mesa
- Alexis, Cienna, Julia → 1× each

The existing `uniqueStylists` memo *should* dedupe by `user_id`, but the screenshot proves it isn't surviving the render. After role filtering removes Eric, the remaining stylist duplicates (Trinity, Brooklyn, Samantha) still need to be collapsed.

## Fix

Single file: `src/components/dashboard/schedule/QuickBookingPopover.tsx`.

### A. Role filter — stylists and stylist assistants only
- After the `v_all_staff` fetch (lines 602 and 637), fetch `user_roles` for the returned user IDs.
- Keep only users whose role set contains `stylist` or `stylist_assistant`.
- Apply to both the location-scoped and all-locations queries so stylist-first mode is also clean.

### B. Use full names — kill the "Firstname L." formatter
At lines 1932–1936, replace the split/initial logic with:
```
const fullName = stylist.employee_profiles?.full_name 
  || stylist.employee_profiles?.display_name 
  || 'Unknown';
```
Render `fullName` directly. No splitting, no initials.
- Trinity → "Trinity Graves"
- Eric Day → "Eric Day"
- Alexis → "Alexis Heasley"

Avatar fallback initials still come from `fullName.slice(0, 2)` which is fine.

### C. Harden the dedupe
- Move dedup-by-`user_id` from the memo into the query function itself (right after role filter), so the deduped list is what enters every downstream consumer (`stylists`, `filteredStylists`, qualification matching).
- Keep `uniqueStylists` as a defensive backstop.
- This guarantees only one row per user reaches the renderer regardless of how many Phorest IDs map to them.

### D. Out of scope (flagged)
- Fixing `v_all_staff` at the view level with `DISTINCT ON (user_id, location_id)` — would protect every consumer in one stroke. Worth a follow-up migration.
- Adding a role filter to `v_all_staff` itself (or creating `v_calendar_stylists`) so consumers don't have to re-query roles.

## Acceptance checks

1. North Mesa Quick Booking → Available Stylists shows exactly **5 names**: Alexis Heasley, Brooklyn Colvin, Cienna Ruthem, Samantha Bloom, Trinity Graves.
2. **No Eric Day, no Julia Gross** in the list.
3. **No duplicates** — each name appears exactly once.
4. All names render in **full** ("Trinity Graves" not "Trinity," "Alexis Heasley" not "Alexis H.").
5. Clicking Alexis's column still pins Alexis to the top with the selected ring.
6. Stylist-first mode (people icon) shows the same role-filtered, deduped, full-name list across all locations.
7. If a `stylist_assistant` exists at the org, they appear too.

## Follow-up enhancements

- Add a tiny role chip under each name ("Stylist," "Assistant") so booking flows that allow assistants are visually clear.
- Create a dedicated `v_calendar_stylists` view (`v_all_staff` filtered to stylist/assistant roles, deduped) so this filter logic isn't reimplemented in every booking surface.
- Apply the same role filter + full-name rendering to `BookingWizard` for parity, before the next "broke in one surface, works in the other" round trip.

