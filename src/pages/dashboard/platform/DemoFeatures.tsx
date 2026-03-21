import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Eye, GripVertical, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ProductFeature {
  id: string;
  feature_key: string;
  name: string;
  tagline: string | null;
  description: string | null;
  problem_keywords: string[];
  category: string | null;
  screenshot_url: string | null;
  demo_video_url: string | null;
  related_features: string[];
  is_highlighted: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'overview', label: 'Overview' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'team', label: 'Team' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'clients', label: 'Clients' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'communication', label: 'Communication' },
  { value: 'training', label: 'Training' },
  { value: 'admin', label: 'Admin' },
];

const categoryIcons: Record<string, string> = {
  scheduling: '📅',
  team: '👥',
  payroll: '💰',
  clients: '💇',
  analytics: '📊',
  communication: '💬',
  training: '🎓',
  admin: '⚙️',
  overview: '🏠',
};

export default function DemoFeatures() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<ProductFeature | null>(null);
  const [formData, setFormData] = useState({
    feature_key: '',
    name: '',
    tagline: '',
    description: '',
    problem_keywords: '',
    category: 'overview',
    screenshot_url: '',
    demo_video_url: '',
    related_features: '',
    is_highlighted: false,
    is_active: true,
  });

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['product-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_features')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as ProductFeature[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ProductFeature>) => {
      if (editingFeature) {
        const { error } = await supabase
          .from('product_features')
          .update(data)
          .eq('id', editingFeature.id);
        if (error) throw error;
      } else {
        const maxOrder = features.length > 0 
          ? Math.max(...features.map(f => f.display_order)) + 1 
          : 0;
        const insertData = { ...data, display_order: maxOrder };
        const { error } = await supabase
          .from('product_features')
          .insert(insertData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-features'] });
      setIsDialogOpen(false);
      setEditingFeature(null);
      toast.success(editingFeature ? 'Feature updated' : 'Feature created');
    },
    onError: (error) => {
      toast.error('Failed to save feature');
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_features')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-features'] });
      toast.success('Feature deleted');
    },
    onError: () => {
      toast.error('Failed to delete feature');
    },
  });

  const handleOpenDialog = (feature?: ProductFeature) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        feature_key: feature.feature_key,
        name: feature.name,
        tagline: feature.tagline || '',
        description: feature.description || '',
        problem_keywords: feature.problem_keywords?.join(', ') || '',
        category: feature.category || 'overview',
        screenshot_url: feature.screenshot_url || '',
        demo_video_url: feature.demo_video_url || '',
        related_features: feature.related_features?.join(', ') || '',
        is_highlighted: feature.is_highlighted,
        is_active: feature.is_active,
      });
    } else {
      setEditingFeature(null);
      setFormData({
        feature_key: '',
        name: '',
        tagline: '',
        description: '',
        problem_keywords: '',
        category: 'overview',
        screenshot_url: '',
        demo_video_url: '',
        related_features: '',
        is_highlighted: false,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      feature_key: formData.feature_key,
      name: formData.name,
      tagline: formData.tagline || null,
      description: formData.description || null,
      problem_keywords: formData.problem_keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean),
      category: formData.category,
      screenshot_url: formData.screenshot_url || null,
      demo_video_url: formData.demo_video_url || null,
      related_features: formData.related_features
        .split(',')
        .map(k => k.trim())
        .filter(Boolean),
      is_highlighted: formData.is_highlighted,
      is_active: formData.is_active,
    });
  };

  const toggleHighlight = async (feature: ProductFeature) => {
    const { error } = await supabase
      .from('product_features')
      .update({ is_highlighted: !feature.is_highlighted })
      .eq('id', feature.id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['product-features'] });
    }
  };

  const toggleActive = async (feature: ProductFeature) => {
    const { error } = await supabase
      .from('product_features')
      .update({ is_active: !feature.is_active })
      .eq('id', feature.id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['product-features'] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Demo Features</h1>
          <p className="text-muted-foreground">
            Manage the product features shown in the AI-powered demo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/demo" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              Preview Demo
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Catalog</CardTitle>
          <CardDescription>
            Features are matched to user problems using keywords and AI understanding
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : features.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No features yet. Add your first feature to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead className="text-center">Highlighted</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((feature) => (
                  <TableRow key={feature.id} className={!feature.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {categoryIcons[feature.category || ''] || '✨'}
                          {feature.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {feature.feature_key}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {feature.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {feature.problem_keywords?.slice(0, 3).map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {(feature.problem_keywords?.length || 0) > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(feature.problem_keywords?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={feature.is_highlighted}
                        onCheckedChange={() => toggleHighlight(feature)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={feature.is_active}
                        onCheckedChange={() => toggleActive(feature)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(feature)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this feature?')) {
                              deleteMutation.mutate(feature.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFeature ? 'Edit Feature' : 'Add Feature'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feature_key">Feature Key</Label>
                <Input
                  id="feature_key"
                  value={formData.feature_key}
                  onChange={(e) => setFormData({ ...formData, feature_key: e.target.value })}
                  placeholder="payroll_hub"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Payroll Hub"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="One-line value proposition"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed feature description..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {categoryIcons[cat.value]} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="problem_keywords">Problem Keywords</Label>
                <Input
                  id="problem_keywords"
                  value={formData.problem_keywords}
                  onChange={(e) => setFormData({ ...formData, problem_keywords: e.target.value })}
                  placeholder="commission, pay, tips (comma-separated)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="screenshot_url">Screenshot URL</Label>
                <Input
                  id="screenshot_url"
                  value={formData.screenshot_url}
                  onChange={(e) => setFormData({ ...formData, screenshot_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo_video_url">Demo Video URL</Label>
                <Input
                  id="demo_video_url"
                  value={formData.demo_video_url}
                  onChange={(e) => setFormData({ ...formData, demo_video_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="related_features">Related Features</Label>
              <Input
                id="related_features"
                value={formData.related_features}
                onChange={(e) => setFormData({ ...formData, related_features: e.target.value })}
                placeholder="analytics_hub, team_directory (feature keys, comma-separated)"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_highlighted"
                  checked={formData.is_highlighted}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_highlighted: checked })}
                />
                <Label htmlFor="is_highlighted">Highlighted Feature</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Feature'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
