

# Revised Plan: Gate FAB Chat Tab Behind Zura Connect

## Original Plan (confirmed solid)
1. Import `useConnectEntitlement` in `HelpFAB.tsx`; hide Chat tab when not entitled
2. Fix pathname checks to use `.includes()` for org-slug routing
3. Remove duplicate `MemberItemProps` interface in `ChatLeadershipTab.tsx`

## Additional Findings

### 1. Schedule page pathname check also broken (Bug — same root cause)
Line 20: `location.pathname === '/dashboard/schedule'` won't match `/org/:slug/dashboard/schedule`. This affects three behaviors:
- The schedule-specific copilot FAB button (lines 48-76)
- The booking popover hide logic (lines 42-45)
- The copilot toggle dispatch (line 33)

All three `isSchedulePage` references need the same `.includes()` fix.

### 2. ChatLeadershipTab navigates to team-chat without entitlement check (Minor gap)
`handleSelectMember` creates a DM then navigates to `/team-chat`. If the FAB Chat tab is properly hidden for non-entitled users, this is unreachable — but as defense-in-depth, the navigation will still work if someone accesses it. No change needed since the gate at the FAB level is sufficient.

### 3. Platform users should still see the Chat tab (Behavioral note)
Platform users (God Mode) bypass the Connect gate on the TeamChat page. The FAB should mirror this — platform users always see the Chat tab regardless of entitlement. The `useAuth` hook's `isPlatformUser` is already available in `ChatLeadershipTab` but needs to be checked in `HelpFAB.tsx` too.

## Updated Change Table

| File | Change |
|------|--------|
| `src/components/dashboard/HelpFAB.tsx` | 1) Import `useConnectEntitlement` and `useAuth`. 2) Hide Chat tab + TabsList when `!isEntitled && !isPlatformUser`. 3) Fix team-chat pathname: `.includes('/dashboard/team-chat')`. 4) Fix schedule pathname: `.includes('/dashboard/schedule')`. |
| `src/components/dashboard/help-fab/ChatLeadershipTab.tsx` | Remove duplicate `MemberItemProps` interface (lines 30-35 duplicate of 37-42). |

### Detail: HelpFAB gating logic

```tsx
const { isEntitled: hasConnect } = useConnectEntitlement();
const { isPlatformUser } = useAuth();

const showChatTab = hasConnect || isPlatformUser;
```

When `showChatTab` is false:
- Remove `TabsList` entirely — no tab switcher visible
- Lock `activeTab` to `'ai-help'`
- Only render the AI Help tab content

When `showChatTab` is true:
- Render both tabs as current behavior

### Detail: Pathname fixes (all in HelpFAB.tsx)

```tsx
// Before
const isSchedulePage = location.pathname === '/dashboard/schedule';
if (location.pathname === '/dashboard/team-chat') { return null; }

// After
const isSchedulePage = location.pathname.includes('/dashboard/schedule');
if (location.pathname.includes('/dashboard/team-chat')) { return null; }
```

