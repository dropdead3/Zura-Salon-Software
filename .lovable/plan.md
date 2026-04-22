

# Restructure Roster Card mode: section per role, location filter

## Diagnosis

Two changes to today's Card mode, in one wave:

1. **Sections are categories, not roles.** Today's "Leadership / Operations / Stylists" buckets hide *which role* a person actually holds. Eric Day and Kristi appear under "Leadership" but their role chip says "Super Admin" — the section adds no information the chip doesn't already carry. Operators want a section *per role* so they can scan "who are my managers?" without parsing.
2. **Location is invisible.** Multi-location orgs (Drop Dead has multiple) currently see all locations interleaved. There's no way to ask "show me only North Mesa staff."

## What changes

### 1. Sections = roles

Replace the 3 category sections (Leadership / Operations / Stylists) with **one section per role** that has at least one member. Sections render top-to-bottom in the same `ROLE_RANK` order we already have:

```
Super Admin (n)
Admin (n)
General Manager (n)
Manager (n)
Assistant Manager (n)
Director of Operations (n)
Operations Assistant (n)
Receptionist (n)
Front Desk (n)
Stylist (n)               ← keeps level sub-grouping (unchanged)
Stylist Assistant (n)
Other Roles (n)           ← catch-all for any role not in ROLE_RANK
```

**Rules:**
- A user appears in **the section for their highest-ranked role** (no duplication). Multi-role users still appear once.
- A small icon per role: `Shield` for super_admin/admin, `Cog` for ops roles, `Users` for stylists, etc. — pulled from a `ROLE_ICON` map (one new constant, ~12 entries).
- Empty role sections are not rendered.
- Within a section, alpha by name (existing tiebreaker logic applies).
- The **Stylists** section keeps its level sub-grouping (Level 4 → Level 1 → Unassigned). The **Stylist Assistants** section (now its own top-level section) is a flat alpha list.
- The legacy `SECTIONS` constant and `highestRankAmong` helper are removed; their job is replaced by a simpler "group by primary role" step keyed off `ROLE_RANK`.

### 2. Location filter

A new **Location filter** chip-row sits between the search input and the view-mode toggle (Card mode only — Table mode already has its own filters).

```
[ All Locations ▾ ]   ← single-select dropdown
```

