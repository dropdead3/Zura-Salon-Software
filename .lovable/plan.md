

## Problem

The outer wrapper `div` (line 100 for editor, line 127 for public site) has no background color. The scrolling content container has `rounded-b-[2rem]` with `bg-background` (white). As it slides over the fixed `bg-secondary` (gray) footer, the rounded corners expose the wrapper's transparent/white background — creating visible white corner artifacts above the footer.

## Fix

Set the outer wrapper's background to match the footer's background (`bg-secondary`) in both layout branches. This way, the rounded corners of the white content container blend seamlessly into the gray footer area.

### 1. Editor preview branch (line 100)
Change:
```
className="min-h-screen flex flex-col relative theme-cream"
```
To:
```
className="min-h-screen flex flex-col relative theme-cream bg-secondary"
```

### 2. Public site branch (line 127)
Same change — add `bg-secondary` to the outer wrapper.

No other files need to change. Two single-line edits in `Layout.tsx`.

