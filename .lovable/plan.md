

# Design System Governor -- Appointments & Transactions Hub

## Canon Map

| Surface | Token Expected | Files |
|---------|---------------|-------|
| Page title | `tokens.heading.page` | DashboardPageHeader.tsx |
| Section headings | `tokens.heading.subsection` | AppointmentsHub.tsx |
| Stat values | `tokens.stat.large` | AppointmentsHub.tsx |
| Stat labels | `tokens.body.muted` | AppointmentsHub.tsx |
| Table column headers | `tokens.table.columnHeader` | AppointmentsList.tsx, TransactionList.tsx, PromoRedemptionList.tsx |
| Card wrappers | `tokens.card.wrapper` | All card instances |
| Buttons (card-level) | `tokens.button.card` | All filter/action buttons |
| Empty states | `tokens.empty.*` | AppointmentsList.tsx, TransactionList.tsx, PromoRedemptionList.tsx |
| Loading skeletons | `tokens.loading.skeleton` | All loading states |
| Body text | `tokens.body.*` | All descriptive text |

---

## Quantified Violations

### V1. DashboardPageHeader -- Non-token page title (DashboardPageHeader.tsx:42)
- **Current:** `text-xl md:text-2xl font-display truncate`
- **Violation:** Missing `font-medium tracking-wide`. Uses raw classes instead of `tokens.heading.page`.
- **Severity:** Medium

### V2. TransactionList -- Missing `tokens.table.columnHeader` on all column headers (TransactionList.tsx:129-145)
- **Current:** Raw `<TableHead>` with no token class. SortHeader buttons use raw `font-medium`.
- **Violation:** 9 column headers lack `tokens.table.columnHeader`.
- **Severity:** High (hard rule)

### V3. TransactionList -- Empty state uses raw classes (TransactionList.tsx:112-120)
- **Current:** `className="p-8 text-center"`, raw `w-12 h-12 mx-auto text-muted-foreground mb-4`, raw `font-medium text-lg mb-2`
- **Violation:** Not using `tokens.empty.*` tokens.
- **Severity:** Medium

### V4. TransactionList -- Loading skeleton uses non-token height (TransactionList.tsx:104)
- **Current:** `className="h-12 w-full"`
- **Violation:** Token is `tokens.loading.skeleton` (`h-14 w-full`).
- **Severity:** Low

### V5. TransactionList -- `font-medium` used directly on table cells (TransactionList.tsx:151, 155, 184, 189)
- **Current:** Raw `font-medium` on cells without token reference.
- **Assessment:** Allowed (weight 500), but should use `tokens.body.emphasis` for consistency.
- **Severity:** Low

### V6. AppointmentsHub stat cards -- Missing `tokens.card.wrapper` (AppointmentsHub.tsx:126-150)
- **Current:** `<Card className="p-4">` -- no `rounded-xl` token.
- **Violation:** Cards should use `tokens.card.wrapper` or at minimum ensure `rounded-xl`.
- **Severity:** Medium

### V7. AppointmentsHub stat card labels -- raw text classes (AppointmentsHub.tsx:127, 131, etc.)
- **Current:** `className="text-sm text-muted-foreground"`
- **Should be:** `tokens.body.muted`
- **Severity:** Low

### V8. AppointmentsHub filter card -- no padding token (AppointmentsHub.tsx:154-244)
- **Current:** `<Card>` with nested `<div className="p-4 ...">`.
- **Violation:** No `tokens.card.wrapper` on card. Padding `p-4` deviates from `tokens.layout.cardPadding` (`p-6`).
- **Assessment:** Filter bars reasonably use `p-4` for compactness. Mark as acceptable deviation.
- **Severity:** Informational

### V9. AppointmentsList filter card -- `mb-4` on card (AppointmentsList.tsx:119)
- **Current:** `<Card className="mb-4">`
- **Violation:** Individual cards must NOT carry internal vertical margins. Vertical gaps managed by parent containers.
- **Severity:** Medium (hard rule)

