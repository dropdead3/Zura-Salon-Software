

# Zura Connect — Phase 1: Subscription Gating and Branding

## What We Are Building

Transform Team Chat into **Zura Connect**, a subscription add-on within the Zura ecosystem. Phase 1 focuses on branding, entitlement gating, and the subscription infrastructure. External client communications (SMS + in-app) come in Phase 2.

## Architecture

The existing Color Bar app follows a proven entitlement pattern: `organization_feature_flags` with a key (`backroom_enabled`), a `useColorBarEntitlement` hook, and UI gating. Zura Connect will mirror this exactly with flag key `connect_enabled`.

```text
organization_feature_flags
  ├─ flag_key: 'connect_enabled'
  └─ is_enabled: true/false

useConnectEntitlement()
  ├─ checks org flag
  └─ returns { isEntitled, isLoading }

Team Chat page
  ├─ if entitled → render Zura Connect UI
  └─ if not → render upgrade/subscription CTA
```

## Changes

### 1. Brand tokens — `src/lib/brand.ts`

Add `CONNECT_APP_NAME = 'Zura Connect'` and `CONNECT_DESCRIPTOR = 'Team & Client Communications'` to the brand token file.

### 2. Entitlement hook — `src/hooks/connect/useConnectEntitlement.ts` (new)

Mirrors `useColorBarEntitlement`: queries `organization_feature_flags` for `connect_enabled`. Returns `{ isEntitled, isLoading }`.

### 3. Subscription gate component — `src/components/connect/ConnectSubscriptionGate.tsx` (new)

Full-page upgrade CTA shown when the org is not entitled. Describes Zura Connect value proposition, shows pricing, and provides an action to activate (initially a "Contact Sales" or "Activate" button that sets the feature flag for testing).

### 4. Update Team Chat page — `src/pages/dashboard/TeamChat.tsx`

Wrap `TeamChatContainer` in entitlement check:
- If entitled: render chat as-is
- If not entitled: render `ConnectSubscriptionGate`

### 5. Rebrand UI surfaces

| File | Change |
|------|--------|
| `ChannelSidebar.tsx` | Header text from "Team Chat" to brand token `CONNECT_APP_NAME` |
| `ChannelHeader.tsx` | Update fallback title |
| `TeamChatAdminSettingsSheet.tsx` | Title → "Zura Connect Settings" |
| `pageExplainers.ts` | Update `team-chat` entry description |

### 6. Navigation update — `src/config/dashboardNav.ts`

Change sidebar label from `'Team Chat'` to `'Connect'`, update `labelKey` to `'connect'`. Add localization key `"connect": "Connect"` in `en.json`.

### 7. Apps section in sidebar

Add Zura Connect to the Apps section alongside Color Bar, using the `connect_enabled` flag for conditional visibility (same pattern as Color Bar).

### 8. Feature flag seed

Create a migration to insert a `connect_enabled` global feature flag (disabled by default) so orgs can opt in.

### 9. Platform Admin activation

Add Zura Connect to the Account Settings feature toggles (alongside Color Bar's `backroom_enabled`) so platform admins can activate it per organization.

## Files

| File | Action |
|------|--------|
| `src/lib/brand.ts` | Add Connect tokens |
| `src/hooks/connect/useConnectEntitlement.ts` | Create — entitlement hook |
| `src/components/connect/ConnectSubscriptionGate.tsx` | Create — upgrade gate UI |
| `src/pages/dashboard/TeamChat.tsx` | Add entitlement check |
| `src/components/team-chat/ChannelSidebar.tsx` | Rebrand header |
| `src/components/team-chat/ChannelHeader.tsx` | Rebrand fallback |
| `src/components/team-chat/TeamChatAdminSettingsSheet.tsx` | Rebrand title |
| `src/config/dashboardNav.ts` | Update label + labelKey |
| `src/config/pageExplainers.ts` | Update description |
| `src/locales/en.json` | Add `connect` key |
| `supabase/migrations/` | Seed `connect_enabled` feature flag |
| `src/components/platform/account/AccountSettingsTab.tsx` | Add Connect toggle |

## What This Does NOT Include (Phase 2+)

- External client messaging (SMS via Twilio, in-app portal)
- Client conversation channel type
- Dedicated billing/Stripe subscription flow (Phase 1 uses feature flags for activation)
- Separate app shell or routing (stays enhanced existing page per your preference)

## Technical Notes

- No new database tables needed — reuses existing `feature_flags` and `organization_feature_flags` infrastructure
- No new permissions required — Team Chat permissions carry over
- The entitlement hook follows the exact same pattern as Color Bar, ensuring consistency
- Migration is additive only (INSERT into feature_flags)

