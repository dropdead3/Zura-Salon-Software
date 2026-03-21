import { useState, useEffect } from 'react';
import { Trash2, Settings, Copy } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UrlInput } from '../inputs/UrlInput';
import {
  useUpdateMenuItem,
  useDeleteMenuItem,
  useCreateMenuItem,
  type MenuItem,
  type MenuItemType,
  type CtaStyle,
  type MenuItemVisibility,
} from '@/hooks/useWebsiteMenus';
import type { WebsitePagesConfig } from '@/hooks/useWebsitePages';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MenuItemInspectorProps {
  item: MenuItem;
  menuId: string;
  pagesConfig: WebsitePagesConfig | null | undefined;
  allItems?: MenuItem[];
}

export function MenuItemInspector({ item, menuId, pagesConfig, allItems }: MenuItemInspectorProps) {
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const createItem = useCreateMenuItem();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local state for debounced fields
  const [label, setLabel] = useState(item.label);
  const [targetUrl, setTargetUrl] = useState(item.target_url ?? '');
  const [trackingKey, setTrackingKey] = useState(item.tracking_key ?? '');

  useEffect(() => {
    setLabel(item.label);
    setTargetUrl(item.target_url ?? '');
    setTrackingKey(item.tracking_key ?? '');
  }, [item.id, item.label, item.target_url, item.tracking_key]);

  const update = (updates: Partial<MenuItem>) => {
    updateItem.mutate({ id: item.id, ...updates });
  };

  const handleLabelBlur = () => {
    if (label !== item.label && label.trim()) {
      update({ label: label.trim() });
    }
  };

  const handleUrlBlur = () => {
    if (targetUrl !== (item.target_url ?? '')) {
      update({ target_url: targetUrl || null });
    }
  };

  const handleTrackingBlur = () => {
    if (trackingKey !== (item.tracking_key ?? '')) {
      update({ tracking_key: trackingKey || null });
    }
  };

  const handleDelete = () => {
    deleteItem.mutate(
      { id: item.id, menuId },
      { onSuccess: () => toast.success('Item deleted') }
    );
  };

  return (
    <EditorCard
      title="Item Settings"
      icon={Settings}
      description={item.label}
    >
      <div className="space-y-4">
        {/* Label */}
        <div className="space-y-1.5">
          <Label className="text-xs">Label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            className="h-9 text-sm"
            autoCapitalize="off"
          />
        </div>

        {/* Item Type */}
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select
            value={item.item_type}
            onValueChange={(v) => update({ item_type: v as MenuItemType })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page_link">Page Link</SelectItem>
              <SelectItem value="external_url">External URL</SelectItem>
              <SelectItem value="anchor">Anchor Link</SelectItem>
              <SelectItem value="dropdown_parent">Dropdown Parent</SelectItem>
              <SelectItem value="cta">Call-to-Action</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Target - adapts by type */}
        {(item.item_type === 'page_link') && (
          <div className="space-y-1.5">
            <Label className="text-xs">Target Page</Label>
            <Select
              value={item.target_page_id ?? ''}
              onValueChange={(v) => update({ target_page_id: v || null })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select page..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None (use URL) —</SelectItem>
                {pagesConfig?.pages.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} {!p.enabled && '(disabled)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Fallback URL if no page selected */}
            {!item.target_page_id && (
              <UrlInput
                label="URL Path"
                value={targetUrl}
                onChange={setTargetUrl}
                placeholder="/services"
                description="Relative path for this link"
              />
            )}
          </div>
        )}

        {(item.item_type === 'external_url' || item.item_type === 'cta') && (
          <UrlInput
            label={item.item_type === 'cta' ? 'CTA URL' : 'External URL'}
            value={targetUrl}
            onChange={setTargetUrl}
            placeholder="https://example.com"
          />
        )}

        {item.item_type === 'anchor' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Anchor ID</Label>
            <Input
              value={item.target_anchor ?? ''}
              onChange={(e) => update({ target_anchor: e.target.value || null })}
              placeholder="#section-name"
              className="h-9 text-sm"
              autoCapitalize="none"
            />
          </div>
        )}

        {/* CTA Style */}
        {item.item_type === 'cta' && (
          <div className="space-y-1.5">
            <Label className="text-xs">CTA Style</Label>
            <Select
              value={item.cta_style ?? 'primary'}
              onValueChange={(v) => update({ cta_style: v as CtaStyle })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Open in new tab */}
        {item.item_type !== 'dropdown_parent' && (
          <div className="flex items-center justify-between">
            <Label className="text-xs">Open in new tab</Label>
            <Switch
              checked={item.open_in_new_tab}
              onCheckedChange={(v) => update({ open_in_new_tab: v })}
            />
          </div>
        )}

        {/* Visibility */}
        <div className="space-y-1.5">
          <Label className="text-xs">Visibility</Label>
          <Select
            value={item.visibility}
            onValueChange={(v) => update({ visibility: v as MenuItemVisibility })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Desktop & Mobile</SelectItem>
              <SelectItem value="desktop_only">Desktop Only</SelectItem>
              <SelectItem value="mobile_only">Mobile Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tracking Key */}
        <div className="space-y-1.5">
          <Label className="text-xs">Tracking Key</Label>
          <Input
            value={trackingKey}
            onChange={(e) => setTrackingKey(e.target.value)}
            onBlur={handleTrackingBlur}
            placeholder="nav_services_click"
            className="h-9 text-sm"
            autoCapitalize="none"
          />
          <p className="text-[10px] text-muted-foreground">Optional analytics identifier</p>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-border/40 flex items-center gap-2">
          <Button
            variant="ghost"
            size={tokens.button.inline}
            className="text-xs"
            onClick={() => {
              createItem.mutate({
                menu_id: menuId,
                label: `${item.label} (copy)`,
                item_type: item.item_type,
                target_url: item.target_url,
                target_page_id: item.target_page_id,
                target_anchor: item.target_anchor,
                cta_style: item.cta_style,
                visibility: item.visibility,
                open_in_new_tab: item.open_in_new_tab,
                parent_id: item.parent_id,
                sort_order: item.sort_order + 1,
              } as any, {
                onSuccess: () => toast.success('Item duplicated'),
              });
            }}
            disabled={createItem.isPending}
          >
            <Copy className="h-3 w-3 mr-1" />
            Duplicate
          </Button>
          <Button
            variant="ghost"
            size={tokens.button.inline}
            className="text-destructive hover:text-destructive text-xs"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{item.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this menu item{item.item_type === 'dropdown_parent' ? ' and all its children' : ''}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EditorCard>
  );
}
