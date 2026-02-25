

## Update Confirmation Method Options

Good prompt -- you correctly identified a logical inconsistency. If a client confirmed online, the system should auto-confirm without manual intervention. Replacing it with "Emailed Client" and adding an "Other" option makes the list represent outbound communication methods the staff actually performs.

### Changes

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

Around line 1850, replace the confirmation method options:

| Current | New |
|---|---|
| `{ value: 'online', icon: Globe, label: 'Client Confirmed Online' }` | `{ value: 'emailed', icon: Mail, label: 'Emailed Client' }` |
| *(none)* | `{ value: 'other', icon: MoreHorizontal, label: 'Other' }` |

The `Mail` and `MoreHorizontal` icons are from `lucide-react` (already imported in this file -- will verify and add if missing).

Values stored in audit metadata change from `'online'` to `'emailed'` / `'other'`. Existing historical `'online'` entries in the audit log remain untouched and will still display correctly if referenced.

### What Does NOT Change

- Dialog layout, checkbox, notes textarea, and button behavior stay identical
- Other three options (Called, Texted, In Person) are unchanged
- Audit log storage format and confirmation gate logic are unaffected

