import { useState } from 'react';
import { Plus, X, Loader2, Link2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCategoryAddons,
  useCreateCategoryAddon,
  useDeleteCategoryAddon,
} from '@/hooks/useCategoryAddons';

interface CategoryAddonManagerProps {
  categoryId: string;
  categoryName: string;
  organizationId: string;
  availableCategories: string[];    // other category names for "by category" link
  availableServiceNames: string[];  // flat list of Phorest service names for "by service" link
}

type LinkMode = 'service' | 'category';

export function CategoryAddonManager({
  categoryId,
  categoryName,
  organizationId,
  availableCategories,
  availableServiceNames,
}: CategoryAddonManagerProps) {
  const SENTINEL = '__none__';

  const [addLabel, setAddLabel] = useState('');
  const [labelTouched, setLabelTouched] = useState(false);
  const [linkMode, setLinkMode] = useState<LinkMode>('service');
  const [selectedService, setSelectedService] = useState(SENTINEL);
  const [selectedCategory, setSelectedCategory] = useState(SENTINEL);
  const [isAdding, setIsAdding] = useState(false);

  const { data: addons = [], isLoading } = useCategoryAddons(categoryId);
  const createAddon = useCreateCategoryAddon();
  const deleteAddon = useDeleteCategoryAddon();

  const resetForm = () => {
    setAddLabel('');
    setLabelTouched(false);
    setSelectedService(SENTINEL);
    setSelectedCategory(SENTINEL);
    setIsAdding(false);
  };

  const handleCreate = () => {
    setLabelTouched(true);
    if (!addLabel.trim()) return;

    createAddon.mutate(
      {
        organization_id: organizationId,
        source_category_id: categoryId,
        addon_label: addLabel.trim(),
        // __none__ sentinel → null (label-only recommendation)
        addon_service_name: linkMode === 'service'
          ? (selectedService && selectedService !== SENTINEL ? selectedService : null)
          : null,
        addon_category_name: linkMode === 'category'
          ? (selectedCategory && selectedCategory !== SENTINEL ? selectedCategory : null)
          : null,
        display_order: addons.length,
      },
      { onSuccess: resetForm }
    );
  };

  return (
    <div className="space-y-2">
      {/* Existing add-ons */}
      {isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : addons.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">
          No add-ons configured for <span className="font-medium">{categoryName}</span> yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {addons.map(addon => (
            <Badge
              key={addon.id}
              variant="secondary"
              className="text-xs font-normal gap-1 pr-1"
            >
              {addon.addon_label}
              {addon.addon_service_name && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Link2 className="h-2.5 w-2.5" />
                  {addon.addon_service_name}
                </span>
              )}
              {addon.addon_category_name && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <FolderOpen className="h-2.5 w-2.5" />
                  {addon.addon_category_name}
                </span>
              )}
              <button
                onClick={() => deleteAddon.mutate({
                  id: addon.id,
                  categoryId,
                  organizationId,
                })}
                className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                aria-label={`Remove ${addon.addon_label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add new form */}
      {!isAdding ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Recommendation
        </Button>
      ) : (
        <div className="space-y-2 bg-muted/30 rounded-lg p-2.5 border border-border/50">
          <Input
            placeholder="Label (e.g. Scalp Treatment)"
            value={addLabel}
            onChange={e => { setAddLabel(e.target.value); setLabelTouched(true); }}
            className={cn('h-8 text-xs', labelTouched && !addLabel.trim() && 'border-destructive focus-visible:ring-destructive')}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') resetForm(); }}
          />

          {/* Link mode toggle */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground mr-1">Link to:</span>
            <Button
              size="sm"
              variant={linkMode === 'service' ? 'default' : 'outline'}
              className="h-6 text-xs px-2"
              onClick={() => setLinkMode('service')}
            >
              Specific Service
            </Button>
            <Button
              size="sm"
              variant={linkMode === 'category' ? 'default' : 'outline'}
              className="h-6 text-xs px-2"
              onClick={() => setLinkMode('category')}
            >
              Full Category
            </Button>
          </div>

          {/* Service picker */}
          {linkMode === 'service' && (
            availableServiceNames.length > 0 ? (
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a service (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {/* Sentinel: deselect / label-only — must not be empty string (Radix prohibits it) */}
                  <SelectItem value="__none__" className="text-xs italic text-muted-foreground">
                    Label only — no specific service
                  </SelectItem>
                  {availableServiceNames.map(name => (
                    <SelectItem key={name} value={name} className="text-xs">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-snug">
                No services loaded yet. You can still save a label-only recommendation, or sync your POS first.
              </p>
            )
          )}

          {/* Category picker */}
          {linkMode === 'category' && availableCategories.length > 0 && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {/* Sentinel: deselect — must not be empty string (Radix prohibits it) */}
                <SelectItem value="__none__" className="text-xs italic text-muted-foreground">
                  No specific category
                </SelectItem>
                {availableCategories.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleCreate}
              disabled={!addLabel.trim() || createAddon.isPending}
            >
              {createAddon.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
