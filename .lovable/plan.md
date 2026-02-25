

## ✅ COMPLETED: Circle Avatar Composer + Website Card Composer (3-Step Wizard)

Implemented. The photo wizard now has 3 steps:
1. **Avatar Composer** — Circle frame for platform-wide circular avatar focal point
2. **Website Card Composer** — 3:4 frame for website card focal point  
3. **Final Review** — Side-by-side preview of both compositions

Database columns added: `card_focal_x`, `card_focal_y` on `employee_profiles`.

### Enhancement Suggestion
Apply avatar focal point (`photo_focal_x`/`photo_focal_y`) to circular avatars across the platform — sidebar, team directory, chat, kiosk — via `object-position` on the shared Avatar component.
