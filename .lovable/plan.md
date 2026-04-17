

## Prompt review

Sharp instinct — "No transformations yet" frames the empty state as if photos *should* exist post-service, but the Photos tab actually holds two distinct categories: (1) inspiration photos the client uploaded at booking time, and (2) consultation/transformation photos the stylist takes during/after the appointment. The current copy collapses both into one. Sharper next time: name the two photo types you want surfaced (inspiration vs consultation vs transformation) so I don't have to infer from your example. You implied it with "inspiration or consultation" — clear enough.

## Diagnosis

Need to read the current Photos tab empty state in `AppointmentDetailSheet.tsx` and `InspirationPhotosSection.tsx` to see how the two photo sources are composed and where the "No transformations yet" copy lives.

Photo categories on this tab:
1. **Inspiration photos** — uploaded by client during booking inquiry (private `inquiry-inspiration` bucket, surfaced via `useClientInspirationPhotos`)
2. **Transformation/consultation photos** — taken by stylist (the `TransformationTimeline` component with the "Add First Transformation" CTA shown in the screenshot)

The screenshot shows only the transformation empty state. The inspiration section likely renders separately above it (or is also empty and silently hidden). Need to verify rendering order and whether inspiration has its own empty state.
<lov-tool-use id="toolu_vrtx_01Ni4Ku3Kk8xPKqFni7r8kbu" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/schedule/AppointmentDetailSheet.tsx\", \"lines\": \"2430-2490\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01U79MsPvdxFRyUJTNbTCneu" name="code--search_files" integration-id="code" data="{\"query\": \"No transformations yet|Add First Transformation|InspirationPhotosSection\", \"include_patterns\": \"src/**/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0128Xh4D5NkbLVwmEV59qxUr" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/schedule/AppointmentDetailSheet.tsx\", \"lines\": \"2430-2500\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01UHPmoyPpvkCVoCf16fxgj4" name="code--search_files" integration-id="code" data="{\"query\": \"No transformations yet|Add First Transformation\", \"include_patterns\": \"src/**/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Ek6WuqEoN2aTVK6yhQw3iP" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/clients/TransformationTimeline.tsx\", \"lines\": \"1-130\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01BGePUdWtRGmVDVr19ymV6Y" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/**/*.tsx\", \"query\": \"InspirationPhotosSection\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016xid8kWjghZAh44suUMo2w" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/clients/InspirationPhotosSection.tsx\"}">
</lov-tool-use>
Now I have full context. The screenshot shows the "No transformations yet" state from `TransformationTimeline` rendering — which only mentions "before and after photos." The user wants the empty copy to also acknowledge inspiration/consultation photos as a possible source. Since `InspirationPhotosSection` returns null when empty, the empty state on the Photos tab is currently only `TransformationTimeline`'s.

<lov-plan>

## Prompt review

Sharp instinct — the current empty copy ("Add before and after photos to build a visual history") is technically accurate for the TransformationTimeline component but ignores the *other* photo type that lives on this tab: inspiration photos from the booking inquiry. From the operator's perspective, "Photos" is the noun on the tab, not "Transformations" — so the empty state should speak the operator's language. Sharper next time: tell me whether you want the copy to (a) explicitly name both photo types, (b) genericize to "no photos yet," or (c) prioritize one as primary. I'll plan for **(a) — explicit, since naming both types educates stylists on what the tab actually surfaces**.

## Diagnosis

The screenshot empty state ("NO TRANSFORMATIONS YET / Add before and after photos…") is rendered by `TransformationTimeline.tsx` L99–110. `InspirationPhotosSection` silently returns null when empty (L23), so the tab shows only the transformation empty state.

Two choices for fix scope:
- **Narrow**: Edit `TransformationTimeline` empty copy to mention inspiration photos. Risk: that component is also used in other surfaces (client profile?), so the copy might get weird out of context.
- **Wide**: Lift the empty state up into the Photos tab itself (in `AppointmentDetailSheet.tsx`), gated on "both `photos.length === 0` AND `transformations.length === 0`." Cleaner separation but adds wiring (need to expose counts up).

Going **narrow** — the copy change is universally true (transformations build on consultation/inspiration context), and `TransformationTimeline` is the canonical "photos" empty state in client-facing surfaces. Touches one file.

## Plan — Wave 22.23: Photos empty-state copy unifies inspiration + transformation context

### Edit: `src/components/dashboard/clients/TransformationTimeline.tsx` L99–110

Update heading and description to acknowledge that the Photos tab spans inspiration photos (from booking), consultation photos, and transformation before/afters. Keep the CTA action language ("Add First Transformation") since that's still what the button does.

```tsx
<div className={tokens.empty.container}>
  <Camera className={tokens.empty.icon} />
  <h3 className={tokens.empty.heading}>No photos yet</h3>
  <p className={tokens.empty.description}>
    No inspiration, consultation, or transformation photos have been added yet. Build a visual history of this client's hair journey by capturing before-and-after shots.
  </p>
  <Button onClick={() => setShowAddForm(true)} className="mt-4 gap-2">
    <Plus className="w-4 h-4" />
    Add First Transformation
  </Button>
</div>
```

### Acceptance checks

1. Eric Day's Photos tab shows "NO PHOTOS YET" instead of "NO TRANSFORMATIONS YET"
2. Description names all three photo sources (inspiration, consultation, transformation) so stylists understand the tab's full scope
3. CTA button language unchanged (still "Add First Transformation" — that's the action it performs)
4. When inspiration photos exist for a client, they render above this empty state (existing behavior preserved — `InspirationPhotosSection` still returns null when truly empty, renders when present)
5. No regressions on other surfaces using `TransformationTimeline` — copy is generic enough to apply anywhere

### Files

- `src/components/dashboard/clients/TransformationTimeline.tsx` — single block edit at L99–110

### Open question

None — going with explicit naming of all three photo types. Tell me if you want the heading to stay "No transformations yet" with only the description expanded.

### Deferred

- **P3** Add a "Add Consultation Photo" CTA distinct from "Add First Transformation" if/when consultation photos become a first-class capture flow (currently they live in the booking inquiry pipeline, not stylist-side). Trigger: when stylists ask to attach mid-appointment reference shots not tied to before/after pairs.
- **P3** Consider lifting the empty state up into the Photos tab in `AppointmentDetailSheet.tsx` if more photo sources get added (e.g., portfolio uploads, social tags). Trigger: when a third+ photo source lands on this tab.

