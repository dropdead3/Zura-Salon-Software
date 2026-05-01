/**
 * useFocalPointSuggestion — fire-and-forget helper for asking the AI to anchor
 * a focal point on a freshly uploaded hero image. Returns a `suggest(url)`
 * callback and a `pending` flag for showing a small "analyzing…" badge.
 *
 * Manual edits always win — callers use the suggested x/y only as a seed.
 * Failures (rate-limit, parse, no subject) are toasted softly and the focal
 * stays at whatever the operator already had.
 */
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuggestResult {
  x: number;
  y: number;
  reason: string;
}

export function useFocalPointSuggestion(
  onResult: (result: SuggestResult) => void,
) {
  const [pending, setPending] = useState(false);
  // Track the latest URL so a slower earlier response can't overwrite a newer
  // upload's focal point.
  const latestUrlRef = useRef<string | null>(null);

  const suggest = useCallback(async (imageUrl: string) => {
    if (!imageUrl) return;
    latestUrlRef.current = imageUrl;
    setPending(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-focal-point', {
        body: { imageUrl },
      });
      // Bail if a newer upload superseded this one mid-flight.
      if (latestUrlRef.current !== imageUrl) return;

      if (error) {
        const status = (error as { context?: { status?: number } })?.context?.status;
        if (status === 429) {
          toast.warning('AI is busy — focal point stayed at center. Drag to adjust.');
        } else if (status === 402) {
          toast.warning('AI credits exhausted — focal point stayed at center.');
        }
        // Silent on other errors; manual focal still works.
        return;
      }

      if (data && typeof data.x === 'number' && typeof data.y === 'number') {
        onResult({ x: data.x, y: data.y, reason: data.reason ?? '' });
      }
    } catch (err) {
      // Silent failure — keep operator unblocked.
      console.warn('[useFocalPointSuggestion] failed', err);
    } finally {
      if (latestUrlRef.current === imageUrl) setPending(false);
    }
  }, [onResult]);

  return { suggest, pending };
}
