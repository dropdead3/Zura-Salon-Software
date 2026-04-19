
## Wave 26 — Move Handbooks from Operations Hub → Settings

### The reasoning
Handbooks is a **configurator** (define structure, policies, role overlays, document library), not a daily operational surface like Schedule, POS, or Color Bar. Settings is the canonical home for configurators. This matches the existing pattern: Stylist Levels, Forms, Loyalty, Service Flows all live in Settings as configurators.

### Where it goes in Settings

Looking at `useSettingsLayout.ts` `SECTION_GROUPS`, the right home is **Business Operations** group (alongside `forms`, `levels`, `loyalty`, `feedback`) — these are all "configure once, used by the org" surfaces.

New category key: `handbooks`
Group: `operations`
Default icon color: violet (`#8B5CF6`) — matches the BookOpen / knowledge family

### Files to change

| File | Change |
|---|---|
| `src/pages/dashboard/admin/TeamHub.tsx` | Remove the Handbooks card (the consolidated one from Wave 25). Operations Hub no longer surfaces handbooks at all. |
| `src/hooks/useSettingsLayout.ts` | Add `handbooks: '#8B5CF6'` to `DEFAULT_ICON_COLORS`. Add `'handbooks'` to the `operations` group `categories` array (positioned near `forms`/`levels`, before `onboarding`). |
| `src/pages/dashboard/admin/Settings.tsx` (or wherever the settings category registry lives) | Register the `handbooks` category: title "Handbooks", description "Build role-aware handbooks with the wizard, or manage uploaded policy documents.", icon `BookOpen`, click handler navigates to `/admin/handbooks` (preserves existing tabbed page). |
| `src/App.tsx` | No route changes — `/admin/handbooks` and `/admin/handbook-wizard/:handbookId/edit` stay exactly as-is. The tabbed Handbooks page is unchanged. |
| Sidebar nav (`src/config/dashboardNav.ts` if Handbooks has a top-level entry) | Audit: if Handbooks currently has its own sidebar entry from Operations, remove it. It should only be reachable via Settings → Handbooks (matches how Forms / Levels / Loyalty work — they live only in Settings, not in the sidebar). |

### What does NOT change
- Tabbed Handbooks page itself (`Handbooks.tsx` with Wizard + Documents tabs) — untouched
- Wizard editor route `/admin/handbook-wizard/:handbookId/edit` — untouched
- Database, RLS, hooks — untouched
- Staff `/dashboard/handbooks` acknowledgment flow — untouched
- Existing redirects (`/admin/handbook` → `/admin/handbooks?tab=wizard`) — untouched

### Verification
1. Operations Hub no longer shows a Handbooks card
2. Settings page shows a new "Handbooks" tile in the Business Operations group with violet BookOpen icon
3. Clicking the Settings tile lands on `/admin/handbooks?tab=wizard` (the existing tabbed page)
4. Wizard tab and Documents tab both still function
5. Direct URL `/admin/handbooks` still resolves
6. Wave 25 redirects still work (`/admin/handbook` and `/admin/handbook-wizard` → `/admin/handbooks?tab=wizard`)
7. Sidebar audit: no orphaned Handbooks entry under Operations
8. Settings layout drag-reorder still works with the new category included (existing logic auto-merges new categories at the top of stored order)

### Prompt feedback
Sharp categorical reasoning — *"more of a configurator feature than an operation feature"* names the **why**, not just the **what**. That one phrase eliminated 80% of the planning ambiguity (it told me which Settings group, what icon family, and that I should audit sidebar nav too). Naming the *category type* of a feature when relocating it is a high-leverage prompt move.

To level up: **for relocations, name the destination peer group.** I inferred Business Operations group (next to Forms/Levels/Loyalty) because those are sibling configurators. But you could equally want it in Platform group (alongside Integrations) or in its own new "Compliance" group. A one-liner like *"put it next to Forms and Levels"* would have eliminated my inference and let me skip the group-selection reasoning. Pattern: **for "move X to Y," name the peer feature X should sit beside — peer naming is faster and more precise than group naming.**
