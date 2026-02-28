import { useState } from 'react';
import { Link2, ExternalLink, ChevronDown, MousePointerClick, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCreateMenuItem, type MenuItemType, type MenuItem } from '@/hooks/useWebsiteMenus';
import type { WebsitePagesConfig } from '@/hooks/useWebsitePages';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ITEM_TYPES: { value: MenuItemType; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'page_link', label: 'Page Link', description: 'Link to an internal page', icon: Link2 },
  { value: 'external_url', label: 'External URL', description: 'Link to an external website', icon: ExternalLink },
  { value: 'dropdown_parent', label: 'Dropdown', description: 'Group items in a dropdown', icon: ChevronDown },
  { value: 'cta', label: 'Call-to-Action', description: 'Styled action button', icon: MousePointerClick },
  { value: 'anchor', label: 'Anchor Link', description: 'Jump to a section on a page', icon: Hash },
];

interface AddMenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId: string;
  pagesConfig: WebsitePagesConfig | null | undefined;
  existingItemCount: number;
  menuItems?: MenuItem[];
}

export function AddMenuItemDialog({ open, onOpenChange, menuId, pagesConfig, existingItemCount, menuItems }: AddMenuItemDialogProps) {
  const [type, setType] = useState<MenuItemType>('page_link');
  const [label, setLabel] = useState('');
  const [targetPageId, setTargetPageId] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [parentId, setParentId] = useState('');
  const createItem = useCreateMenuItem();

  // Get dropdown parents for nesting
  const dropdownParents = (menuItems ?? []).filter(i => i.item_type === 'dropdown_parent');

  const handleCreate = () => {
    if (!label.trim()) {
      toast.error('Label is required');
      return;
    }

    const item: Record<string, unknown> = {
      menu_id: menuId,
      label: label.trim(),
      item_type: type,
      sort_order: existingItemCount,
      ...(parentId ? { parent_id: parentId } : {}),
    };

    if (type === 'page_link' && targetPageId) {
      item.target_page_id = targetPageId;
      // Auto-set URL from page slug
      const page = pagesConfig?.pages.find(p => p.id === targetPageId);
      if (page) {
        item.target_url = page.slug ? `/${page.slug}` : '/';
      }
    }

    if ((type === 'external_url' || type === 'cta') && targetUrl) {
      item.target_url = targetUrl;
    }

    if (type === 'cta') {
      item.cta_style = 'primary';
    }

    createItem.mutate(item as any, {
      onSuccess: () => {
        toast.success(`"${label}" added`);
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setType('page_link');
    setLabel('');
    setTargetPageId('');
    setTargetUrl('');
    setParentId('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add Menu Item</DialogTitle>
          <DialogDescription>Choose a type and configure the new navigation item.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            {ITEM_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all text-xs',
                  type === t.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border/40 hover:border-border'
                )}
              >
                <t.icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', type === t.value ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{t.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-xs">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Menu item label"
              className="h-9 text-sm"
              autoCapitalize="off"
            />
          </div>

          {/* Page Selector */}
          {type === 'page_link' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Target Page</Label>
              <Select value={targetPageId} onValueChange={(v) => {
                setTargetPageId(v);
                // Auto-fill label from page name
                if (!label && v) {
                  const page = pagesConfig?.pages.find(p => p.id === v);
                  if (page) setLabel(page.title);
                }
              }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select page..." />
                </SelectTrigger>
                <SelectContent>
                  {pagesConfig?.pages.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} {!p.enabled && '(disabled)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* URL */}
          {(type === 'external_url' || type === 'cta') && (
            <div className="space-y-1.5">
              <Label className="text-xs">URL</Label>
              <Input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder={type === 'external_url' ? 'https://example.com' : '/booking'}
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Parent Item (nesting) */}
          {dropdownParents.length > 0 && type !== 'dropdown_parent' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Parent Item</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Top level (no parent)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Top Level</SelectItem>
                  {dropdownParents.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Nest this item under a dropdown parent</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createItem.isPending || !label.trim()}>
              {createItem.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
