

# Fix TypeScript "excessively deep type instantiation" in useEvaluateComplianceLog

## Problem
Line 61 has a known TypeScript issue where the Supabase client's type inference for `mix_bowls` creates an excessively deep type instantiation. This is a common issue with complex Supabase-generated types.

## Fix
Cast the query result to `any` to bypass the deep type inference:

```ts
const { data: bowls } = await (supabase
  .from('mix_bowls')
  .select('session_id, post_service_weight_g, is_manual_override')
  .in('session_id', sessionIds) as any);
```

Single line change in `src/hooks/backroom/useEvaluateComplianceLog.ts`. The data is already treated as `any` on line 66, so no downstream impact.

