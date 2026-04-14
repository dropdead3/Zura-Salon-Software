

# Wire Receipt Branding to Checkout + Add Email/SMS Receipt

## Two Problems

### 1. Scheduler checkout ignores receipt branding
`CheckoutSummarySheet.generateReceiptPDF()` is a standalone jsPDF function with hardcoded styles. It doesn't import `useReceiptConfig`, `printReceipt`, or any branding hooks. The Receipt Configurator only affects the Transactions page reprint — not the receipt clients actually receive at checkout.

### 2. No email/SMS receipt capability exists
The "Email Receipt" dropdown item in `TransactionDetailSheet` is disabled with a "Soon" badge. No edge function or sending logic exists.

---

## Plan

### Step 1: Unify checkout receipt with branded system

**File: `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`**

- Import `useReceiptConfig` and `useBusinessSettings` (already imported partially)
- Replace the entire `generateReceiptPDF()` function with a call to a shared receipt generator that respects `receipt_config`
- Two options:
  - **Option A**: Refactor `printReceipt()` from `ReceiptPrintView.tsx` to accept a generic line-item array (not just `GroupedTransaction`), then call it from both the Transactions page and the checkout sheet
  - **Option B**: Create a shared `buildReceiptHTML()` utility that both `printReceipt` and `generateReceiptPDF` consume, keeping PDF generation separate but using the same branded template

Option A is cleaner — adapt `printReceipt` to accept a `ReceiptData` interface that both `GroupedTransaction` and the checkout context can satisfy.

**New file: `src/components/dashboard/transactions/receiptData.ts`**
- Define a `ReceiptData` interface with: client name, stylist name, date, items (name + amount), add-ons, usage charges, subtotal, discount, tax, tip, total, payment method
- Add a mapper: `groupedTransactionToReceiptData(txn: GroupedTransaction): ReceiptData`
- Add a mapper: `checkoutToReceiptData(appointment, addonEvents, usageCharges, totals): ReceiptData`

**File: `src/components/dashboard/transactions/ReceiptPrintView.tsx`**
- Refactor `printReceipt` to accept `ReceiptData` instead of `GroupedTransaction`
- All branding logic (logo, socials, policies, footer) stays intact

**File: `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`**
- Remove the 200-line `generateReceiptPDF` function
- Import and call refactored `printReceipt` with checkout data mapped through `checkoutToReceiptData`

### Step 2: Add "Send Test Receipt" to Receipt Configurator

**File: `src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx`**
- Add a "Send Test Receipt" button in the preview panel
- On click, opens a small dialog asking for delivery method (Email or SMS) and recipient address/number
- Calls a new edge function with sample receipt data + branding config

### Step 3: Create receipt-sending edge function

**New file: `supabase/functions/send-receipt/index.ts`**
- Accepts: `{ method: 'email' | 'sms', recipient: string, receiptHtml: string, orgName: string }`
- For **email**: Uses Resend (already available as a connector) to send a styled HTML email with the branded receipt
- For **SMS**: Sends a simplified text summary with a link to a hosted receipt (or just key totals if no hosted version yet)
- Returns success/failure

### Step 4: Wire email/SMS receipt to checkout flow

**File: `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`**
- After successful payment confirmation, if client has email on file, auto-send email receipt via the edge function
- Add a manual "Send Receipt" button (email/SMS toggle) post-checkout

**File: `src/components/dashboard/transactions/TransactionDetailSheet.tsx`**
- Enable the "Email Receipt" dropdown item
- Remove the "Soon" badge
- On click, call the same edge function with the transaction's receipt data

### Step 5: No database migration needed
All receipt config already lives in `site_settings`. Client emails exist on appointments. No new tables required.

---

## Technical Details

### ReceiptData interface (shared)
```ts
interface ReceiptLineItem {
  name: string;
  amount: number;
  category?: 'service' | 'addon' | 'retail' | 'overage' | 'product_cost';
}

interface ReceiptData {
  clientName: string;
  stylistName: string;
  date: string;
  receiptNumber: string;
  items: ReceiptLineItem[];
  subtotal: number;
  discount: number;
  discountLabel?: string;
  taxRate: number;
  taxAmount: number;
  tip: number;
  total: number;
  paymentMethod?: string;
}
```

### File change summary
| File | Action |
|------|--------|
| `src/components/dashboard/transactions/receiptData.ts` | New — shared interface + mappers |
| `src/components/dashboard/transactions/ReceiptPrintView.tsx` | Refactor to use `ReceiptData` |
| `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` | Remove `generateReceiptPDF`, use shared `printReceipt` |
| `src/components/dashboard/transactions/GroupedTransactionTable.tsx` | Update to use mapper |
| `src/components/dashboard/transactions/TransactionDetailSheet.tsx` | Enable email receipt action |
| `src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx` | Add "Send Test Receipt" button |
| `supabase/functions/send-receipt/index.ts` | New — email/SMS delivery |

