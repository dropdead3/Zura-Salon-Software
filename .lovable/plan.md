

The user wants both enhancements: (1) render `<PageExplainer pageId="policies" />` on the Policy OS page, and (2) rename the Services Settings "Policies" tab to "Redo Eligibility" to remove semantic collision.

Let me locate the two target files.
<lov-tool-use id="toolu_vrtx_01JtMWxikrNXhHjhkUQyrk38" name="code--search_files" integration-id="code" data="{\"query\": \"RedoPolicySettings\", \"include_patterns\": \"*.tsx,*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01ASsp1YP4hc9VWgVZrAGTFh" name="code--search_files" integration-id="code" data="{\"query\": \"admin/policies\", \"include_patterns\": \"src/App.tsx,src/pages/**/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01EKa4aKYrxsnVkLsyWNzsam" name="code--search_files" integration-id="code" data="{\"query\": \"RedoPolicySettings\", \"include_patterns\": \"*.tsx,*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01KJxuBmvuLLj6KEr8m7To6n" name="code--search_files" integration-id="code" data="{\"query\": \"admin/policies\", \"include_patterns\": \"*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WBuvCvyYNS4R383RYRyKc1" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/dashboard/admin/Policies.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0198Bkiewzu9xFa8ZGcdrWkt" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/ServicesSettingsContent.tsx\", \"lines\": \"1270-1300\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JXTBSur2ujTXpzRGqHuNnQ" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/components/dashboard/settings/ServicesSettingsContent.tsx\", \"query\": \"value=\\\"policies\\\"|TabsTrigger|>Policies<|Redo Policy\"}">
</lov-tool-use>
I have enough context. Let me look at the Policies page header area to confirm placement target.
<lov-tool-use id="toolu_vrtx_01HvrVDHCPEs1TVHFGgGBzxQ" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/dashboard/admin/Policies.tsx\", \"lines\": \"76-130\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01RPj9YFEaEvtxydoKWBExZz" name="code--search_files" integration-id="code" data="{\"query\": \"'policies':\\\\s*\\\\{|policies:\\\\s*\\\\{\", \"include_patterns\": \"src/config/pageExplainers.ts\"}">
</lov-tool-use>
I have everything I need.

<lov-plan>

## Wave 28.10.3 — Policies Page Explainer + Redo Tab Rename

Two tiny, independent polish patches that close the loop on Wave 28.10.2.

### Changes

| # | Scope | File | Edit |
|---|---|---|---|
| 1 | Render the registered explainer at the top of the Policy OS page | `src/pages/dashboard/admin/Policies.tsx` | Import `PageExplainer` from `@/components/ui/PageExplainer`. Insert `<PageExplainer pageId="policies" />` as the first child of the `<div className="space-y-8">` block (line 96), above the setup banner. Pulls copy from the entry already registered in `pageExplainers.ts` ("Policy OS / Adopt and configure cancellation, no-show, redo…"). |
| 2 | Rename Services > Policies tab to disambiguate from Policy OS | `src/components/dashboard/settings/ServicesSettingsContent.tsx` | Line 595: change `<TabsTrigger value="policies">Policies</TabsTrigger>` → `<TabsTrigger value="policies">Redo Eligibility</TabsTrigger>`. Tab `value` and route param stay `"policies"` (no breaking URL change). Section comment on line 1292 updated to `TAB 4: REDO ELIGIBILITY`. |

### Rationale
- **Explainer**: PageExplainer is dismissible, lives in the registry, and matches the canonical pattern used across other dashboard pages. No new copy authored.
- **Tab rename**: Internally, `RedoPolicySettings` only governs redo pricing/approval/window/reasons — that's *eligibility*, not policy. Operators have started conflating it with Policy OS now that both surfaces are visible from Settings. Renaming the visible label (not the route key) resolves the semantic collision with zero data migration.

### Doctrine checks
- ✅ UI tokens unchanged; `PageExplainer` already wraps `Infotainer` with correct typography
- ✅ No copy hype, no font-bold, no new CSS
- ✅ URL key stable (`?tab=policies`) — no breakage for any existing link
- ✅ Single source of truth: explainer copy lives in `pageExplainers.ts`, not duplicated

### Out of scope
- Renaming the underlying `RedoPolicySettings` component, hook, or DB column — DB-level rename would be churn for no operator benefit
- Adding a "Looking for cancellation/no-show policies? → Policy OS" cross-link inside the Redo Eligibility tab — defer until users surface confusion
- Adding `<PageExplainer>` to the Policy Conflict Center page — separate small follow-up if desired

