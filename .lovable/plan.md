

# Swap the Operations Hub icon away from the people glyph

## What's wrong

The Operations Hub nav entry uses the `Users` icon (two-people silhouette). That glyph reads as *team / staff / clients* — exactly the wrong signal for a hub that owns scheduling, performance, analytics drill-downs, KPIs, and operational controls. Operators glancing at the sidebar mis-classify it as "people management," which collides with the actual Team and Client surfaces.

## What ships

A one-icon swap in two locations of the nav registry. No structural change, no label change, no route change.

### The change

In `src/config/dashboardNav.ts`:

1. **Line 99** (sidebar): `icon: Users` → `icon: LayoutGrid`
2. **Line 208** (hub quick links): `icon: Users` → `icon: LayoutGrid`
3. Remove `Users` from the lucide-react import block if no other entry in the file still uses it (quick grep on save). `LayoutGrid` is already imported (line 17) so no new import needed.

### Why `LayoutGrid`

Operations Hub is a *grid of operational domains* (9 domain cards per the Operations Hub architecture memory). `LayoutGrid` literally depicts a 2×2 grid of tiles — it matches what the operator sees when they land on the page, and it does not collide with any other sidebar icon:

- `LayoutDashboard` — already used by Command Center
- `Users` — currently misused here; better reserved for Team or Client surfaces
- `Settings` — used by Settings
- `Shield` — used by Roles & Controls Hub
- `BarChart3` — used by Analytics Hub
- `LayoutGrid` — currently imported but not used in any nav entry → free, semantically perfect

### Alternates considered (not recommended)

- `Gauge` — reads as "speedometer / single metric," too narrow
- `Command` (⌘) — collides with the ⌘K command palette mental model
- `Workflow` — reads as automation/pipelines, not operations
- `SquareStack` — reads as "layers/versions," not domains
- `Building2` — reads as "location/site," collides with Locations

`LayoutGrid` wins on three axes: matches the page's actual visual structure, no collision with adjacent icons, already imported.

## What stays untouched

- The label "Operations Hub" (operators recognize it).
- The route `/dashboard/admin/team-hub` (changing it is a separate redirect-required pass).
- The `permission` gate, the `labelKey`, and every consumer of the nav entry.
- All other sidebar icons.

## Files affected

- `src/config/dashboardNav.ts` — 2 icon references swapped, possibly 1 import line trimmed. ~3 lines modified.

Total: ~3 lines modified, 0 files created, 0 schema changes, 0 logic changes.

## Acceptance

1. Sidebar Operations Hub item shows the grid icon, not the two-people icon.
2. The hub quick-links surface (rendered from `hubLinksConfig`) shows the same grid icon for Operations Hub.
3. No other sidebar entry's icon changes.
4. No console error about an unused import.

## Prompt feedback

Strong prompt — three things landed it cleanly: (1) you named the **location** ("in the Nav bar"), (2) you named the **target** ("Operations Hub"), and (3) you named **why the current choice is wrong** ("insinuates clients or staff, or people"). The "why" is the highest-leverage part: it told me the constraint isn't just "pick a different icon," it's "pick an icon that does not pattern-match to humans." That ruled out four otherwise-plausible alternates (`Contact`, `UserCog`, `HeartPulse`, etc.) before I had to evaluate them.

The sharpener: when swapping an icon, naming **what the icon should connote in two words** ("operations grid" / "control center" / "domain map") would let me skip the alternates-considered section entirely. I had to derive "grid of domains" from the Operations Hub architecture memory; if you'd written "should feel like a control panel," I'd have led with `LayoutGrid` immediately. Two words of intent saves a paragraph of reasoning.

The deeper meta-lesson on my side: when an operator flags an icon as semantically wrong, my instinct is to swap that one location. That instinct is half-right. The real move is to **grep the icon name across the nav registry** because the same icon is often referenced in two or three places (sidebar + hub-links + search + breadcrumbs) — fixing only the sidebar leaves the wrong icon visible on the hub-links card and any drill-down breadcrumb. In this case `Users` was used in both `opsNavItems` and `hubLinksConfig`; patching only one would have left the operator seeing two-people on the hub-links card and grid on the sidebar — visual incoherence worse than the original problem. Swap at the registry level, swap everywhere it's referenced, in the same pass.

