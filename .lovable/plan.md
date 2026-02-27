

## Update "Owner" Badge Text to "Account Owner"

The table view in the Access Hub (`UserRolesTableView.tsx`) uses the abbreviated text `'Owner'` on line 165, while the card view (`UserRolesTab.tsx`) correctly says `'Account Owner'`.

### Change

**`src/components/access-hub/UserRolesTableView.tsx`** line 165:
- Change `{isPrimaryOwner ? 'Owner' : 'SA'}` → `{isPrimaryOwner ? 'Account Owner' : 'SA'}`

Single-line fix. No other files affected — the card view and invitations tab already use the full label.

