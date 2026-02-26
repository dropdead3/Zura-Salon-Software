/**
 * STRUCTURE PAGES TAB
 * 
 * Clean list of pages with draft/published indicators.
 * Hover reveals action menu. Click selects page.
 */

import { Plus, MoreHorizontal, Settings, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { PageConfig } from '@/hooks/useWebsitePages';

interface StructurePagesTabProps {
  pages: PageConfig[];
  selectedPageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage?: (pageId: string) => void;
  onPageSettings?: (pageId: string) => void;
  onDuplicatePage?: (pageId: string) => void;
}

export function StructurePagesTab({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onPageSettings,
  onDuplicatePage,
}: StructurePagesTabProps) {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="py-2 space-y-0.5">
          {pages.map((page) => (
            <div
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              className={cn(
                'group flex items-center gap-2 px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-120',
                selectedPageId === page.id
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted/60 border border-transparent'
              )}
            >
              {/* Status dot */}
              <span className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                page.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
              )} />

              {/* Page name */}
              <span className={cn(
                'text-sm font-sans font-medium flex-1 truncate',
                selectedPageId === page.id && 'text-primary'
              )}>
                {page.title}
              </span>

              {/* Page type badge */}
              {page.page_type === 'home' && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 opacity-60">
                  Home
                </Badge>
              )}

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-120"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onPageSettings?.(page.id)}>
                    <Settings className="h-3.5 w-3.5 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  {page.page_type !== 'home' && (
                    <DropdownMenuItem onClick={() => onDuplicatePage?.(page.id)}>
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {page.deletable && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDeletePage?.(page.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Add Page */}
      <div className="p-3 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8"
          onClick={onAddPage}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Page
        </Button>
      </div>
    </div>
  );
}
