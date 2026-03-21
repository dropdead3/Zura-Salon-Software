import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  Search,
  Sun,
  Moon,
} from 'lucide-react';
import { useCommandMenu } from '@/hooks/useCommandMenu';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';

type CommandLink = {
  label: string;
  href: string;
  icon?: React.ElementType;
  keywords?: string[];
};

const NAVIGATION: CommandLink[] = [
  { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard, keywords: ['home'] },
  { label: 'Schedule', href: '/dashboard/schedule', icon: CalendarDays, keywords: ['calendar'] },
  { label: 'Team Directory', href: '/dashboard/directory', icon: Users, keywords: ['team', 'staff'] },
  { label: 'Analytics Hub', href: '/dashboard/admin/analytics', icon: BarChart3, keywords: ['reports'] },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings, keywords: ['admin'] },
  { label: 'Clients', href: '/dashboard/clients', icon: Search, keywords: ['client', 'directory'] },
];

export function CommandMenu() {
  const navigate = useNavigate();
  const { open, setOpen } = useCommandMenu();
  const { theme, setTheme } = useDashboardTheme();

  const run = React.useCallback(
    (href: string) => {
      setOpen(false);
      navigate(href);
    },
    [navigate, setOpen]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={[item.label, ...(item.keywords ?? [])].join(' ')}
                onSelect={() => run(item.href)}
              >
                {Icon && <Icon className="mr-2 h-4 w-4 opacity-70" />}
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4 opacity-70" />
            <span>Light</span>
            {theme === 'light' && <CommandShortcut>Active</CommandShortcut>}
          </CommandItem>
          <CommandItem onSelect={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4 opacity-70" />
            <span>Dark</span>
            {theme === 'dark' && <CommandShortcut>Active</CommandShortcut>}
          </CommandItem>
        </CommandGroup>

        <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span className="mr-2">Open:</span>
          <kbd className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono">⌘</kbd>
          <span className="mx-1">+</span>
          <kbd className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono">K</kbd>
          <span className="mx-2">·</span>
          <span className="mr-2">Close:</span>
          <kbd className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>
      </CommandList>
    </CommandDialog>
  );
}

