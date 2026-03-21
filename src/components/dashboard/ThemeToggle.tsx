import { Moon, Sun } from 'lucide-react';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useDashboardTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark'}
      className={cn(
        "relative flex items-center h-9 w-[60px] rounded-full p-1 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDark
          ? "bg-[hsl(0,0%,8%)] border border-border/50 shadow-[inset_0_1px_3px_hsl(0,0%,0%/0.4)]"
          : "bg-accent/50 border border-border/40 shadow-[inset_0_1px_2px_hsl(0,0%,0%/0.06)]"
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon - visible in dark mode as unselected hint */}
      <Sun className={cn(
        "absolute left-2 w-3.5 h-3.5 transition-all duration-300",
        isDark ? "opacity-30 text-muted-foreground" : "opacity-0 scale-75"
      )} />

      {/* Moon icon - visible in light mode as unselected hint */}
      <Moon className={cn(
        "absolute right-2 w-3.5 h-3.5 transition-all duration-300",
        isDark ? "opacity-0 scale-75" : "opacity-30 text-muted-foreground"
      )} />

      {/* Sliding thumb */}
      <span
        className={cn(
          "flex items-center justify-center h-7 w-7 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark
            ? "translate-x-[24px] bg-foreground text-background shadow-[0_0_8px_hsl(var(--foreground)/0.3)]"
            : "translate-x-0 bg-background text-foreground shadow-md"
        )}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5" />
        ) : (
          <Sun className="w-3.5 h-3.5" />
        )}
      </span>
    </button>
  );
}
