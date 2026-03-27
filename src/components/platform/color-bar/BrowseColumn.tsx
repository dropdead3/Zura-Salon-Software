/**
 * Platform-themed BrowseColumn.
 * Uses --platform-* CSS variables and violet accents for the premium dark theme.
 *
 * Organization pages must NOT import this — use OrgBrowseColumn instead.
 */
import { BrowseColumnBase, type BrowseColumnTheme, type BrowseColumnItem } from '@/components/shared/BrowseColumnBase';

const PLATFORM_THEME: BrowseColumnTheme = {
  container:
    'flex flex-col border-r border-[hsl(var(--platform-border)/0.3)] bg-[hsl(var(--platform-bg-card)/0.3)]',
  header:
    'sticky top-0 z-10 px-3 pt-3 pb-2 bg-[hsl(var(--platform-bg-card)/0.6)] backdrop-blur-sm border-b border-[hsl(var(--platform-border)/0.2)]',
  headerLabel:
    'font-display text-[10px] tracking-wider text-[hsl(var(--platform-foreground-muted))] uppercase',
  searchIcon:
    'text-[hsl(var(--platform-foreground-muted)/0.5)]',
  searchInput:
    'border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:border-violet-500/50',
  emptyText:
    'text-[hsl(var(--platform-foreground-muted))]',
  itemActive:
    'bg-violet-500/10 border-violet-500 text-[hsl(var(--platform-foreground))]',
  itemInactive:
    'hover:bg-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] border-transparent',
  countActive:
    'text-violet-400',
  countInactive:
    'text-[hsl(var(--platform-foreground-muted)/0.6)]',
};

export type { BrowseColumnItem };

interface PlatformBrowseColumnProps {
  title: string;
  items: BrowseColumnItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  searchThreshold?: number;
  className?: string;
  focusActive?: boolean;
  onKeyNav?: (direction: 'up' | 'down' | 'left' | 'right' | 'escape') => void;
}

export function BrowseColumn(props: PlatformBrowseColumnProps) {
  return <BrowseColumnBase {...props} theme={PLATFORM_THEME} />;
}
