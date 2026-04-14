

# Fix: Terminal Reader Display Clear

## Root Cause
The edge function at line 125 calls `stripe.terminal.readers.clearReaderDisplay()` — this method **does not exist** in the Stripe SDK. The error is logged but swallowed on the client side, so the toast says "Reader display cleared" even though it failed.

The correct Stripe API method to reset a reader's screen is `stripe.terminal.readers.cancelAction()`, which is already implemented in the same function (line 150) for the `cancel_action` action.

## Fix

**File: `supabase/functions/terminal-reader-display/index.ts`** (lines 124-129)

Replace:
```typescript
if (action === "clear_reader_display") {
  const readerAction = await stripe.terminal.readers.clearReaderDisplay(
    reader_id,
    stripeOpts
  );
  return jsonResponse({ success: true, reader: readerAction });
}
```

With:
```typescript
if (action === "clear_reader_display") {
  const readerAction = await stripe.terminal.readers.cancelAction(
    reader_id,
    stripeOpts
  );
  return jsonResponse({ success: true, reader: readerAction });
}
```

**File: `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`** (lines 238-258)

Add proper error handling so the toast only shows success when the API actually succeeds:
```typescript
const { data, error } = await supabase.functions.invoke('terminal-reader-display', {
  body: { action: 'clear_reader_display', reader_id: readerId, organization_id: orgId },
});
if (error || data?.error) {
  throw new Error(data?.error || error?.message || 'Clear failed');
}
toast.success('Reader display cleared');
```

## Summary
One-line backend fix — wrong Stripe SDK method name. Plus tighten the client-side error handling so failures aren't silently reported as success.

