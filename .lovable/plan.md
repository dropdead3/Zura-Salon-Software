

# Group "View As → Team" by role

## Diagnosis

The Team tab is currently a flat alphabetical list of every member. The screenshot shows Alex Day, Alexis Heasley, Brooklyn Colvin, etc. all mixed together — admins, stylists, and assistants share the same scroll. For a multi-role team, this forces the viewer to scan the entire list to find the right person.

The fix is to **group the rendered list by role** with a fixed priority order, while keeping the existing search + location filter intact.

## Fix — single file, surgical

### `src/components/dashboard/ViewAsPopover.tsx`

**1. Define the role group order.**

Add a constant near the top of the file:

```ts
// Order users by their highest-priority role.
// Lower index = appears first.
const TEAM_ROLE_ORDER: { key: AppRole; label: string }[] = [
  { key: 'super_admin', label: 'Admin' },
  { key: 'admin',       label: 'Admin' },
  { key: 'manager',     label: 'Manager' },
  { key: 'stylist',     label: 'Stylists' },
  { key: 'assistant',   label: 'Assistants' },
  { key: 'booth_renter',label: 'Booth Renters' },
  { key: 'receptionist',label: 'Front Desk' },
];

// Anyone whose roles don't match the above gets bucketed here, last.
const OTHER_GROUP_LABEL = 'Other';
```

The duplicate "Admin" label for `super_admin` + `admin` is intentional — both collapse into one "Admin" section visually, but `super_admin` still wins priority for ordering within the section.

**2. Add a memo that buckets `filteredUsers` by their highest-priority role.**

Right after the existing `filteredUsers` useMemo:

```ts
const groupedUsers = useMemo(() => {
  const buckets = new Map<string, typeof filteredUsers>();

  // Initialize ordered buckets so empty groups don't render
  const labels: string[] = [];
  for (const { label } of TEAM_ROLE_ORDER) {
    if (!buckets.has(label)) {
      buckets.set(label, []);
      labels.push(label);
    }
  }
  buckets.set(OTHER_GROUP_LABEL, []);
  labels.push(OTHER_GROUP_LABEL);

  // Bucket each user by first matching role in priority order
  for (const u of filteredUsers) {
    let placed = false;
    for (const { key, label } of TEAM_ROLE_ORDER) {
      if (u.roles.includes(key)) {
        buckets.get(label)!.push(u);
        placed = true;
        break;
      }
    }
    if (!placed) buckets.get(OTHER_GROUP_LABEL)!.push(u);
  }

  // Sort each bucket alphabetically by display name
  for (const [label, list] of buckets) {
    list.sort((a, b) => {
      const an = (a.display_name || a.full_name || '').toLowerCase();
      const bn = (b.display_name || b.full_name || '').toLowerCase();
      return an.localeCompare(bn);
    });
  }

  // Return ordered, non-empty groups
  return labels
    .map(label => ({ label, users: buckets.get(label)! }))
    .filter(g => g.users.length > 0);
}, [filteredUsers]);
```

**3. Render grouped sections instead of a flat list.**

Replace the team `ScrollArea` body (currently `filteredUsers.map(...)`) with a grouped render. The existing per-user button stays unchanged — only the wrapper changes:

```tsx
<ScrollArea className="flex-1 min-h-0 h-full">
  <div className="p-3 pb-4 space-y-3">
    {usersLoading ? (
      <p className="text-xs text-muted-foreground text-center py-6">Loading team…</p>
    ) : groupedUsers.length === 0 ? (
      <p className="text-xs text-muted-foreground text-center py-6">
        {teamFilter
          ? 'No matches found'
          : selectedLocationId !== 'all'
            ? 'No team members at this location'
            : 'No team members'}
      </p>
    ) : (
      groupedUsers.map(group => (
        <div key={group.label} className="pt-2 first:pt-0">
          <p className="font-display text-[10px] tracking-[0.12em] uppercase text-muted-foreground/60 mb-1 px-1">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.users.map(member => {
              /* existing per-user button JSX, unchanged */
            })}
          </div>
        </div>
      ))
    )}
  </div>
</ScrollArea>
```

