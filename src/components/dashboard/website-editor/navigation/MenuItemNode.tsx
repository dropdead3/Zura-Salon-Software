import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Link2, ExternalLink, ChevronDown, MousePointerClick, AlertTriangle, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MenuItem } from '@/hooks/useWebsiteMenus';
import type { WebsitePagesConfig } from '@/hooks/useWebsitePages';

const TYPE_ICONS: Record<string, React.ElementType> = {
  page_link: Link2,
  external_url: ExternalLink,
  anchor: Hash,
  dropdown_parent: ChevronDown,
  cta: MousePointerClick,
};

interface MenuItemNodeProps {
  item: MenuItem;
  depth: number;
  isSelected: boolean;
  selectedItemId: string | null;
  onSelect: (id: string | null) => void;
  pagesConfig: WebsitePagesConfig | null | undefined;
}

export function MenuItemNode({ item, depth, isSelected, selectedItemId, onSelect, pagesConfig }: MenuItemNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = TYPE_ICONS[item.item_type] ?? Link2;

  // Check for broken link
  const isBroken = item.item_type === 'page_link' && item.target_page_id && pagesConfig &&
    !pagesConfig.pages.find(p => p.id === item.target_page_id && p.enabled);

  return (
    <div ref={setNodeRef} style={style}>
      <button
        type="button"
        onClick={() => onSelect(isSelected ? null : item.id)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors group',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted/60 text-foreground',
          isDragging && 'opacity-50',
        )}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        {/* Drag handle (top level only) */}
        {depth === 0 && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        )}
        {depth > 0 && <span className="w-3.5 flex-shrink-0" />}

        {/* Type icon */}
        <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', item.item_type === 'cta' && 'text-primary')} />

        {/* Label */}
        <span className={cn('truncate flex-1 text-left', item.item_type === 'cta' && 'font-medium')}>
          {item.label}
        </span>

        {/* Visibility badge */}
        {item.visibility !== 'both' && (
          <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
            {item.visibility === 'desktop_only' ? 'Desktop' : 'Mobile'}
          </span>
        )}

        {/* Broken link warning */}
        {isBroken && (
          <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
        )}

        {/* CTA badge */}
        {item.item_type === 'cta' && (
          <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
            CTA
          </span>
        )}
      </button>

      {/* Children */}
      {item.children && item.children.length > 0 && (
        <div className="space-y-0.5">
          {item.children.map(child => (
            <MenuItemNode
              key={child.id}
              item={child}
              depth={depth + 1}
              isSelected={selectedItemId === child.id}
              selectedItemId={selectedItemId}
              onSelect={onSelect}
              pagesConfig={pagesConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}
