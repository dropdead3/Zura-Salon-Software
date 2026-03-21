

## Fix Remaining Template Literal Corruptions

### Root Cause

The previous state-machine repair script over-corrected in two ways:

1. **Inserted spurious `}` before nested backticks** — 142 occurrences across 12 files. Pattern: `${expr ? }\`nested\` : ''}` should be `${expr ? \`nested\` : ''}`. The fix removed the closing `}` of the `${}` expression and placed it before the nested backtick.

2. **A few individual corruption cases** — missing closing backticks or extra `}` characters.

### Fix Strategy

Run a single targeted find-and-replace operation that removes the errant `}` before nested backticks in ternary expressions. The regex pattern is simple and safe:

- **Find**: `? }\`` (question mark, space, closing brace, backtick)
- **Replace**: `? \`` (question mark, space, backtick)

This covers 142 of the matches. Then fix 2-3 individual cases manually:

### Individual Fixes

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `BirthdayExportButton.tsx` | 89 | Missing closing backtick — `` `Generated on ${...}` `` runs into `, 14, 28)` | Close the template literal: `` `Generated on ${formatDate(new Date(), 'MMMM d, yyyy h:mm a')}` `` then `, 14, 28)` |
| `PendingMeetingRequests.tsx` | 133 | Double `}}` at end of template literal | Remove extra `}`: `` `Schedule by ${formatDate(parseISO(request.expires_at), 'MMM d')}` `` |
| `ClientDetailSheet.tsx` | ~945 | Check for similar ternary corruption | Verify and fix if needed |

### Execution

1. Python script to do the bulk `? }\`` → `? \`` replacement across all 12 files
2. Manual fixes for the 2-3 individual cases above
3. Verify with `npx vite build`

### Files affected (~15 total)

- `src/components/dashboard/EmailTemplateEditor.tsx` (heaviest — ~20 occurrences)
- `src/components/dashboard/backroom-settings/inventory/StockTab.tsx`
- `src/components/dashboard/promotions/VoucherQRCode.tsx`
- `src/components/dashboard/operations/WalkInDialog.tsx`
- `src/components/dashboard/schedule/shifts/ShiftScheduleView.tsx`
- `src/components/dashboard/schedule/ClosedDayWarningDialog.tsx`
- `src/components/dashboard/sales/ImplementPlanDialog.tsx`
- `src/components/dashboard/backroom/InstantFormulaCard.tsx`
- `src/components/platform/backroom/CSVImportDialog.tsx`
- `src/contexts/SmartActionContext.tsx`
- `src/components/dashboard/BirthdayExportButton.tsx`
- `src/components/coaching/PendingMeetingRequests.tsx`
- `src/components/dashboard/ClientDetailSheet.tsx`
- `src/components/dashboard/appointments-hub/AppointmentsList.tsx`

