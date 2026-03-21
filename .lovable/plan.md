

## Update "Move to Another Location" Button Text

**File:** `src/components/dock/settings/DockSettingsTab.tsx`

**Changes:**

1. **Import `useOrganization`** from `@/hooks/useOrganizations` to fetch the org name using `staff.organizationId`.

2. **Add org query** inside the component: `const { data: org } = useOrganization(staff.organizationId);`

3. **Update button text** (line 143): Change from `Move to Another Location` to `Move Zura Dock to Another {orgName} Location`, where `orgName` falls back to `'Organization'` if the query hasn't loaded.

Three small edits in one file.

