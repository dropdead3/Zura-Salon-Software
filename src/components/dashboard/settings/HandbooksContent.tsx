import { useState, useEffect } from 'react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { tokens } from '@/lib/design-tokens';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Loader2, 
  Pencil, 
  Trash2, 
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFormatDate } from '@/hooks/useFormatDate';

interface Handbook {
  id: string;
  title: string;
  category: string | null;
  content: string | null;
  file_url: string | null;
  version: string | null;
  is_active: boolean;
  visible_to_roles: string[] | null;
  created_at: string;
  updated_at: string;
}

const categories = [
  'Onboarding',
  'Policies',
  'Training',
  'Sales Scripts',
  'Product Knowledge',
  'Other',
];

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'stylist', label: 'Stylist' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'assistant', label: 'Assistant' },
];

export function HandbooksContent() {
  const { formatDate } = useFormatDate();
  const { toast } = useToast();
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHandbook, setEditingHandbook] = useState<Handbook | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('1.0');
  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(['stylist', 'assistant', 'receptionist']);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchHandbooks();
  }, []);

  const fetchHandbooks = async () => {
    const { data, error } = await supabase
      .from('handbooks')
      .select('*')
      .order('category')
      .order('title');

    if (!error) {
      setHandbooks(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setContent('');
    setVersion('1.0');
    setVisibleToRoles(['stylist', 'assistant', 'receptionist']);
    setFile(null);
    setEditingHandbook(null);
  };

  const openEditDialog = (handbook: Handbook) => {
    setEditingHandbook(handbook);
    setTitle(handbook.title);
    setCategory(handbook.category || '');
    setContent(handbook.content || '');
    setVersion(handbook.version || '1.0');
    setVisibleToRoles(handbook.visible_to_roles || ['stylist']);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let fileUrl = editingHandbook?.file_url || null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('handbooks')
        .upload(fileName, file);

      if (uploadError) {
        toast({ variant: 'destructive', title: 'Upload failed', description: uploadError.message });
        setSubmitting(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('handbooks').getPublicUrl(fileName);
      fileUrl = publicUrl;
    }

    const handbookData = {
      title,
      category: category || null,
      content: content || null,
      file_url: fileUrl,
      version,
      visible_to_roles: visibleToRoles as any,
    };

    if (editingHandbook) {
      const { error } = await supabase.from('handbooks').update(handbookData).eq('id', editingHandbook.id);
      if (!error) {
        toast({ title: 'Updated', description: 'Handbook updated successfully.' });
        fetchHandbooks();
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from('handbooks').insert(handbookData);
      if (!error) {
        toast({ title: 'Created', description: 'Handbook created successfully.' });
        fetchHandbooks();
        setDialogOpen(false);
        resetForm();
      }
    }

    setSubmitting(false);
  };

  const toggleActive = async (handbook: Handbook) => {
    const { error } = await supabase.from('handbooks').update({ is_active: !handbook.is_active }).eq('id', handbook.id);
    if (!error) {
      setHandbooks(prev => prev.map(h => h.id === handbook.id ? { ...h, is_active: !h.is_active } : h));
    }
  };

  const deleteHandbook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this handbook?')) return;
    const { error } = await supabase.from('handbooks').delete().eq('id', id);
    if (!error) {
      setHandbooks(prev => prev.filter(h => h.id !== id));
      toast({ title: 'Deleted', description: 'Handbook deleted.' });
    }
  };

  const toggleRoleVisibility = (role: string) => {
    setVisibleToRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const groupedHandbooks = handbooks.reduce((acc, handbook) => {
    const cat = handbook.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(handbook);
    return acc;
  }, {} as Record<string, Handbook[]>);

  if (loading) {
    return <DashboardLoader className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Add button */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Handbook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editingHandbook ? 'EDIT HANDBOOK' : 'NEW HANDBOOK'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Employee Handbook" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write content here..." rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Upload File (Optional)</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.txt" />
              </div>
              <div className="space-y-2">
                <Label>Visible To</Label>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map(role => (
                    <Button key={role.value} type="button" size={tokens.button.inline} variant={visibleToRoles.includes(role.value) ? 'default' : 'outline'} onClick={() => toggleRoleVisibility(role.value)}>
                      {role.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingHandbook ? 'Update' : 'Create')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {handbooks.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No handbooks yet. Create your first one!</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedHandbooks).map(([cat, items]) => (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm tracking-wider">{cat.toUpperCase()}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map(handbook => (
                  <div key={handbook.id} className={`flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30 ${!handbook.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded"><FileText className="w-4 h-4" /></div>
                      <div>
                        <h3 className="font-medium text-sm">{handbook.title}</h3>
                        <p className="text-xs text-muted-foreground">v{handbook.version} • {formatDate(new Date(handbook.updated_at), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {handbook.file_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={handbook.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(handbook)}>
                        {handbook.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(handbook)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteHandbook(handbook.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
