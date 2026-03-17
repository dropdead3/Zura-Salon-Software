

# Fix "B" Tone Code — Brown, Not Blue

## Problem
In `swatchSuggest.ts`, the tone code `B` is mapped to `'blue'` (line 39), but in professional hair color, "B" typically means **Brown**. This causes products like "4B Brown Beige" to get blue swatches instead of natural brown tones.

Similarly, `BG` (Brown Gold) is mapped to `blue` but should be `gold`.

## Changes — `src/lib/swatchSuggest.ts`

Update three entries in `TONE_CODE_MAP`:

| Code | Current | New | Reason |
|------|---------|-----|--------|
| `B` | `blue` | `natural` | B = Brown; `natural` family already contains brown tones (line 124) |
| `BB` | `blue` | `natural` | BB = Brown Brown (intense brown) |
| `BG` | `blue` | `gold` | BG = Brown Gold / Beige Gold (warm sandy) |

`BV` stays as `violet` (Blue-Violet / Brown-Violet — violet is the dominant tone either way).

Three line edits in one file.