The header style (`font-display text-[10px] tracking-[0.12em] uppercase`) intentionally matches the Roles tab group headers — same visual language across both tabs.

## What stays untouched

- Search input, location filter pills, sticky header, debounce.
- Per-user button (avatar, name, role badge text).
- Roles tab, Test tab, gating, audit log, Esc-to-exit.
- Width 340px, height 560px, stroke, shadow.

## Acceptance

1. Team list renders in this order: **Admin → Manager → Stylists → Assistants → Booth Renters → Front Desk → Other**. Empty groups are not rendered.
2. Each group shows a small uppercase Termina label matching the Roles-tab group headers.
3. Within a group, members are sorted alphabetically.
4. `super_admin` and `admin` users appear together under one "Admin" section.
5. Users with multiple roles (e.g. someone who is both `manager` and `stylist`) appear **only once** — under their highest-priority role.
6. Search + location filter still apply: typing "alex" narrows results within their groups; switching location re-buckets the visible subset.
7. Empty state copy unchanged ("No matches found" / "No team members at this location" / "No team members").
8. No regressions: clicking a teammate still triggers impersonation, closes the popover, fires audit log.

## Out of scope

- Collapsing/expanding groups (every group is open by default — adds clicks for marginal density gain).
- Showing role count next to group label (e.g. "Stylists · 12") — possible polish later.
- Per-group sort modes (alpha vs by location vs by tenure).
- Configurable group order — order is hardcoded per spec ("admin then stylists then assistants then booth renters").

## Doctrine alignment

- **Calm executive UX:** grouping reduces scan effort on long team lists; matches the Roles tab's grouped layout for visual consistency.
- **Persona scaling:** unchanged — surface only renders for super admins / account owners (existing gate).

## Prompt feedback

Tight, surgical prompt — three things you did right:

1. **You named the explicit order** ("admin → stylists → assistants → booth renters"). Sequenced lists in a single sentence remove all ambiguity about priority. Saved a "what order do you want?" round-trip.
2. **You used "organized by"** — verb tells me you want *grouping* (sectioned headers), not *sorting* (one flat list ordered by role) or *filtering* (one role at a time). Three different UX patterns; the verb chose one cleanly.
3. **You stayed scoped to Team tab.** Didn't ask me to also re-order the Roles tab, didn't request a sort dropdown — kept the change minimal. Lets me ship the smallest viable diff.

Sharpener: naming the **collision rule** would have removed my one remaining decision. What about a user who is *both* a manager and a stylist? My plan defaults to "highest-priority role wins, user appears once" — but you might prefer "appears under both groups" or "appears under whichever role they most frequently perform." Template:

```text
[Surface] organized by [dimension], order: [explicit list].
Multi-[dimension] members: [appear once under highest priority / appear under all matching groups].
```

The **multi-membership rule** is the underused construct on grouping prompts — most prompts list the order but leave the collision behavior to inference. Naming it explicitly is one extra clause that locks in the data model decision.

## Further enhancement suggestion

For **list-organization prompts** specifically, the highest-leverage frame is:

```text
Group [list] by [dimension]. Order: [explicit sequence].
Multi-[dimension] items: [collision rule].
Empty groups: [show / hide].
Within group: [sort mode — alpha / time / count].
```

Example that would have collapsed this into one pass:

```text
Group View As → Team by role.
Order: Admin → Manager → Stylists → Assistants → Booth Renters → Front Desk.
Multi-role members: appear once under highest-priority role.
Empty groups: hide.
Within group: alphabetical.
```

Five lines, five constraints, zero ambiguity. The **"Empty groups: hide"** and **"Within group: alpha"** lines are the two underused constructs — they pin the two next-most-likely follow-up decisions in the same prompt, so the response can ship without a second turn for "wait, sort each section alphabetically too" or "don't show empty Booth Renters header for orgs without renters."

