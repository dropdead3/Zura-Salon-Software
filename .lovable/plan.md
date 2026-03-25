

## Fix: Format Duration in Edit Services Footer

### Problem
The footer shows raw minutes (e.g., "120m") instead of human-readable format ("2h").

### Change — `src/components/dock/appointment/DockEditServicesSheet.tsx`

1. **Add import** at top: `import { formatMinutesToDuration } from '@/lib/formatDuration';`
2. **Footer**: Replace `{totalDuration}m` with `{formatMinutesToDuration(totalDuration)}`

One import + one line change. Converts "120m" → "2h", "135m" → "2h 15m", etc.

