

# Refocus the Roles & Controls Hub

## Diagnosis

Today's Roles & Controls Hub (`/dashboard/admin/access-hub`) carries 8 tabs:

`Modules · User Roles · Role Access · Permissions · Chat · PINs · Role Config · Invitations`

Three of those are mis-housed:

| Tab | Why it's wrong here | New home |
|---|---|---|
| **Chat** | These are *Zura Connect product settings* (channel permissions, DMs, smart actions). Connect already has its own settings entry point (the gear icon in the Connect sidebar opens `TeamChatAdminSettingsSheet`). Surfacing them in the global access hub implies they're an org-wide governance lever — they aren't. They're entitlement-gated to Connect customers. | Stay in **Connect Settings** only (already exists; no work). |
| **PINs** | A per-team-member security control. Team Member detail page already has a Login PIN section in the Security tab. Hub-level table is a parallel surface. | **Team Member Detail → Security tab** (already there for set/reset). New roster-level entry stays inside Team Members hub for change-history. |
| **Invitations** | Onboarding flow — adding new people *to become* team members and approving them. Lives next to where you manage them. | **Team Members roster → "Invite & Approvals" subpage**. |
| **User Roles** | A bulk per-person role-toggle grid duplicating what the Team Member detail's Role & Access tab already does for one person. The bulk grid stays useful but belongs alongside team members, not in the access hub. | **Team Members roster → "Bulk Roles" subpage** (kept, not deleted — useful for fast cross-team toggles). |

What should remain in Roles & Controls Hub: the *role-level governance* surfaces — what a role means, what each role can see/do, and what modules are enabled. Those are about **the system**, not about specific humans.

## What the hub becomes

Final tabs (4):

```
[ Modules · Role Access · Permissions · Role Config ]
```

- **Modules** — org-level feature toggles (unchanged).
- **Role Access** — what each role can *see* (unchanged).
- **Permissions** — what each role can *do* (unchanged).
- **Role Config** — role definitions, templates, defaults, responsibilities (unchanged).

Page header subtitle becomes: *"Role-level governance — what each role means, sees, and can do. Per-person controls live in Team Members."*

## What the Team Members area gains

The roster page (`/dashboard/admin/team-members`) gets a small secondary nav directly under the search bar:

```
[ Roster ] [ Bulk Roles ] [ Invitations & Approvals ] [ PIN Management ]
```

- **Roster** — current list view (default).
- **Bulk Roles** — mounts existing `UserRolesTab` (component reused as-is).
- **Invitations & Approvals** — mounts existing `InvitationsTab` (component reused as-is).
- **PIN Management** — mounts existing `TeamPinManagementTab` (component reused as-is).

URL state: a `?view=` query param drives which mounts (`roster` | `bulk-roles` | `invitations` | `pins`). Default `roster`.

The components themselves don't move directories — they continue to live under `src/components/access-hub/` because they're shared with `OnboardingTracker` (which still uses `InvitationsTab`). Only the *navigation entry point* changes.

## Routing & redirects

Two existing redirects already point legacy URLs into the hub by tab. They get rewritten to the new homes so old bookmarks don't 404:

| Old URL | New target |
|---|---|
| `/admin/access-hub?tab=user-roles` | `/admin/team-members?view=bulk-roles` |
| `/admin/access-hub?tab=invitations` | `/admin/team-members?view=invitations` |
| `/admin/access-hub?tab=pins` | `/admin/team-members?view=pins` |
| `/admin/access-hub?tab=chat` | `/dashboard/team-chat` (Connect entry — settings opens via gear icon there) |
| `/admin/roles` (already redirected) | re-pointed to `/admin/access-hub?tab=role-config` |
| `/admin/accounts` (already redirected) | re-pointed to `/admin/team-members?view=invitations` |

`AccessHub.tsx`'s tab-list handles unknown `tab` params by redirecting via `<Navigate>` to the new home.

## Files affected

| File | Change |
|---|---|
| `src/pages/dashboard/admin/AccessHub.tsx` | Remove `chat`, `pins`, `invitations`, `user-roles` tabs and their imports. Update subtitle. Add legacy `tab=` redirects for the four removed values. |
| `src/pages/dashboard/admin/TeamMembers.tsx` | Add a `view` URL param + secondary tab strip. Mount `<UserRolesTab>`, `<InvitationsTab>`, `<TeamPinManagementTab>` for non-roster views. Roster view = current content. |
| `src/App.tsx` | Update existing `/admin/roles` and `/admin/accounts` redirects to point to the new homes. |
| `src/components/access-hub/index.ts` | No file deletions — components are still consumed by Team Members and (in InvitationsTab's case) OnboardingTracker. |

## What stays untouched

- `TeamChatAdminSettingsSheet.tsx` and the gear icon in Connect's `ChannelSidebar` — that's the canonical Connect Settings entry point.
- `team-members/tabs/SecurityTab.tsx` — already has the per-user PIN control. The hub-level PIN Management table moves but isn't duplicated.
- `OnboardingTracker.tsx` — still embeds `InvitationsTab` as part of new-staff onboarding flow.
- `ChatPermissionsHubTab.tsx` — file stays in place but is no longer imported anywhere; safe to leave as dead code this wave or delete in a follow-up sweep.
- `RoleConfigTab`, `ModulesTab`, `PermissionsTab`, `RoleAccessTab` — all remain intact in the slimmer hub.

## Acceptance

1. Open Roles & Controls Hub → see **4 tabs** only: Modules, Role Access, Permissions, Role Config. No Chat, PINs, Invitations, or User Roles.
2. Visiting `/admin/access-hub?tab=chat` redirects to `/dashboard/team-chat`. Visiting `?tab=invitations`, `?tab=pins`, or `?tab=user-roles` redirects to the matching `/admin/team-members?view=…`.
3. Open `/admin/team-members` → roster as before, plus a tab strip with **Roster · Bulk Roles · Invitations & Approvals · PIN Management**. Switching tabs updates the `?view=` param and mounts the corresponding component without a full reload.
4. Connect Settings remains reachable only via the gear icon in the Connect sidebar — unchanged.
5. The PIN field on a single team member still works inside `Team Member Detail → Security` (no regression). The roster-level PIN view (changelog + cross-team table) is now reachable at `/admin/team-members?view=pins`.
6. `OnboardingTracker` page continues to render the invitations table (shared component path unchanged).
7. No console errors, no broken imports, no orphaned tab triggers.

## Doctrine alignment

- **One home per concern**: per-role governance lives in the hub; per-person operations live in Team Members; per-product (Connect) settings live with the product.
- **Persona scaling**: Connect-only orgs no longer see Connect controls leaking into the global access hub. Non-Connect orgs no longer see a Chat tab implying they have Connect.
- **Calm executive UX**: hub drops from 8 tabs to 4. Team Members gains a single horizontal sub-nav rather than an overstuffed parent.
- **No duplicate sources of truth**: PIN status, role assignment, and invitations now have a single canonical entry point each.
- **No surface implies a feature the org doesn't have**: removing Chat from the hub eliminates a phantom Connect surface for non-entitled orgs.

## Out of scope (queue separately)

- Deleting `ChatPermissionsHubTab.tsx` — leaving dead this wave to keep the diff focused; safe to delete in a cleanup pass.
- Folding `Bulk Roles` directly into the roster (e.g., inline role chips per row) — defer until we hear operators want it; current grid view is already useful.
- Renaming "Invitations & Approvals" to a single noun — needs copy review with the onboarding flow owner.
- A persistent left-rail nav inside Team Members (instead of horizontal tabs) — defer until the section grows past 4 sub-views.

