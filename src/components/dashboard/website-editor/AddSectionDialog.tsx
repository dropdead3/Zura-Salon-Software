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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  ImageIcon,
  Video,
  Megaphone,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  CUSTOM_SECTION_TYPES,
  CUSTOM_TYPE_INFO,
  type CustomSectionType,
} from '@/hooks/useWebsiteSections';
import { SECTION_TEMPLATES, TEMPLATE_CATEGORIES, type SectionTemplate } from '@/data/section-templates';

const TYPE_ICONS: Record<CustomSectionType, React.ElementType> = {
  rich_text: FileText,
  image_text: ImageIcon,
  video: Video,
  custom_cta: Megaphone,
  spacer: Minus,
};

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: CustomSectionType, label: string) => void;
  onAddFromTemplate?: (template: SectionTemplate) => void;
}

export function AddSectionDialog({ open, onOpenChange, onAdd, onAddFromTemplate }: AddSectionDialogProps) {
  const [selectedType, setSelectedType] = useState<CustomSectionType | null>(null);
  const [label, setLabel] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleAdd = () => {
    if (!selectedType || !label.trim()) return;
    onAdd(selectedType, label.trim());
    setSelectedType(null);
    setLabel('');
    onOpenChange(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setSelectedType(null);
      setLabel('');
      setActiveCategory(null);
    }
    onOpenChange(val);
  };

  const handleTemplateSelect = (template: SectionTemplate) => {
    if (onAddFromTemplate) {
      onAddFromTemplate(template);
      handleClose(false);
    }
  };

  const filteredTemplates = SECTION_TEMPLATES.filter(t =>
    !activeCategory || t.category === activeCategory
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[75vh]">
        <DialogHeader>
          <DialogTitle>Add New Section</DialogTitle>
          <DialogDescription>Choose a blank section type or start from a template.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(75vh-8rem)]">
        {!selectedType ? (
          <Tabs defaultValue="blank" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="blank" className="flex-1">Blank</TabsTrigger>
              <TabsTrigger value="templates" className="flex-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="blank" className="mt-3">
              <div className="grid grid-cols-1 gap-2">
                {CUSTOM_SECTION_TYPES.map(type => {
                  const info = CUSTOM_TYPE_INFO[type];
                  const Icon = TYPE_ICONS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="p-2 rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{info.label}</span>
                          <Badge variant="outline" className="text-[9px]">Custom</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="mt-3 space-y-3">
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
              <div className="grid grid-cols-1 gap-2">
                {filteredTemplates.map(template => {
                  const Icon = TYPE_ICONS[template.section_type as CustomSectionType] || FileText;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="p-2 rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{template.name}</span>
                          <Badge variant="secondary" className="text-[9px]">{template.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              {(() => { const Icon = TYPE_ICONS[selectedType]; return <Icon className="h-4 w-4" />; })()}
              <span className="text-sm font-medium">{CUSTOM_TYPE_INFO[selectedType].label}</span>
              <Button variant="ghost" size={tokens.button.inline} className="ml-auto h-6 text-xs" onClick={() => setSelectedType(null)}>
                Change
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Section Name</Label>
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. About Our Philosophy"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!label.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Section
              </Button>
            </div>
          </div>
        )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
