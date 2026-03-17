/**
 * Organization-themed BrowseColumn.
 * Uses semantic design tokens (bg-card, text-muted-foreground, etc.)
 * so it follows whichever org theme is active.
 *
 * Platform pages must NOT import this — use the platform BrowseColumn instead.
 */
import { BrowseColumnBase, type BrowseColumnTheme, type BrowseColumnItem } from '@/components/shared/BrowseColumnBase';

const ORG_THEME: BrowseColumnTheme = {
  container:
    'flex flex-col border-r border-border/30 bg-card/30',
  header:
    'sticky top-0 z-10 px-3 pt-3 pb-2 bg-card/60 backdrop-blur-sm border-b border-border/20',
  headerLabel:
    'font-display text-[10px] tracking-wider text-muted-foreground uppercase',
  searchIcon:
    'text-muted-foreground/50',
  searchInput:
    'border-border/40 bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50',
  emptyText:
    'text-muted-foreground',
  itemActive:
    'bg-primary/10 border-primary text-foreground',
  itemInactive:
    'hover:bg-muted/50 text-muted-foreground border-transparent',
  countActive:
    'text-primary',
  countInactive:
    'text-muted-foreground/60',
};

interface OrgBrowseColumnProps {
  title: string;
  items: BrowseColumnItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  searchThreshold?: number;
  className?: string;
  focusActive?: boolean;
  onKeyNav?: (direction: 'up' | 'down' | 'left' | 'right' | 'escape') => void;
}

export type { BrowseColumnItem };

export function OrgBrowseColumn(props: OrgBrowseColumnProps) {
  return <BrowseColumnBase {...props} theme={ORG_THEME} />;
}
