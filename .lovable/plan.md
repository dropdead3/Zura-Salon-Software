

## AI Content Writer for Website Editor

### Approach
Add a reusable "AI Write" button (sparkle icon) beside text fields in section editors. When clicked, it opens a compact popover where the user can describe their salon's vibe/audience, pick a tone, and generate copy via an edge function. The generated text fills the field directly.

### Changes

**1. New edge function: `supabase/functions/ai-content-writer/index.ts`**
- Accepts: `{ fieldType, context, tone, salonName, currentValue }`
  - `fieldType`: one of `hero_headline`, `hero_subheadline`, `brand_statement`, `service_description`, `cta_button`, `eyebrow`, `faq_answer`, `rotating_words`, `meta_description`
  - `context`: free-text describing the salon (e.g. "luxury color studio in Austin, TX targeting 25-45 professionals")
  - `tone`: `luxe` | `warm` | `edgy` | `minimal` | `playful`
  - `currentValue`: existing text (for "improve" mode)
- System prompt: salon copywriting specialist, outputs short-form copy matching the field type constraints (character limits, sentence counts)
- Uses tool calling to return structured output: `{ suggestion: string, alternatives: string[] }` (primary + 2 alternatives)
- Returns 3 options so the user can pick or regenerate

**2. New component: `src/components/dashboard/website-editor/inputs/AiWriteButton.tsx`**
- Small sparkle icon button that sits inline next to any text field label
- On click, opens a Popover with:
  - Salon context textarea (persisted in localStorage so user only enters once)
  - Tone selector (5 pill buttons)
  - "Generate" button → calls edge function → shows 3 suggestions as selectable cards
  - "Use" button applies the selected suggestion to the parent field via `onAccept(text)` callback
- Loading state with shimmer skeleton while generating
- Props: `fieldType`, `onAccept: (value: string) => void`, `currentValue?: string`, `maxLength?: number`

**3. Update `CharCountInput` to accept optional `aiFieldType` prop**
- When `aiFieldType` is provided, render `AiWriteButton` inline next to the label
- On accept, calls `onChange` with the AI-generated value

**4. Wire AI Write into section editors**
- `HeroEditor.tsx`: Add `aiFieldType` to headline, eyebrow, subheadline fields
- `BrandStatementEditor.tsx`: Add to eyebrow, headline prefix/suffix, paragraphs
- `NewClientEditor.tsx`: Add to headline, description, CTA text
- `ServicesPreviewEditor.tsx`: Add where applicable
- `FAQEditor.tsx`: Add to FAQ answers

**5. Register edge function in `supabase/config.toml`**

### Component Integration Example
```tsx
<CharCountInput
  label="Headline Text"
  value={localConfig.headline_text}
  onChange={(value) => updateField('headline_text', value)}
  maxLength={30}
  aiFieldType="hero_headline"  // ← enables the sparkle button
/>
```

### AI Prompt Strategy
The system prompt is field-type-aware:
- `hero_headline`: "Generate a 3-5 word salon headline. Confident, not clever."
- `brand_statement`: "Write a 1-2 sentence salon brand statement (50-150 chars)."
- `rotating_words`: Returns a JSON array of 4-6 words
- `meta_description`: "Write a 150-160 char meta description for local SEO."
- `cta_button`: "Generate a 2-4 word CTA button label."

Each prompt includes the salon context and tone preference for personalization.

### Files
- `supabase/functions/ai-content-writer/index.ts` (new)
- `src/components/dashboard/website-editor/inputs/AiWriteButton.tsx` (new)
- `src/components/dashboard/website-editor/inputs/CharCountInput.tsx` (modify — add optional AI button)
- `src/components/dashboard/website-editor/HeroEditor.tsx` (modify — add aiFieldType props)
- `src/components/dashboard/website-editor/BrandStatementEditor.tsx` (modify — add aiFieldType props)
- `src/components/dashboard/website-editor/NewClientEditor.tsx` (modify — add aiFieldType props)
- `supabase/config.toml` (register function)

