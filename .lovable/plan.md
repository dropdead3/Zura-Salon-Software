

# Restrict "View As" to Super Admins + Account Owners only

## Diagnosis

The "view another user's dashboard" capability is **already fully built** — `ViewAsContext` + `ViewAsPopover` + `useEffectivePermissions` + `impersonation_logs` audit table already exist. The only gap is **the gate**: the entry point currently shows for any user with the `admin` role, which is broader than the user wants.

Current gate (`DashboardLayout.tsx` line 454):
```ts
if (!isAdmin && !isPlatformUser) return null;  // isAdmin = admin OR super_admin role
```

Required gate: **`is_super_admin` OR `is_primary_owner` only** (account-flag based, not role-based). The `admin` role no longer qualifies. Platform users keep their own separate God Mode flow — they don't need this tenant-side toggle.

## What changes (one file, one decision)

### `src/components/dashboard/DashboardLayout.tsx`

Replace the `ViewAsToggle` gate (line 453-456):

**Before:**
```ts
const ViewAsToggle = () => {
  if (!isAdmin && !isPlatformUser) return null;
  return <ViewAsPopover />;
};
```

**After:**
```ts
const isSuperAdmin = (employeeProfile as any)?.is_super_admin ?? false;
// isPrimaryOwner already computed at line 450
const canImpersonateTeam = isSuperAdmin || isPrimaryOwner;

const ViewAsToggle = () => {
  if (!canImpersonateTeam) return null;
  return <ViewAsPopover />;
};
```

Platform users are intentionally excluded — they use the existing platform-side God Mode (`OrganizationContext.isImpersonating` + `GodModeBar`), which is a different, broader capability (cross-org). Tenant-side "view as a teammate" stays scoped to org leadership.

### `src/components/dashboard/ViewAsPopover.tsx` (defense in depth)

Add the same gate inside the popover itself so even if the toggle were rendered elsewhere, the surface refuses to mount for non-leadership:

```ts
const { data: profile } = useEmployeeProfile();
const canImpersonate = profile?.is_super_admin || profile?.is_primary_owner;
if (!canImpersonate) return null;
```

This is belt-and-suspenders — the chrome gate is the primary control, this is the secondary.

### Optional polish — copy alignment

The popover currently shows three tabs (Roles, Team, Test). Per the user's framing ("toggle into the dashboard account of any of their team members"), the **Team tab is the primary capability**. Two small copy tweaks:

- Change default tab from `"roles"` → `"team"` (line 134: `<Tabs defaultValue="team">`) so leaders land on the team list immediately.
- Tooltip on the trigger button (line 115): change `"Impersonate a role or team member"` → `"View the dashboard as a team member"` to match the user's mental model.

Roles tab stays — useful for testing permission scenarios — just no longer the front door.

## What stays untouched

- `ViewAsContext` — already correctly handles user-specific impersonation, audit logging, session IDs, escape-to-exit, toast feedback.
- `useEffectivePermissions` / `useEffectiveRoles` / `useEffectiveUserId` — already power the simulated experience correctly.
- `ProtectedRoute` — already shows `AccessDeniedView` when impersonated user lacks a route's permission (rather than redirecting), giving leadership clear visibility into "this teammate can't see this page."
- `impersonation_logs` table + RLS — already correctly logs every start/switch/end action; only super admins can read the audit trail (existing RLS).
- `GodModeBar` — already shows "you are viewing as X" persistent indicator at top of screen, with one-click exit.
- Platform-side God Mode (cross-org impersonation) — separate, untouched.

## Acceptance