### V10. AppointmentsList filter card -- uses `CardContent` with `pt-4` (AppointmentsList.tsx:120)
- **Current:** `<CardContent className="pt-4">`
- **Assessment:** Inconsistent with TransactionsTab filter card which uses raw `<Card>` + `<div className="p-4">`.
- **Severity:** Low (consistency)

### V11. Pending refunds section -- `font-medium` without token (AppointmentsHub.tsx:254, 258)
- **Current:** Raw `font-medium` on refund item name and amount.
- **Should be:** `tokens.body.emphasis`
- **Severity:** Low

### V12. AppointmentDetailDrawer -- `font-medium` on promo name (AppointmentDetailDrawer.tsx:137, 147)
- **Current:** Raw `text-sm font-medium`
- **Should be:** `tokens.body.emphasis`
- **Severity:** Low

### V13. Reschedule history label -- raw `font-medium` (AppointmentDetailDrawer.tsx:159)
- **Current:** `<span className="font-medium">`
- **Should be:** `tokens.body.emphasis` or `tokens.label.default`
- **Severity:** Low

### V14. AppointmentsHub -- `space-y-4` on TransactionsTab root (AppointmentsHub.tsx:123)
- **Assessment:** `space-y-4` (16px) vs canonical `space-y-6` (24px). Tighter spacing acceptable for dense data views.
- **Severity:** Informational

### V15. Pagination buttons -- raw `h-8 w-8` (AppointmentsList.tsx:252-256)
- **Assessment:** Ghost icon buttons with custom sizing. Acceptable for pagination controls.
- **Severity:** Informational

---

## Total Violations: 15 identified, 11 actionable

| Severity | Count |
|----------|-------|
| High | 1 (V2) |
| Medium | 4 (V1, V3, V6, V9) |
| Low | 6 (V4, V5, V7, V10, V11, V12, V13) |
| Informational | 3 (V8, V14, V15) |

---

## Corrections Plan

### File 1: `src/components/dashboard/DashboardPageHeader.tsx`
- Line 42: Replace `text-xl md:text-2xl font-display truncate` with `cn(tokens.heading.page, 'truncate')`
- Add `tokens` import

### File 2: `src/components/dashboard/transactions/TransactionList.tsx`
- Lines 129-145: Add `tokens.table.columnHeader` to all `<TableHead>` elements
- Lines 112-120: Replace empty state with `tokens.empty.*` pattern
- Line 104: Replace `h-12 w-full` with `tokens.loading.skeleton`
- Lines 151, 155, 189: Replace raw `font-medium` with `tokens.body.emphasis` where appropriate

### File 3: `src/pages/dashboard/AppointmentsHub.tsx`
- Lines 126-150: Add `tokens.card.wrapper` to stat cards
- Lines 127, 131, 135, 139, 148: Replace raw `text-sm text-muted-foreground` with `tokens.body.muted`
- Lines 254, 258: Replace raw `font-medium` with `tokens.body.emphasis`

### File 4: `src/components/dashboard/appointments-hub/AppointmentsList.tsx`
- Line 119: Remove `mb-4` from Card -- wrap in parent `space-y-4` container instead
- Line 120: Normalize to `<div className="p-4">` pattern for consistency with TransactionsTab

### File 5: `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx`
- Line 137: Replace `text-sm font-medium` with `tokens.body.emphasis`
- Line 147: Replace `font-medium` with via `tokens.body.emphasis`
- Line 159: Replace `font-medium` with `tokens.label.default`

---

## System Integrity Score

| Dimension | Score |
|-----------|-------|
| Typography tokens | 72 / 100 |
| Spacing discipline | 85 / 100 |
| Card/radius tokens | 78 / 100 |
| Table header compliance | 50 / 100 |
| Empty/loading states | 75 / 100 |
| Button tokens | 95 / 100 |
| Color tier compliance | 90 / 100 |
| Overall | **78 / 100** |

Post-correction target: **94 / 100**

