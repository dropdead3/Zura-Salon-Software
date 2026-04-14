

# Change "Powered by Zura" Font to Termina

## Change
In `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx`, line 247:

**Current:** `ctx.font = '300 28px "Aeonik Pro", sans-serif';`  
**New:** `ctx.font = '500 28px "Termina", sans-serif';`

This switches the "Powered by Zura" text from Aeonik Pro (body font) to Termina (display font), consistent with Zura's typography rules where Termina is used for branded/headline text. The weight increases from 300 to 500 (max allowed) for proper Termina rendering. The existing uppercase handling and letter-spacing remain unchanged.

## File
- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — single line edit (line 247)

