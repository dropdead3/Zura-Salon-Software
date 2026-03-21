import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { tokens } from '@/lib/design-tokens';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SECTION_TEMPLATES, TEMPLATE_CATEGORIES, type SectionTemplate } from '@/data/section-templates';
import { FileText, Megaphone, Video, Minus } from 'lucide-react';
import type { CustomSectionType } from '@/hooks/useWebsiteSections';

const TYPE_ICONS: Record<string, React.ElementType> = {
  rich_text: FileText,
  image_text: FileText,
  video: Video,
  custom_cta: Megaphone,
  spacer: Minus,
};

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: SectionTemplate) => void;
  filterType?: CustomSectionType;
}

export function TemplatePicker({ open, onOpenChange, onSelect, filterType }: TemplatePickerProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = SECTION_TEMPLATES.filter(t => {
    if (filterType && t.section_type !== filterType) return false;
    if (activeCategory && t.category !== activeCategory) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh]">
        <DialogHeader>
          <DialogTitle>Section Templates</DialogTitle>
          <DialogDescription>Choose a pre-built template to get started quickly.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(70vh-8rem)]">
        {/* Category Tabs */}
        {!filterType && (
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={activeCategory === null ? 'default' : 'outline')}
              size={tokens.button.inline}
              className="h-7 text-xs"
              onClick={() => setActiveCategory(null)}
            >
              All
            </Button>
            {TEMPLATE_CATEGORIES.map(cat => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'outline')}
                size={tokens.button.inline}
                className="h-7 text-xs"
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        )}

        {/* Template Cards */}
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(template => {
            const Icon = TYPE_ICONS[template.section_type] || FileText;
            return (
              <button
                key={template.id}
                onClick={() => {
                  onSelect(template);
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
              >
                <div className="p-2 rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{template.name}</span>
                    <Badge variant="outline" className="text-[9px]">{template.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No templates in this category</p>
          )}
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
