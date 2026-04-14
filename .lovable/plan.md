<final-text>Strong prompt: you focused on the actual behavior that matters (editable controls, saved state, real-time updates), which is exactly the right way to surface a bug like this. An even sharper version next time would be: “Audit the tipping tab end-to-end. Verify every input and toggle edits locally, persists to the backend, survives refresh, and reflects in the reader preview. Fix any failures and add test coverage.”

What I found
- The main issue is the shared settings save path, not just the tip inputs.
- Tip changes are currently sending save requests, but the backend is rejecting them with `42P10`.
- Root cause: `useUpdateSiteSetting` uses an `upsert` conflict target that does not match the current uniqueness setup of `site_settings`, so writes fail even though the UI can appear to update locally.
- That explains why earlier UI-only fixes did not fully solve it.
- The fixed threshold amount is also fragile because it saves on every keystroke instead of committing cleanly on blur/confirm.

Plan
1. Fix the shared settings mutation
   - Update `src/hooks/useSiteSettings.ts`.
   - Replace the failing `upsert(... onConflict: 'id,organization_id')` with the safer existing repo pattern: read existing row by `id + organization_id`, then `update` or `insert`.
   - Add optimistic query-cache updates plus rollback on error so the UI feels real-time without pretending a failed save succeeded.

2. Harden the tipping form behavior
   - Update `src/components/dashboard/settings/terminal/ZuraPayTippingTab.tsx`.
   - Keep percentage inputs as local text until blur/Enter, then sanitize and persist.
   - Give the threshold amount its own local input state and save on blur/Enter instead of every keystroke.
   - Make sure saves are built from the latest draft state, not a stale render snapshot.
   - Add visible save/error feedback so failed writes are obvious.

3. Verify adjacent terminal settings using the same shared hook
   - Spot-check the receipts tab after the shared fix, since it uses the same settings mutation path.
   - This keeps the terminal settings area consistent instead of fixing only one screen.

4. Add end-to-end coverage
   - Create a new Playwright test in `e2e/` for the tipping settings flow.
   - Cover:
     - editing all 3 tip percentages
     - toggling tipping on/off
     - toggling fixed threshold on/off
     - editing threshold amount
     - toggling retail inclusion
     - toggling saved-card prompting
     - refreshing the page and confirming values persist
     - opening the display preview/tab and confirming it reflects the saved config

5. Manual QA after implementation
   - Test each control once with successful saves.
   - Refresh and confirm persistence.
   - Switch tabs and return.
   - Confirm there is no false “saved” state if the backend rejects a write.

Technical details
- Files likely to change:
  - `src/hooks/useSiteSettings.ts`
  - `src/components/dashboard/settings/terminal/ZuraPayTippingTab.tsx`
  - one new `e2e/*.spec.ts` file
- No immediate database change should be required; this can be fixed safely in the shared mutation layer.
- This shared fix should also stabilize other org-scoped settings that rely on `useUpdateSiteSetting`.</final-text>