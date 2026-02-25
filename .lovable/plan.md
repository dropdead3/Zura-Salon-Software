

## Remove Existing Test Accounts

Six test accounts currently exist in the system. The `generate-test-accounts` edge function and `isTestAccount` utility will be preserved so you can regenerate test accounts in the future.

### Accounts to Remove

| Name | Email | Role | User ID |
|------|-------|------|---------|
| Admin Assistant Test Account | admin-assistant-test@test.com | admin_assistant | e3d18a69... |
| Manager Test Account | manager-test@test.com | manager | 2a0e6cb6... |
| Operations Assistant Test Account | operations-assistant-test@test.com | operations_assistant | edadc352... |
| Receptionist Test Account | receptionist-test@test.com | receptionist | 2a6a80e3... |
| Stylist Assistant Test Account | stylist-assistant-test@test.com | stylist_assistant | 81331092... |
| Stylist Test Account | stylist-test@test.com | stylist | 58014e44... |

### What Will Be Executed

1. **Delete from `user_roles`** -- remove role assignments for all 6 user IDs
2. **Delete from `employee_profiles`** -- remove profile records (cascading from auth should handle related data, but we clean profiles explicitly)
3. **Delete auth users** -- requires an edge function call (`supabase.auth.admin.deleteUser`) since auth users cannot be deleted via SQL

### Technical Details

- A new edge function `delete-test-accounts` will be created (or the existing `generate-test-accounts` function will be extended with a `DELETE` action) to handle auth user deletion via the Admin API
- The function will: find all profiles matching the test account pattern, delete their `user_roles` entries, delete their `employee_profiles` entries, and delete the `auth.users` records
- Super admin authorization check will be enforced, same as the generate function
- The `generate-test-accounts` edge function and `isTestAccount` utility remain intact for future use

### What Stays Unchanged

- `supabase/functions/generate-test-accounts/index.ts` -- kept for future use
- `src/utils/testAccounts.ts` -- kept for test account filtering logic
- Test account filtering in `useTeamDirectory` -- kept to handle future test accounts

