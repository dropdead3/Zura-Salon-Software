

# Wire Social Links from Business Settings + Per-Location Support

## Current State
- Social links live in `site_settings` (key `website_social_links`), org-scoped only
- `business_settings` has a `website` field but no social URL columns
- `locations` table has no social fields
- The receipt editor reads socials from `useWebsiteSocialLinksSettings()` and shows "No social links configured. Add them in Website Settings." when empty
- The receipt print view and email also pull from `website_social_links`

## Architecture Decision
Social links are **organization-level** data (like phone, address, website) — they belong on `business_settings`, not buried in `site_settings`. Multi-location orgs need per-location overrides via a JSONB column on `locations`.

## Plan

### 1. Database Migration
Add social URL columns to `business_settings`:
```sql
ALTER TABLE business_settings
  ADD COLUMN instagram_url text,
  ADD COLUMN facebook_url text,
  ADD COLUMN tiktok_url text,
  ADD COLUMN twitter_url text,
  ADD COLUMN youtube_url text,
  ADD COLUMN linkedin_url text;
```

Add a JSONB `social_links` column to `locations` for per-location overrides:
```sql
ALTER TABLE locations
  ADD COLUMN social_links jsonb DEFAULT null;
-- Format: { instagram: "...", facebook: "...", tiktok: "...", ... }
-- null = inherit from business_settings
```

### 2. Update `useBusinessSettings` hook
- Add the 6 new social URL fields to the `BusinessSettings` interface
- No query changes needed (already uses `select('*')`)

### 3. Add social URL inputs to `BusinessSettingsContent.tsx`
- Add a "Social Links" section (below the existing website field) with inputs for Instagram, Facebook, TikTok, X/Twitter, YouTube, LinkedIn
- Wire into existing form state and save flow

### 4. Add per-location social overrides to location editor
- In whichever component edits individual locations, add an expandable "Social Links (Override)" section
- When populated, these override the org-level defaults for that location
- When blank/null, inherit from `business_settings`

### 5. Create `useSocialLinks` resolver hook
New hook: `src/hooks/useSocialLinks.ts`
- Accepts optional `locationId`
- Reads org-level socials from `useBusinessSettings()`
- If `locationId` provided, reads location's `social_links` JSONB and merges (location wins)
- Returns a normalized `{ instagram, facebook, tiktok, twitter, youtube, linkedin }` object
- This replaces all current `useWebsiteSocialLinksSettings()` usage for receipts

### 6. Update receipt consumers
**`ZuraPayReceiptsTab.tsx`**: Replace `useWebsiteSocialLinksSettings()` with `useSocialLinks()`. Update the "No social links" warning to say "Add them in Business Settings."

**`GroupedTransactionTable.tsx`** and **`TransactionDetailSheet.tsx`**: Replace `useWebsiteSocialLinksSettings()` with `useSocialLinks()`. Pass resolved socials to `printReceipt` / email.

**`ReceiptPrintView.tsx`**: No changes needed — already receives socials as a parameter.

### 7. Migrate existing `website_social_links` data (optional, recommended)
- Add a one-time migration that copies any non-empty values from `site_settings` (key `website_social_links`) into the new `business_settings` columns, so existing data is preserved.

### 8. Keep `website_social_links` in `site_settings` for now
The website footer editor (`FooterEditor.tsx`, `ShopLayout.tsx`) still reads from `site_settings`. We can update those consumers in a follow-up to also use the new resolver, but it's not blocking.

## Files

| File | Action |
|------|--------|
| Migration SQL | New — add columns to `business_settings` + `locations` |
| `src/hooks/useBusinessSettings.ts` | Update interface with 6 social fields |
| `src/hooks/useSocialLinks.ts` | New — resolver hook with location override |
| `src/components/dashboard/settings/BusinessSettingsContent.tsx` | Add social URL inputs section |
| `src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx` | Switch to `useSocialLinks()` |
| `src/components/dashboard/transactions/GroupedTransactionTable.tsx` | Switch to `useSocialLinks()` |
| `src/components/dashboard/transactions/TransactionDetailSheet.tsx` | Switch to `useSocialLinks()` |
| Location editor component | Add optional social override fields |

