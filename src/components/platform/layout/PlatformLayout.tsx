import { Outlet } from 'react-router-dom';
import { PlatformSidebar } from './PlatformSidebar';
import { PlatformHeader } from './PlatformHeader';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { PlatformThemeProvider, usePlatformTheme } from '@/contexts/PlatformThemeContext';
import { PlatformPresenceProvider } from '@/contexts/PlatformPresenceContext';

const SIDEBAR_COLLAPSED_KEY = 'platform-sidebar-collapsed';

function PlatformLayoutInner() {
  const { resolvedTheme } = usePlatformTheme();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // Listen for storage changes to sync sidebar state
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved) {
        setCollapsed(JSON.parse(saved));
      }
    };

    // Check periodically for changes (since storage event doesn't fire in same tab)
    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={cn(
        'platform-theme min-h-screen bg-[hsl(var(--platform-bg))]',
        resolvedTheme === 'dark' ? 'platform-dark' : 'platform-light',
      )}
    >
      <PlatformSidebar />
      
      {/* Main Content Area */}
      <div
        className={cn(
          'min-h-screen transition-all duration-300 flex flex-col',
          collapsed ? 'ml-16' : 'ml-56'
        )}
      >
        <PlatformHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PlatformLayout() {
  return (
    <PlatformThemeProvider>
      <PlatformPresenceProvider>
        <PlatformLayoutInner />
      </PlatformPresenceProvider>
    </PlatformThemeProvider>
  );
}
