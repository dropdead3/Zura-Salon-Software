

# Improve Weights & Manual Approval Explainer

## Problem

1. The "How Weights Work" explainer still contains the old note saying all individual thresholds must be met — this was supposed to be removed when we made weights meaningful.
2. The "Require Manager Approval" toggle lacks context. Admins need to understand that they can promote stylists at any time regardless of this setting, and that this toggle only controls whether the system **notifies** when criteria are met (manual = notification for review, automatic = auto-qualifies without notification).

## Changes

### 1. Update Weights explainer (lines 938-941)

Remove the outdated `Note: regardless of weights...` span (the blue text about all thresholds needing to be met). The current first sentence is correct — keep it. The blue example text stays. The old note was already removed in the code but the screenshot shows it's still there, so we need to verify and ensure only the correct copy exists.

### 2. Enhance "Require Manager Approval" section (lines 1031-1043)

Add an explainer box below the toggle (same blue styling) clarifying:

- **Title:** "ABOUT PROMOTION APPROVAL"
- **Body:** "Admins with permissions can promote or demote stylists at any time from the Graduation Tracker — this setting does not restrict that ability. When enabled, the system will notify managers when a stylist meets their criteria, requiring manual sign-off before the level change takes effect. When disabled, qualifying stylists are automatically flagged as ready without requiring approval."
- This makes it clear: the toggle controls notification/workflow behavior, not admin authority.

### 3. Update the toggle description (line 1036)

Change from: `"Promotion needs sign-off even when criteria are met"`
To: `"Notify managers for review when criteria are met instead of auto-qualifying"`

## Scope
- Single file: `GraduationWizard.tsx`
- ~15 lines added/modified
- No database changes

