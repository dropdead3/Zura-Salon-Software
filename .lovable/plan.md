

# Receipt Branding Editor & Live Preview — Gap & Bug Analysis

## Critical Bugs

### 1. `printReceipt()` called without branding data (HIGH)
Both `GroupedTransactionTable.tsx` (line 218) and `TransactionDetailSheet.tsx` (line 354) call `printReceipt(txn, formatCurrency)` with only 2 args. The function signature accepts 5 params — `orgName`, `receiptConfig`, and `businessInfo` are all omitted. This means **every printed receipt from the Transactions page ignores all receipt branding settings** and falls back to `DEFAULT_RECEIPT_CONFIG` with no logo, no address, no socials, no review links, and no footer icon.

**Fix:** Both callers must load `useReceiptConfig()`, `useBusinessSettings()`, `useWebsiteSocialLinksSettings()`, and `useReviewThresholdSettings()` and pass the data through to `printReceipt()`.

### 2. Redo policy text not auto-populated when blank (MEDIUM)
The editor says "Leave blank to use auto-generated text from your redo settings" (line 339), but neither the preview nor `ReceiptPrintView` implements this fallback. If the user enables "Redo Policy" and leaves the text blank, nothing renders — the condition `cfg.show_redo_policy && cfg.redo_policy_text` is falsy when the text is empty. The `redoPolicyPlaceholder` is only used as an input placeholder, never as an actual fallback value.

**Fix:** In both `ReceiptPreview` and `ReceiptPrintView`, when `show_redo_policy` is true and `redo_policy_text` is empty, resolve the text from the redo policy settings (`redo_window_days`).

## Minor Gaps

### 3. Preview doesn't show Color Room charges section
The live preview only shows static sample items (Balayage + Olaplex). It doesn't preview what Color Room usage charges would look like, even as sample data. This is a cosmetic gap — not a bug — but reduces preview fidelity.

**Fix (optional):** Add a sample "Color Room Charges" section to the preview with dummy data (e.g., "Overage — 2 oz — $6.00") so users can see the full receipt layout.

### 4. Preview review platform links render in gray, but `ReceiptPrintView` links use `color: #666`
Minor inconsistency — the preview uses Tailwind `text-gray-600` while the print view uses inline `color: #666`. These are visually close but not identical. Not a real bug.

### 5. `accent_color` field exists in config but is unused
The `ReceiptConfig` interface still has `accent_color: string` and the default is `''`. The previous plan removed the color picker from the editor, but the field remains in the type and DB. Harmless dead code.

### 6. No unsaved-changes warning on navigation
If the user edits settings and navigates away without saving, changes are silently lost. No `beforeunload` guard or dirty-state prompt exists.

## Recommended Fix Plan

### Files to modify:

**`src/components/dashboard/transactions/GroupedTransactionTable.tsx`**
- Import `useReceiptConfig`, `useBusinessSettings`, `useWebsiteSocialLinksSettings`, `useReviewThresholdSettings`
- Build `businessInfo` object from hook data
- Pass all 5 args to `printReceipt()`

**`src/components/dashboard/transactions/TransactionDetailSheet.tsx`**
- Same as above — wire all receipt branding data into `printReceipt()`

**`src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx` (ReceiptPreview)**
- When `show_redo_policy` is true and `redo_policy_text` is empty, render the auto-generated fallback text from redo policy settings

**`src/components/dashboard/transactions/ReceiptPrintView.tsx`**
- Same redo policy fallback: when `show_redo_policy` is true and `redo_policy_text` is empty, accept and use a fallback redo text string

**Optional: Add sample Color Room charges to ReceiptPreview**
- Show a mock "Color Room Charges" row below the sample items to give users a complete picture of receipt layout

