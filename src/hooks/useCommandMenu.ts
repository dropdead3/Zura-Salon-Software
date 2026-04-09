import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export function useCommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as any).isContentEditable ||
          target.closest('[role="dialog"]'))
      ) {
        return;
      }

      const isK = e.key.toLowerCase() === 'k';
      const isCmdK = (e.metaKey || e.ctrlKey) && isK;
      if (!isCmdK) return;

      e.preventDefault();
      setOpen(v => !v);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { open, setOpen };
}
