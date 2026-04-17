
## Prompt review

Solid consolidation instinct — both tabs serve the same operator mental model ("what's happening with this client's color?"), so collapsing them into one branded surface reduces tab count from 6 → 5, eliminates the overflow risk entirely, and reinforces the "Zura Color Bar" as a single product surface inside the appointment context.

Tighter framing for next time: clarify (a) *which* sub-tab opens by default, (b) whether the inner navigation should be horizontal sub-tabs vs. vertical sections, and (c) what the unified label should be — you said "Zura Color Bar" but in cramped UI we may want just "Color Bar" with the Beaker icon for compactness. I'll propose defaults with rationale below — flag if you want differently.

## Findings

Two tabs in `AppointmentDetailSheet.tsx` (lines 1424-1428):
- **`formulas`** → renders `<ClientFormulaHistoryTab>` (versioned formula history per client)
- **`color-bar`** → renders `<ColorBarTab>` (the active mix session / chemical usage for *this appointment*)

Both are color-bar-domain. Currently they're peers, which forces operators to context-switch between "what did we mix today" and "what have we mixed historically."

## Proposed change

**Single tab: `Color Bar`** (with `Beaker` icon, matches Color Bar brand)
- Default sub-view: **Today's Mix** (the active `ColorBarTab` — operationally most relevant during/after appointment)
- Secondary sub-view: **Formula History** (the `ClientFormulaHistoryTab` — reference layer)

**Inner navigation: `SubTabsList` / `SubTabsTrigger`** (underline style, already in `tabs.tsx`)
- Calmer than nesting full TabsList inside TabsList
- Matches existing patterns elsewhere in the platform per the canon

Net result: tabs go from 6 → 5 (Details, History, Photos, Notes, **Color Bar**), Beaker icon now signals the unified Color Bar surface, no more horizontal scroll pressure.

## Plan

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

1. **TabsList (lines 1420-1428)** — replace the two triggers with one:
   ```tsx
   <TabsTrigger value="color-bar" className="font-sans gap-1.5">
     <Beaker className="w-3.5 h-3.5" />
     Color Bar
   </TabsTrigger>
   ```
   Remove the `formulas` trigger entirely.

2. **TabsContent (lines 2173-2184)** — collapse the two `TabsContent` blocks into one `value="color-bar"` block containing a nested `<Tabs>` with `SubTabsList`:
   ```tsx
   <TabsContent value="color-bar" className="p-6 pt-4 mt-0">
     <Tabs defaultValue="today" className="w-full">
       <SubTabsList>
         <SubTabsTrigger value="today">Today's Mix</SubTabsTrigger>
         <SubTabsTrigger value="history">Formula History</SubTabsTrigger>
       </SubTabsList>
       <TabsContent value="today" className="mt-4">
         <ColorBarTab appointment={appointment} organizationId={effectiveOrganization?.id ?? ''} />
       </TabsContent>
       <TabsContent value="history" className="mt-4">
         <ClientFormulaHistoryTab clientId={appointment.phorest_client_id} />
       </TabsContent>
     </Tabs>
   </TabsContent>
   ```

3. **Imports** — add `SubTabsList`, `SubTabsTrigger` to the existing `@/components/ui/tabs` import. `Beaker` is already imported.

4. **State migration** — if `activeTab` is ever set to `"formulas"` programmatically anywhere (deep-links, external triggers), redirect to `"color-bar"`. Quick search needed; if found, map old value → new value in the `setActiveTab` setter or in a `useEffect`.

5. **No DB / RLS / API changes** — purely UI consolidation.

## Acceptance checks

1. Tab bar shows 5 tabs: Details, History, Photos, Notes, Color Bar (with Beaker icon). No "Formulas" tab.
2. Clicking "Color Bar" opens the unified surface with two sub-tabs: "Today's Mix" (default, active) and "Formula History".
3. "Today's Mix" sub-tab renders the existing `ColorBarTab` content unchanged (active mix session, chemical usage for this appointment).
4. "Formula History" sub-tab renders the existing `ClientFormulaHistoryTab` content unchanged (versioned formula list).
5. Sub-tab styling uses underline `SubTabsList` (calm, secondary), not the raised pill `TabsList` (avoids tabs-inside-tabs visual clutter).
6. No horizontal scroll on the parent tab strip at 520px panel width — confirmed since we're removing a tab.
7. If any deep-link or external code sets `activeTab="formulas"`, it gracefully resolves to `activeTab="color-bar"` (or the formula history sub-tab).
8. Mobile layout: parent tabs and sub-tabs both render cleanly in the full-screen panel branch.
9. No regression to other tabs (Details, History, Photos, Notes) or to the inner `ColorBarTab` / `ClientFormulaHistoryTab` components themselves.

**Files to modify:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (merge two tabs into one with nested sub-tabs; add `SubTabsList`/`SubTabsTrigger` imports; optional `activeTab` legacy mapping)