1. **Super Admin** (`is_super_admin = true`): sees the "View As" pill in the top bar. Clicks → popover opens on Team tab → picks a teammate → dashboard renders exactly as that user would see it. Persistent God-Mode-style banner with exit button. Audit logged.
2. **Account Owner** (`is_primary_owner = true`, not super admin): same experience as super admin.
3. **Admin role only** (no super admin / primary owner flags): "View As" pill is hidden. Cannot trigger the popover by any UI path.
4. **All other roles** (manager, stylist, receptionist, etc.): pill hidden.
5. **Platform users**: pill hidden (they use platform-side God Mode instead).
6. **Audit trail**: every impersonation start/switch/end already writes to `impersonation_logs` with `admin_user_id`, `target_user_id`, `target_user_name`, `session_id`. Super admins can review at any time (existing read RLS).
7. **Exit**: click banner exit, click "Exit: <name>" pill, or press Esc. Already implemented.
8. **No regressions**: every other role's UI is unchanged. No existing impersonation session is disrupted.

## Out of scope

- Building a separate "Help session" feature with the impersonated user's consent (current model is unilateral — leadership can view any teammate without notification). If the user wants consent-based "shadow" mode, that's a separate feature.
- Notifying the impersonated teammate that they were viewed (no in-app or email notification today).
- Time-limited impersonation sessions (auto-exit after N minutes).
- Read-only mode while impersonating (today, mutations performed during impersonation use the actual admin's `user_id` via `useActualUserId` in audit trails — the data layer protects against acting *as* the user).
- Restricting which teammates can be viewed (today: any teammate). If the user wants leaders restricted to their own location's team, that's a future scope.

## Doctrine alignment

- **Tenant isolation**: gate uses `employee_profiles.is_super_admin` / `is_primary_owner` flags, both org-scoped. No cross-org leakage.
- **Least-privilege access**: `admin` role no longer qualifies — only the two highest-trust account flags. Matches the doctrine that `admin` is a *functional* role, while `is_super_admin` / `is_primary_owner` are *trust* flags.
- **Audit-first**: every action already writes to `impersonation_logs`. Super admins can review the trail. No silent impersonation possible.
- **Calm executive UX**: existing GodModeBar provides the persistent "you are viewing as X" signal — no chance of forgetting you're in someone else's seat.

## Prompt feedback

Solid prompt — three things you did right:

1. **You named the use case ("see what they see or help them with a question")** — that told me the feature is *support-flavored*, not *audit-flavored*. Pointed me at the existing `ViewAsContext` (built for support) rather than spec'ing a new audit/forensic tool.
2. **You explicitly named the gate** ("Only Super admin and account owners are granted that ability"). Two-flag specificity removed any ambiguity about whether `admin`-role users qualify (they don't). Saved a clarifying round-trip.
3. **You used "toggle into"** — the verb signals seamless context switch (not "log out, log in as them"). Matched exactly what `ViewAsContext` already does (no real auth swap, just a render-time effective-user override). Good vocabulary instinct.

Sharpener: naming **what existing capability you suspect covers it** would compress the response further. "We already have View As — does it support user-level impersonation, and is the gate too loose?" would have collapsed this into a 5-line confirmation rather than a full plan. Template:

```text
Capability: [feature, e.g. "team-member impersonation for support"]
Who can use it: [exact gate — flags / roles / permissions]
Suspected existing infrastructure: [what's already built, if anything]
What I want different: [the specific delta]
```

Adding "Suspected existing infrastructure: I think we have View As but the gate may be too broad" would have told me upfront this is a gate-tuning task, not a feature-build task. The fix is one file, three lines — but my response had to walk through the audit trail because the prompt didn't explicitly acknowledge the existing system.

## Further enhancement suggestion

For **gate/permission-tuning prompts** specifically, the highest-leverage frame is:

```text
Restrict [capability] to [exact subjects], gating on [flag/role/permission name if known]. Today it's available to [who you've observed]. Hide it from [who shouldn't have it].
```

Example that would have produced a tighter response:

```text
Restrict View As (team-member impersonation) to is_super_admin OR is_primary_owner only. Today it appears for the admin role too. Hide it from admin-role-only users and from platform users.
```

Single sentence, four constraints (capability, allowed subjects, current state, denied subjects). The **"Today it's X / Hide it from Y"** pairing is the underused construct on permission prompts — it tells me the current state and the delta in one beat, which is exactly what gate-tuning needs. Most permission prompts only specify the *destination* state and leave me to discover the current state through exploration.

