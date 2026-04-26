import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useHideNumbers } from '@/contexts/HideNumbersContext';

type ShortcutHandler = () => void;

interface ShortcutConfig {
  key: string;
  description: string;
  category: string;
  handler: ShortcutHandler;
}

const SEQUENCE_TIMEOUT = 1000; // 1 second to complete sequence

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { toggleHideNumbers } = useHideNumbers();
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const shortcuts: ShortcutConfig[] = [
    // Navigation shortcuts (g + key)
    {
      key: 'g h',
      description: 'Go to Home/Dashboard',
      category: 'Navigation',
      handler: () => navigate(dashPath('/')),
    },
    {
      key: 'g s',
      description: 'Go to Schedule',
      category: 'Navigation',
      handler: () => navigate(dashPath('/schedule')),
    },
    {
      key: 'g c',
      description: 'Go to Team Chat',
      category: 'Navigation',
      handler: () => navigate(dashPath('/team-chat')),
    },
    {
      key: 'g a',
      description: 'Go to Analytics',
      category: 'Navigation',
      handler: () => navigate(dashPath('/analytics')),
    },
    {
      key: 'g t',
      description: 'Go to Team',
      category: 'Navigation',
      handler: () => navigate(dashPath('/team')),
    },
    {
      key: 'g p',
      description: 'Go to Profile',
      category: 'Navigation',
      handler: () => navigate(dashPath('/profile')),
    },
    // Privacy
    {
      key: 'h',
      description: 'Hide / show monetary values',
      category: 'Privacy',
      handler: () => toggleHideNumbers(),
    },
    // Help
    {
      key: '?',
      description: 'Show keyboard shortcuts help',
      category: 'Help',
      handler: () => setIsHelpOpen(true),
    },
  ];

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't capture shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      // Handle Escape to close help
      if (event.key === 'Escape' && isHelpOpen) {
        setIsHelpOpen(false);
        return;
      }

      const key = event.key.toLowerCase();
      
      // Clear timeout and add key to sequence
      if (timeoutId) clearTimeout(timeoutId);
      
      const newSequence = [...keySequence, key];
      setKeySequence(newSequence);

      // Check for matching shortcuts
      const sequenceString = newSequence.join(' ');
      const matchingShortcut = shortcuts.find(s => s.key === sequenceString);

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.handler();
        setKeySequence([]);
        return;
      }

      // Check if any shortcut starts with this sequence
      const hasPrefix = shortcuts.some(s => s.key.startsWith(sequenceString));
      
      if (!hasPrefix) {
        // No match possible, reset
        setKeySequence([]);
      } else {
        // Wait for next key
        timeoutId = setTimeout(() => {
          setKeySequence([]);
        }, SEQUENCE_TIMEOUT);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [keySequence, shortcuts, navigate, isHelpOpen]);

  return {
    shortcuts,
    isHelpOpen,
    closeHelp,
    currentSequence: keySequence.join(' '),
  };
}

// Get shortcuts grouped by category
export function getShortcutsByCategory(shortcuts: ShortcutConfig[]) {
  return shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);
}
