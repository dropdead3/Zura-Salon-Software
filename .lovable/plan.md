

# Add "View in Client Directory" Link to Appointment Detail Panel

## What Changes

Add a navigation link at the bottom of the **Client Contact** section in the Appointment Detail Panel. This link will navigate the user to the Client Directory page, pre-selecting the client record.

## Where It Goes

In `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`, after the existing contact info (phone, email) and before the recurrence section, a small link reading **"View in Client Directory"** with an ExternalLink icon will be added. It uses `react-router-dom`'s `useNavigate` to route to `/dashboard/admin/clients?clientId={phorest_client_id}`.

The link will only appear for non-walk-in appointments (where `phorest_client_id` exists).

## Technical Details

### File: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

1. Import `useNavigate` from `react-router-dom` (if not already imported)
2. After the existing contact info block (around line 971, after the closing `</div>` of the Client Contact section), add a small link:

```tsx
{!isWalkIn && appointment.phorest_client_id && (
  <button
    onClick={() => {
      handleClose();
      navigate(`/dashboard/admin/clients?clientId=${appointment.phorest_client_id}`);
    }}
    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
  >
    <ExternalLink className="h-3 w-3" />
    View in Client Directory
  </button>
)}
```

3. The Client Directory page (`ClientDirectory.tsx`) already supports opening a client detail sheet via query params or click -- we just need to route there with the `phorest_client_id` so the user lands on the directory with the right client context.

This is a single-file, minimal change.
