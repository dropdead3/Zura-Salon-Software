

# Dynamic Role-Based Prompts in FAB Chat Modal

## Overview
Replace the static `EXAMPLE_PROMPTS` array with role-aware prompt sets that surface relevant questions based on the user's effective role (owner/super_admin, manager, stylist, front_desk).

## Changes

### File: `src/components/dashboard/help-fab/AIHelpTab.tsx`

1. Import `useEffectiveRoles` from `@/hooks/useEffectiveUser`
2. Replace the static `EXAMPLE_PROMPTS` constant with a role-mapping object:

```text
ROLE_PROMPTS = {
  leadership: [  // super_admin, admin
    "How is my business performing this week?",
    "Show me team utilization insights",
    "How do I set up commission structures?",
    "What reports are available for revenue?"
  ],
  manager: [
    "Who has open slots today?",
    "How do I manage team schedules?",
    "Where can I see daily performance?",
    "How do I handle a client complaint?"
  ],
  stylist: [
    "Where can I find my stats?",
    "How do I update my profile?",
    "How does the 3-Second Rebook work?",
    "What is the Ring the Bell feature?"
  ],
  front_desk: [
    "How do I book an appointment?",
    "How do I check a client in?",
    "Where can I find client contact info?",
    "How do I process a checkout?"
  ],
  default: [
    "How do I request an assistant?",
    "Where can I find my stats?",
    "How do I update my profile?",
    "What is the Ring the Bell feature?"
  ]
}
```

3. Add a `useMemo` that resolves the user's highest-priority role to select the correct prompt set:
   - If roles include `super_admin` or `admin` → leadership
   - If roles include `manager` → manager
   - If roles include `front_desk` → front_desk
   - If roles include `stylist` → stylist
   - Else → default

4. Use the resolved prompts in the existing render loop (no structural changes to JSX)

### Files Modified
- `src/components/dashboard/help-fab/AIHelpTab.tsx` — sole file, ~30 lines added/changed

### Technical Notes
- Uses `useEffectiveRoles()` which respects View As impersonation, so admins testing role views will see the correct prompts
- Role priority follows the existing hierarchy pattern used elsewhere in the codebase
- No backend changes needed — purely client-side prompt selection

