

# Replace "Message" button with "Email" button on Team Member detail header

## Diagnosis (Surface → Assertion → Lever → Gap → Affordance)

- **Surface**: `TeamMemberHeader.tsx` — top-right action area on the Team Member detail page (`/dashboard/admin/team-members/:userId`).
- **Current state**: Renders a Connect-gated `[Message]` button that opens a DM channel in `/dashboard/team-chat`. Hidden entirely when the org doesn't have Zura Connect entitled.
- **Gap**: For the majority of orgs (no Connect), the header has no contact affordance at all — opening a person's profile gives no way to reach out. Even for entitled orgs, "Message" is the wrong default for a settings/admin context where async written communication is more typical.
- **Desired affordance**: Always-available `[Email]` button that opens the user's mail client pre-populated with the team member's email address. Zero entitlement gating, zero new infrastructure.

## What gets built

### 1. Replace the Message button with an Email button

In `src/components/dashboard/team-members/TeamMemberHeader.tsx`:

- Remove the `useConnectEntitlement` hook call and the entitlement-gated render branch.
- Remove the navigation handler that routes to `/dashboard/team-chat`.
- Remove the `MessageSquare` import (or swap to `Mail`).
- Render a single `[Email]` button when the team member has an `email` value:
  - Icon: `Mail` from `lucide-react`
  - Label: "Email"
  - Same pill/cardAction styling as before (token: `tokens.button.cardAction`)
  - `onClick` → `window.location.href = mailto:${member.email}` (standard mailto, opens the operator's default mail client)
- If the team member has no email on file, render the button in a disabled state with a tooltip "No email on file" — keeps the affordance present so the operator knows email is the expected channel, but prevents broken `mailto:` links.

### 2. Drop now-unused imports/props

- Remove `useConnectEntitlement` import if not used elsewhere in the file.
- Keep all other header content (avatar, name, role badge, status, hire date) untouched.

## Files affected

| File | Change |
|---|---|
| `src/components/dashboard/team-members/TeamMemberHeader.tsx` | Replace Connect-gated Message button with always-on Email (mailto) button; drop entitlement hook |

## What stays untouched

- `useConnectEntitlement` hook itself — still used by `/dashboard/team-chat` and other Connect surfaces.
- `TeamMemberDetail.tsx` and all 8 tabs — no prop changes required.
- Connect entitlement gating elsewhere in the app — unaffected.
- `useEmployeeProfile` / `useOrganizationUsers` — same data shape, the header already reads `email` from the member object.

## Acceptance

1. Open any team member detail page in an org **without** Connect entitlement → header shows an `[Email]` button (previously showed nothing).
2. Open any team member detail page in an org **with** Connect entitlement → header shows the same `[Email]` button (no longer shows Message).
3. Clicking `[Email]` opens the operator's default mail client with `to:` pre-filled to the team member's email address.
4. For a team member with no email on file, the button renders disabled with a tooltip "No email on file".
5. No console errors. No broken imports. No regressions on the 8 settings tabs.

## Doctrine alignment

- **One primary lever, where the assertion is made**: the contact affordance now lives where every operator can use it, not gated on a paid add-on.
- **Persona scaling**: works for every org regardless of subscription tier.
- **No duplicate sources of truth**: email comes from `employee_profiles.email` — same source the Profile tab edits.
- **Calm executive UX**: a single, predictable action (email) replaces a conditionally-rendered one (message-or-nothing).

## Out of scope (queue separately)

- In-app composed email via the Lovable Emails infrastructure (would require a compose UI, send-on-behalf permission model, and audit trail). Today's `mailto:` is the minimum viable contact path.
- SMS / phone-call buttons. Add when there's a documented operator demand and a sending channel.
- Re-introducing the Message button as an additional action when Connect is entitled (i.e. both buttons side-by-side). Defer until we hear operators in entitled orgs miss it — keeping a single primary action is the cleaner default.

