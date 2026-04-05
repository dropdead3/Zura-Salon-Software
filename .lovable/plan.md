

# Fix: Prevent Language Switching in Demo Assistant

## Problem

The demo assistant AI occasionally outputs Spanish words mixed into English responses (e.g., "ahora" instead of "now"). This is a known LLM behavior — the `google/gemini-3-flash-preview` model sometimes code-switches languages when no explicit language constraint is set.

## Root Cause

The system prompt in `supabase/functions/demo-assistant/index.ts` (line 78) does not include an explicit English-only instruction.

## Fix

Add a single line to the `SYSTEM_PROMPT` in the guardrails section:

```
- Always respond in English only. Never use words or phrases from other languages.
```

This goes into the `IMPORTANT GUARDRAILS` block alongside the existing instructions about staying on-topic and not revealing system prompts.

## File Changes

| File | Action |
|------|--------|
| `supabase/functions/demo-assistant/index.ts` | **Modify** — add English-only guardrail to system prompt (line ~84) |

**1 file modified.**

