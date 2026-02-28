

## Auto-Fix Buttons for Website Intelligence Findings

### Approach
Add an `autoFix` property to each finding that describes the fix action. The edge function returns fix metadata alongside findings. The Insights tab renders a "Fix" button next to fixable findings. Clicking it calls an `onAutoFix(finding)` handler in the Hub, which applies the change directly (toggling a section, enabling a page, generating SEO text via AI) and re-runs analysis.

### Changes

**1. Extend `Finding` type (`useWebsiteAnalysis.ts`)**
Add optional `autoFix` field:
```ts
interface AutoFix {
  type: 'enable_section' | 'enable_page' | 'generate_seo' | 'navigate_only';
  sectionType?: string;   // e.g. 'faq', 'testimonials'
  pageId?: string;        // e.g. 'about'
  field?: string;         // e.g. 'seo_title', 'seo_description'
}
```

**2. Update edge function (`ai-website-analysis/index.ts`)**
Add `autoFix` data to each fixable finding in `runRuleChecks`:
- Missing SEO title/description → `{ type: 'generate_seo', pageId, field }`
- Disabled FAQ/testimonials/new-client/gallery → `{ type: 'enable_section', sectionType }`
- Disabled About page → `{ type: 'enable_page', pageId: 'about' }`
- Findings that are already passing or purely informational → no autoFix

**3. Update `StructureInsightsTab.tsx`**
- Accept new `onAutoFix` prop
- Render a small "Fix" button (pill style, `tokens.button.inline`) next to each non-pass finding that has `autoFix`
- Show a loading spinner on the individual finding while fix is in progress
- After fix completes, auto-re-run analysis

**4. Update `WebsiteSectionsHub.tsx`**
- Add `handleAutoFix(finding)` handler that switches on `autoFix.type`:
  - `enable_section`: calls `handleHomeSectionToggle(sectionId, true)` for the matching section
  - `enable_page`: updates `pagesConfig` to set the page's `enabled: true` via `updatePages.mutateAsync`
  - `generate_seo`: calls the `ai-content-writer` edge function with `fieldType: 'meta_description'` or `'hero_headline'`, then patches the page config
- Pass `onAutoFix` to `StructureInsightsTab`
- After any auto-fix, call `handleRunAnalysis()` to refresh scores

**5. Deploy updated edge function**

### Files
- `src/hooks/useWebsiteAnalysis.ts` — add `AutoFix` type to `Finding`
- `supabase/functions/ai-website-analysis/index.ts` — add `autoFix` to findings
- `src/components/dashboard/website-editor/panels/StructureInsightsTab.tsx` — render Fix buttons
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` — implement `handleAutoFix`

