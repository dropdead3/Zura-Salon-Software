import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  BarChart3,
  User,
  LayoutGrid,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const baseNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/dashboard/team-chat', label: 'Chat', icon: MessageSquare },
];

const statsItem: NavItem = { href: '/dashboard/stats', label: 'Stats', icon: BarChart3 };
const manageItem: NavItem = { href: '/dashboard/admin/team-hub', label: 'Manage', icon: LayoutGrid };
const profileItem: NavItem = { href: '/dashboard/profile', label: 'Profile', icon: User };

interface MobileBottomNavProps {
  className?: string;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const isAdmin = hasPermission('view_team_overview');

  const navItems: NavItem[] = [
    ...baseNavItems,
    isAdmin ? manageItem : statsItem,
    profileItem,
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50',
      'bg-background/95 backdrop-blur-sm border-t',
      'safe-area-inset-bottom',
      className
    )}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors',
                'min-w-[60px]',
                active 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 transition-transform',
                active && 'scale-110'
              )} />
              <span className={cn(
                'text-[10px] font-medium',
                active && 'font-medium'
              )}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
