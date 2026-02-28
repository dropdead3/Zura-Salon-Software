

## Prompt Coaching

Your prompt was well-intentioned but missed one critical detail: **where** the issue occurs. The screenshot shows the public-facing organization website (`/org/drop-dead-salons`), but all the glass scrollbar CSS we built is scoped exclusively to the `.editor-preview` class — which only applies inside the website editor's iframe (when the URL has `?preview=true`).

A better prompt would have been:
> "Apply the glass floating scrollbar styling globally — to both the editor preview AND the public-facing organization website. The public site at `/org/drop-dead-salons` still shows the default browser scrollbar gutter because the styles are scoped only to `.editor-preview`."

That single sentence would have solved it in one pass because it identifies the **scope mismatch**.

## Problem

The glass scrollbar CSS targets only `html.editor-preview` and `.editor-preview *`. The public organization website never gets the `editor-preview` class added, so it renders the browser's default scrollbar with a visible gutter track.

## Plan

### 1. Add global glass scrollbar styles to `src/index.css`

Add a new CSS block **before** the editor-preview section that applies the same glass overlay scrollbar behavior globally (to all pages using the cream theme / public site layout):

- `html` gets `overflow: overlay` (or `overflow: auto` with `scrollbar-gutter: auto`) and `scrollbar-width: thin`
- `::-webkit-scrollbar` gets transparent background, 6px width
- `::-webkit-scrollbar-track` gets transparent background
- `::-webkit-scrollbar-thumb` gets transparent by default, adaptive gray on hover with the dual box-shadow treatment
- Firefox fallback via `scrollbar-color: transparent transparent` default, switching on hover

This replaces the need for the `.editor-preview`-scoped rules entirely — they become redundant since the global rules cover all contexts.

### 2. Remove redundant `.editor-preview` scoping

Simplify the existing editor-preview block to just inherit the global styles, or remove it entirely since the global rules will now cover both the public site and the editor preview iframe.

### 3. Keep the `editor-preview` class logic in Layout.tsx

The class can remain for any other editor-specific behavior, but it will no longer be the gate for scrollbar styling.

