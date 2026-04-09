import { useState, useRef, useCallback, useEffect } from 'react';
import type { RankedResult } from '@/lib/searchRanker';

const HOVER_DELAY = 120;

export function useCommandPreview(query: string) {
  const [activePreview, setActivePreview] = useState<RankedResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Clear preview on query change
  useEffect(() => {
    setActivePreview(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [query]);

  const handleHover = useCallback((result: RankedResult) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActivePreview(result);
    }, HOVER_DELAY);
  }, []);

  const handleHoverImmediate = useCallback((result: RankedResult) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActivePreview(result);
  }, []);

  const clearPreview = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActivePreview(null);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { activePreview, handleHover, handleHoverImmediate, clearPreview };
}