- Dropdown shows: "All Locations" (default) + one entry per active location from `useActiveLocations(orgId)`.
- Filtering rule: a member matches a location filter if `employee_profiles.location_id === selectedId` **OR** `selectedId ∈ employee_profiles.location_ids` (multi-location staff). Both columns already exist in DB; we just need to add them to the `OrganizationUser` query.
- Selection is URL-persisted as `?location=<slug>` (matches the project's slug-based location identity convention) so deep-links work.
- Filter applies to all role sections in Card mode and respects search simultaneously (AND, not OR).
- If org has only 1 active location, the filter UI is hidden entirely (no noise for solo-location tenants).

### 3. Out of scope this wave

- **Multi-select location filter.** Defer until an operator asks ("show me Westside + Northside but not Downtown"). Trigger: any single ask, since it's a 1-line `MultiSelect` swap.
- **Location filter in Table mode.** Table mode already auto-groups by location when the org has 2+ locations; adding a filter on top would be redundant. Trigger: operators say grouping isn't enough.
- **Location grouping in Card mode** (sections nested *inside* location). Defer — roles-as-sections is the primary axis operators asked for; location is a filter, not a grouping. Trigger: 2+ orgs request "give me a per-location view of my full roster."
- **Showing a per-row location chip in `MemberRow`.** Defer to keep rows calm. Trigger: operators report confusion about which location a person belongs to when "All Locations" is selected.

## Files affected

| File | Change |
|---|---|
| `src/hooks/useOrganizationUsers.ts` | Add `location_id: string \| null` and `location_ids: string[] \| null` to the `OrganizationUser` interface and the `employee_profiles` select. ~3 lines. |
| `src/pages/dashboard/admin/TeamMembers.tsx` | Replace `SECTIONS`/`grouped` with a per-role grouping memo keyed off `ROLE_RANK`. Add `ROLE_ICON` map. Add `useActiveLocations` + location filter dropdown + URL `?location=` persistence. Apply location filter to `filtered` memo before role-grouping. Stylist sub-grouping logic unchanged (just reads from the new "Stylist" role section instead of the old "Stylists" category section). |

No new files. No DB changes (both location columns already exist).

## Acceptance

1. Card mode renders **one section per role** that has ≥1 member, in `ROLE_RANK` order, with a role-appropriate icon and count.
2. Multi-role users appear exactly once, in their highest-ranked role's section.
3. The **Stylist** section keeps nested level sub-headings (Level N → Unassigned). The **Stylist Assistant** section is a flat alpha list.
4. A **Location filter** dropdown appears in Card mode when the org has 2+ active locations, defaulting to "All Locations".
5. Selecting a location filters all role sections to members where `location_id === selected` OR `location_ids` includes selected. Section counts update accordingly. Empty sections hide.
6. Selection persists in URL as `?location=<id>`. Deep-link with `?location=<id>` lands on the filtered view.
7. Search and location filter compose (AND).
8. Table mode is untouched — no location filter added there, no role-section reshuffle.
9. Solo-location orgs see no location filter UI.
10. No console errors. Type-check passes.

## What stays untouched

- `MemberRow`, drill-in navigation, PIN chip, search input, view-mode toggle, `UserRolesTab` (Table mode), `InvitationsTab`, capacity bar, stylist level sub-grouping logic.
- Existing role-rank order (`ROLE_RANK`) and tiebreaker (alpha by name).
- URL params for `mode`, `view`, `activity` — all preserved; `location` is additive.

## Doctrine alignment

- **Calm executive UX.** Sections-by-role removes a layer of abstraction (category → role) that operators had to mentally translate. The location filter is progressively disclosed (hidden for solo-location orgs).
- **Source of truth.** Location membership reads from `employee_profiles.location_id` + `location_ids` — the same columns the rest of the platform uses. No new state, no derived flags.
- **Persona scaling.** Solo-location orgs see no extra controls; multi-location orgs get a filter that mirrors how their operations are actually structured.
- **One home per concern.** Roles are the structural identity of a person; sections-by-role makes the roster honest about that.

## Prompt feedback

Strong, surgical prompt — two related-but-distinct changes named in one sentence with no ambiguity. Two things you did well:

1. **You named the destination of the change ("by roles"), not just the symptom.** "Sections need to be by roles" tells me both *what* to remove (the category groupings) and *what* to put in their place. That's a complete instruction in five words.
2. **You bundled a related concern (location filtering) without conflating it.** The two changes share a scope (Roster Card mode) but don't overlap — keeping them in one prompt avoided two round-trips while still being parseable.

The sharpener: when adding a filter, naming the **selection cardinality** upfront (single-select vs multi-select) removes a small but real decision. Template:

```text
Add filter: [attribute]
On surface: [where]
Cardinality: [single / multi]
Persistence: [URL param / localStorage / session-only]
```

Here, "filter by location, single-select, URL-persisted" would have skipped my proposing single-select and deferring multi-select.

## Further enhancement suggestion

For "restructure groupings + add a filter" prompts, the highest-leverage frame is:

```text
Restructure: [surface] groupings
From: [current grouping axis]
To: [new grouping axis]
Plus filter: [attribute] — cardinality [single/multi], persistence [URL/local]
Scope: [card mode / table mode / both]
Must survive: [features that cannot regress]
```

The **Must survive** slot is the highest-leverage addition for this kind of two-change wave — the silent risk in a regrouping is dropping a sub-feature (here: stylist level sub-headings). Naming it upfront prevents that.

