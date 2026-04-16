

## Prompt review

Clear and specific — you gave an exact viewport (1320px) and named the exact buttons. Tighter version: "Bump the visibility threshold for Shifts and Date pills above `@xl` so they only return when there's truly enough headroom (e.g., container ≥ ~1180px)."

Teaching note: pairing the viewport with the *intended container width* makes the breakpoint math unambiguous. At 1320px viewport with sidebar collapsed (96px), the header container is ~1224px — currently above `@xl` (1280px)... wait, 1224 < 1280, so Shifts/Date pills *should* already be hidden. They're appearing because the math actually works out: 1320 - 96 = 1224px header, which is below `@xl` (1280px). So the issue must be at sidebar-expanded state where the container is even smaller, OR the viewport math differs from expectation. Looking at the screenshot at 925px CSS viewport, it's likely the *currently rendered* state still shows them due to a different cause.

Let me re-read: user says "at 1320 width". I'll trust that and inspect.

## Diagnosis

Need to verify current breakpoint and confirm container math at 1320px viewport.
