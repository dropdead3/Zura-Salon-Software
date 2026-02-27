

## Add Visibility Management Instruction to Stylists Display Editor

The `StylistsDisplayEditor` in the Website Editor inspector needs a contextual help note explaining how to manage which stylists are visible on the homepage, with a direct link to the Homepage Stylists management tab.

### Change

**`src/components/dashboard/website-editor/StylistsDisplayEditor.tsx`**

Add a helper info block below the `SectionDisplayEditor` (or as a footer within `EditorCard`) that includes:
- A brief instruction: "To manage which stylists appear on the homepage (approve requests, hide/show individuals), visit the Homepage Stylists manager."
- A clickable link styled as a subtle button/link that navigates to `/dashboard/admin/website-sections?tab=stylists`
- Use `Link` from `react-router-dom` with an `ExternalLink` or `ArrowRight` icon

Since `SectionDisplayEditor` renders an `EditorCard` with only the fields, the cleanest approach is to wrap the `SectionDisplayEditor` in a fragment and add the info block after it, or add a `footer` slot. Given `SectionDisplayEditor` doesn't support a footer prop, the simplest path is:

1. Replace the single `<SectionDisplayEditor>` return with a fragment
2. Add a styled info/help block below it with the link
3. Import `Link` from `react-router-dom` and `Users`/`ArrowRight` from `lucide-react`

The info block will use a muted card style (`bg-muted/50 rounded-lg p-3`) with `text-xs text-muted-foreground` body text and a small link.

