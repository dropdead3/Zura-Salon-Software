import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import {
  useZuraKnowledge,
  useCreateKnowledgeEntry,
  useUpdateKnowledgeEntry,
  useDeleteKnowledgeEntry,
  ZuraKnowledgeEntry,
} from '@/hooks/useZuraConfig';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';

interface KnowledgeBaseTabProps {
  organizationId: string;
}

const CATEGORIES = [
  { value: 'salon_policy', label: 'Salon Policy' },
  { value: 'product_info', label: 'Product Info' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'brand_guidelines', label: 'Brand Guidelines' },
  { value: 'service_info', label: 'Service Info' },
  { value: 'faq', label: 'FAQ' },
  { value: 'custom', label: 'Custom' },
];

const FUNCTION_SCOPES = [
  { value: 'all', label: 'All Functions' },
  { value: 'ai-assistant', label: 'Help Assistant' },
  { value: 'ai-agent-chat', label: 'Team Chat Agent' },
  { value: 'ai-business-insights', label: 'Business Insights' },
  { value: 'ai-personal-insights', label: 'Personal Insights' },
  { value: 'ai-scheduling-copilot', label: 'Scheduling Copilot' },
  { value: 'generate-daily-huddle', label: 'Daily Huddle' },
];

const EMPTY_ENTRY = {
  title: '',
  content: '',
  category: 'custom' as const,
  priority: 5,
  is_active: true,
  applies_to_functions: ['all'],
};

export function KnowledgeBaseTab({ organizationId }: KnowledgeBaseTabProps) {
  const { data: entries = [], isLoading } = useZuraKnowledge(organizationId);
  const createEntry = useCreateKnowledgeEntry();
  const updateEntry = useUpdateKnowledgeEntry();
  const deleteEntry = useDeleteKnowledgeEntry();

  const [editingEntry, setEditingEntry] = useState<Partial<ZuraKnowledgeEntry> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => { setEditingEntry({ ...EMPTY_ENTRY }); setIsNew(true); };
  const openEdit = (entry: ZuraKnowledgeEntry) => { setEditingEntry({ ...entry }); setIsNew(false); };
  const close = () => { setEditingEntry(null); setIsNew(false); };

  const handleSave = () => {
    if (!editingEntry?.title || !editingEntry.content) return;
    if (isNew) {
      createEntry.mutate({ orgId: organizationId, data: editingEntry }, { onSuccess: close });
    } else if (editingEntry.id) {
      updateEntry.mutate({ id: editingEntry.id, orgId: organizationId, data: editingEntry }, { onSuccess: close });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this knowledge entry?')) return;
    deleteEntry.mutate({ id, orgId: organizationId });
  };

  const toggleScope = (fn: string) => {
    if (!editingEntry) return;
    const current = editingEntry.applies_to_functions || ['all'];
    if (fn === 'all') {
      setEditingEntry({ ...editingEntry, applies_to_functions: ['all'] });
    } else {
      const withoutAll = current.filter(f => f !== 'all');
      const updated = withoutAll.includes(fn) ? withoutAll.filter(f => f !== fn) : [...withoutAll, fn];
      setEditingEntry({ ...editingEntry, applies_to_functions: updated.length ? updated : ['all'] });
    }
  };

  const activeCount = entries.filter(e => e.is_active).length;
  const estimatedTokens = entries.filter(e => e.is_active).reduce((sum, e) => sum + Math.ceil((e.title.length + e.content.length) / 4), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5" /> Knowledge Base</CardTitle>
              <CardDescription>{activeCount} active entries · ~{estimatedTokens} tokens estimated</CardDescription>
            </div>
            <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Entry</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No knowledge entries yet</p>
              <p className="text-xs mt-1">{`Add salon policies, product info, and FAQs for ${AI_ASSISTANT_NAME_DEFAULT} to reference`}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{entry.priority}/10</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.is_active ? 'default' : 'secondary'} className="text-xs">
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(entry)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(entry.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={open => { if (!open) close(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Add Knowledge Entry' : 'Edit Knowledge Entry'}</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editingEntry.title || ''} onChange={e => setEditingEntry({ ...editingEntry, title: e.target.value })} placeholder="Cancellation Policy" />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editingEntry.category || 'custom'} onValueChange={v => setEditingEntry({ ...editingEntry, category: v as ZuraKnowledgeEntry['category'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Content</Label>
                  <span className="text-xs text-muted-foreground">{(editingEntry.content || '').length}/2000</span>
                </div>
                <Textarea
                  value={editingEntry.content || ''}
                  onChange={e => setEditingEntry({ ...editingEntry, content: e.target.value.slice(0, 2000) })}
                  placeholder="Clients must cancel 24 hours before their appointment..."
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Priority</Label>
                  <span className="text-xs text-muted-foreground font-mono">{editingEntry.priority || 5}/10</span>
                </div>
                <Slider
                  value={[editingEntry.priority || 5]}
                  onValueChange={([v]) => setEditingEntry({ ...editingEntry, priority: v })}
                  min={1} max={10} step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Function Scope</Label>
                <div className="flex flex-wrap gap-2">
                  {FUNCTION_SCOPES.map(fn => {
                    const active = (editingEntry.applies_to_functions || ['all']).includes(fn.value);
                    return (
                      <Badge
                        key={fn.value}
                        variant={active ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleScope(fn.value)}
                      >
                        {fn.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={editingEntry.is_active ?? true}
                  onCheckedChange={v => setEditingEntry({ ...editingEntry, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={handleSave} disabled={createEntry.isPending || updateEntry.isPending}>
              {isNew ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
