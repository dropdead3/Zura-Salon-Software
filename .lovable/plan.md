

## Harden Phorest Write Protection

### Current State (Already Safe)
The codebase has a write-gate pattern across all 4 edge functions that could write to Phorest:
- `update-phorest-appointment` -- status changes (PUT)
- `update-phorest-appointment-time` -- reschedules (PATCH)
- `create-phorest-booking` -- new bookings (POST)
- `create-phorest-client` -- new clients (POST)

All check `organizations.settings.phorest_write_enabled === true` and default to `false` when unset. Your organization currently has it unset (null), so all writes are blocked. No DELETE operations to Phorest exist anywhere in the codebase.

### What This Plan Adds
Add a **secondary hardcoded safety check** in each edge function so that even if someone accidentally enables the toggle, Phorest API calls are still blocked. This acts as a code-level kill switch independent of the database setting.

### Changes (4 files)

**1. `supabase/functions/update-phorest-appointment/index.ts`**
Add a hardcoded constant at the top: `const PHOREST_WRITES_GLOBALLY_DISABLED = true;`
Then wrap the existing write-gate check: if `PHOREST_WRITES_GLOBALLY_DISABLED` is true, force `phorestWriteEnabled = false` and log a warning.

**2. `supabase/functions/update-phorest-appointment-time/index.ts`**
Same pattern -- add global disable constant, override the write gate.

**3. `supabase/functions/create-phorest-booking/index.ts`**
Same pattern -- add global disable constant, override the write gate.

**4. `supabase/functions/create-phorest-client/index.ts`**
Same pattern -- add global disable constant, override the write gate.

### How It Works
```text
Request arrives
  → Check org settings (phorest_write_enabled)
  → OVERRIDE: if PHOREST_WRITES_GLOBALLY_DISABLED === true
       → force phorestWriteEnabled = false
       → log: "GLOBAL SAFETY: Phorest writes are disabled at code level"
  → All operations proceed local-only
```

### Reversibility
When you're ready to enable Phorest writes in the future, change `PHOREST_WRITES_GLOBALLY_DISABLED` to `false` in each function and redeploy. The existing database toggle then takes over.

