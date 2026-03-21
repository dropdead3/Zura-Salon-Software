import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Plus, Pencil, Trash2, Search, Variable, Check, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useEmailVariables,
  useCreateEmailVariable,
  useUpdateEmailVariable,
  useDeleteEmailVariable,
  EmailVariable,
} from '@/hooks/useEmailVariables';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Recipient',
  'Dates',
  'Company',
  'Locations',
  'Scheduling',
  'Program',
  'Metrics',
  'Training',
  'Notifications',
  'Birthdays',
  'Anniversaries',
  'Strikes',
  'Wins',
  'Links',
  'Custom',
];

const categoryColors: Record<string, string> = {
  Recipient: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Dates: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Company: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Locations: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Scheduling: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  Program: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  Metrics: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Training: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  Notifications: 'bg-red-500/10 text-red-600 border-red-500/20',
  Birthdays: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  Anniversaries: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  Strikes: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  Wins: 'bg-green-500/10 text-green-600 border-green-500/20',
  Links: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  Custom: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export function EmailVariablesManager() {
  const { data: variables, isLoading } = useEmailVariables();
  const createVariable = useCreateEmailVariable();
  const updateVariable = useUpdateEmailVariable();
  const deleteVariable = useDeleteEmailVariable();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<EmailVariable | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    variable_key: '',
    category: 'Custom',
    description: '',
    example: '',
  });

  const filteredVariables = variables?.filter((v) => {
    const matchesSearch =
      v.variable_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.example?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === 'all' || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenCreate = () => {
    setEditingVariable(null);
    setFormData({ variable_key: '', category: 'Custom', description: '', example: '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (variable: EmailVariable) => {
    setEditingVariable(variable);
    setFormData({
      variable_key: variable.variable_key,
      category: variable.category,
      description: variable.description,
      example: variable.example || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.variable_key || !formData.description) {
      toast({
        title: 'Missing fields',
        description: 'Variable key and description are required.',
        variant: 'destructive',
      });
      return;
    }

    // Ensure variable_key is snake_case
    const cleanKey = formData.variable_key
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (editingVariable) {
      await updateVariable.mutateAsync({
        id: editingVariable.id,
        updates: {
          variable_key: cleanKey,
          category: formData.category,
          description: formData.description,
          example: formData.example || null,
        },
      });
    } else {
      await createVariable.mutateAsync({
        variable_key: cleanKey,
        category: formData.category,
        description: formData.description,
        example: formData.example || undefined,
      });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteVariable.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  const copyVariable = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    toast({
      title: 'Copied!',
      description: `{{${key}}} copied to clipboard`,
    });
  };

  const categories = variables
    ? [...new Set(variables.map((v) => v.category))].sort()
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleOpenCreate} size={tokens.button.card}>
          <Plus className="h-4 w-4 mr-1" />
          Add Variable
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredVariables?.length} variable{filteredVariables?.length !== 1 ? 's' : ''} found
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Variable</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[150px]">Example</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVariables?.map((variable) => (
              <TableRow key={variable.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {`{{${variable.variable_key}}}`}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyVariable(variable.variable_key)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', categoryColors[variable.category])}
                  >
                    {variable.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {variable.description}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {variable.example || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {deleteConfirmId === variable.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(variable.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenEdit(variable)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteConfirmId(variable.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredVariables?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No variables found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariable ? 'Edit Variable' : 'Add New Variable'}
            </DialogTitle>
            <DialogDescription>
              {editingVariable
                ? 'Update the variable details below.'
                : 'Create a new email template variable.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="variable_key">Variable Key</Label>
              <Input
                id="variable_key"
                placeholder="e.g., custom_field_name"
                value={formData.variable_key}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, variable_key: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Use snake_case (lowercase with underscores). Will be used as {`{{${formData.variable_key || 'variable_key'}}}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this variable represents..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="example">Example Value (optional)</Label>
              <Input
                id="example"
                placeholder="e.g., Sample Value"
                value={formData.example}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, example: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Shown in the editor and used for test emails.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createVariable.isPending || updateVariable.isPending}
            >
              {editingVariable ? 'Save Changes' : 'Create Variable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
