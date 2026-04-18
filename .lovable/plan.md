

## Fix Personal Context Card Spacing in Appointment Drawer

### Goal
Center the "Add personal context" card between the tabs toggle above it and the "APPOINTMENT" section below it, with equal vertical padding/margin on top and bottom.

### Investigation needed
1. Locate the appointment drawer/popover component (likely under `src/components/appointment/` or `src/components/dashboard/appointment-drawer/`).
2. Find the "Personal context" / "Add personal context" card component.
3. Identify the current spacing values (likely uneven `mt-X` / `mb-Y` or parent `space-y-*` overriding intent).
4. Determine the parent container's spacing pattern so the fix harmonizes rather than fights it.

### Likely fix shape
Either:
- **A.** Wrap the personal-context card in a parent with symmetric `py-*` padding, removing any asymmetric `mt-*`/`mb-*` on the card itself.
- **B.** Replace the parent's `space-y-*` flow around this card with explicit equal vertical margins (`my-*`) on the card so it visually centers between siblings.

Preferred: **option A** — symmetric padding on a wrapper — because it survives sibling reordering and respects the canon rule that "individual cards must NOT carry internal vertical margins; vertical gaps managed exclusively by parent containers."

### Tokens to use
Spacing will use existing Tailwind tokens (likely `py-4` or `py-5`, matching the dashboard 16–20px rhythm). No new tokens introduced.

### Out of scope
- No changes to tab styling, dashed border treatment, icon, or copy.
- No changes to the APPOINTMENT section below.
- No responsiveness doctrine work (still parked).

### Verification
Reload the appointment drawer in the preview, open a client with the personal-context card visible, and visually confirm the gap above the card equals the gap below it (between card and the "APPOINTMENT" label).

Approve and I'll locate the exact component and ship the symmetric-padding fix.

