import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function useCommandMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Suppress CommandMenu on dashboard routes — TopBarSearch owns Cmd+K there
  const isDashboard = location.pathname.includes('/dashboard');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isDashboard) return;

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
      setOpen((v) => !v);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDashboard]);

  return { open, setOpen };
}
