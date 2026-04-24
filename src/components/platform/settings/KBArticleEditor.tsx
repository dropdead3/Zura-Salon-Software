import { useState, useEffect } from 'react';
import { FileText, Star, Pin } from 'lucide-react';
import { PlatformButton } from '../ui/PlatformButton';
import { PlatformInput } from '../ui/PlatformInput';
import { PlatformLabel } from '../ui/PlatformLabel';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
  DialogFooter,
} from '@/components/platform/ui/PlatformDialog';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { PlatformCheckbox as Checkbox } from '@/components/platform/ui/PlatformCheckbox';
import { PlatformTextarea } from '@/components/platform/ui/PlatformTextarea';
import {
  useAdminKBCategories,
  useCreateKBArticle,
  useUpdateKBArticle,
  KBArticle,
} from '@/hooks/useKnowledgeBase';

interface KBArticleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: KBArticle | null;
  onClose: () => void;
}

export function KBArticleEditor({ open, onOpenChange, article, onClose }: KBArticleEditorProps) {
  const { data: categories } = useAdminKBCategories();
  const createArticle = useCreateKBArticle();
  const updateArticle = useUpdateKBArticle();

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category_id: '',
    summary: '',
    content: '',
    is_featured: false,
    is_pinned: false,
  });

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title,
        slug: article.slug,
        category_id: article.category_id || '',
        summary: article.summary || '',
        content: article.content,
        is_featured: article.is_featured,
        is_pinned: article.is_pinned,
      });
    } else {
      setFormData({
        title: '',
        slug: '',
        category_id: '',
        summary: '',
        content: '',
        is_featured: false,
        is_pinned: false,
      });
    }
  }, [article, open]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 100);
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    const slug = formData.slug || generateSlug(formData.title);
    const data = {
      ...formData,
      slug,
      category_id: formData.category_id || null,
      status,
    };

    if (article) {
      await updateArticle.mutateAsync({ id: article.id, ...data });
    } else {
      await createArticle.mutateAsync(data);
    }

    onClose();
  };

  const isSubmitting = createArticle.isPending || updateArticle.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-400" />
            {article ? 'Edit Article' : 'New Article'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <PlatformLabel>Title</PlatformLabel>
            <PlatformInput
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="How to Add Your First Location"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <PlatformLabel>Category</PlatformLabel>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <PlatformLabel>Slug (URL)</PlatformLabel>
              <PlatformInput
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="how-to-add-your-first-location"
              />
            </div>
          </div>

          <div className="space-y-2">
            <PlatformLabel>Summary (shown in article cards)</PlatformLabel>
            <PlatformTextarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Learn how to create and configure your first location in minutes."
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <PlatformLabel>Content (Markdown supported)</PlatformLabel>
            <PlatformTextarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="## Getting Started

To add your first location, follow these steps:

1. Navigate to **Settings > Locations**
2. Click the **Add Location** button
..."
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: !!checked })}
                className="border-slate-600"
              />
              <label htmlFor="is_featured" className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer">
                <Star className="h-4 w-4 text-amber-400" />
                Featured article
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_pinned"
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: !!checked })}
                className="border-slate-600"
              />
              <label htmlFor="is_pinned" className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer">
                <Pin className="h-4 w-4 text-violet-400" />
                Pin to top of category
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <PlatformButton type="button" variant="outline" onClick={onClose}>
            Cancel
          </PlatformButton>
          <PlatformButton
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting || !formData.title || !formData.content}
          >
            Save as Draft
          </PlatformButton>
          <PlatformButton
            onClick={() => handleSubmit('published')}
            disabled={isSubmitting || !formData.title || !formData.content}
          >
            Publish
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
