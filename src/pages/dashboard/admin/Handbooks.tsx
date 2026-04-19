import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tokens } from '@/lib/design-tokens';
import {
  FileText,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useToast } from '@/hooks/use-toast';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useLeadershipCheck } from '@/hooks/useLeadershipCheck';
import { HandbookDashboardContent } from './HandbookDashboard';

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

type TabKey = 'wizard' | 'documents';

function DocumentsTab() {
  const { formatDate } = useFormatDate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Role-prefill via ?upload=role&role=<key>
  useEffect(() => {
    if (searchParams.get('upload') === 'role') {
      const role = searchParams.get('role');
      if (role) {
        setVisibleToRoles([role]);
        setTitle(`${role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Handbook`);
        setDialogOpen(true);
        // Clear the params so it doesn't re-trigger
        const next = new URLSearchParams(searchParams);
        next.delete('upload');
        next.delete('role');
        setSearchParams(next, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHandbooks = async () => {
    const { data, error } = await supabase
      .from('handbooks')
      .select('*')
      .order('category')
      .order('title');

    if (error) {
      console.error('Error fetching handbooks:', error);
    } else {
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
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Updated', description: 'Handbook updated successfully.' });
        fetchHandbooks();
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from('handbooks').insert(handbookData);
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Created', description: 'Handbook created successfully.' });
        fetchHandbooks();
        setDialogOpen(false);
        resetForm();
      }
    }

    setSubmitting(false);
  };

  const toggleActive = async (handbook: Handbook) => {
    const { error } = await supabase
      .from('handbooks')
      .update({ is_active: !handbook.is_active })
      .eq('id', handbook.id);

    if (!error) {
      setHandbooks(prev => prev.map(h => h.id === handbook.id ? { ...h, is_active: !h.is_active } : h));
      toast({
        title: handbook.is_active ? 'Hidden' : 'Published',
        description: `Handbook is now ${handbook.is_active ? 'hidden from' : 'visible to'} staff.`,
      });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="font-sans text-sm text-muted-foreground max-w-2xl">
          Upload existing PDFs and policy documents for staff acknowledgment.
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="font-sans shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display tracking-wide">
                {editingHandbook ? 'Edit Document' : 'New Document'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="font-sans">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Employee Handbook" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-sans">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-sans">Version</Label>
                  <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-sans">Content</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write content here or upload a file…" rows={6} />
              </div>

              <div className="space-y-2">
                <Label className="font-sans">Upload File (Optional)</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.txt" />
                {editingHandbook?.file_url && !file && (
                  <p className="text-xs text-muted-foreground font-sans">Current file attached. Upload new to replace.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-sans">Visible To</Label>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map(role => (
                    <Button
                      key={role.value}
                      type="button"
                      size={tokens.button.card}
                      variant={visibleToRoles.includes(role.value) ? 'default' : 'outline'}
                      onClick={() => toggleRoleVisibility(role.value)}
                      className="text-xs font-sans"
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full font-sans" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingHandbook ? 'Update' : 'Create')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <DashboardLoader size="lg" className="py-20" />
      ) : handbooks.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground font-sans">No documents yet. Upload your first one.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedHandbooks).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="font-display text-sm tracking-wider text-muted-foreground mb-4 uppercase">{cat}</h2>
              <div className="space-y-3">
                {items.map(handbook => (
                  <Card key={handbook.id} className={`p-4 ${!handbook.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-sans font-medium">{handbook.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 font-sans">
                            v{handbook.version} • Updated {formatDate(new Date(handbook.updated_at), 'MMM d, yyyy')}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {handbook.visible_to_roles?.map(role => (
                              <span key={role} className="px-2 py-0.5 bg-muted text-xs rounded capitalize font-sans">{role}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {handbook.file_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={handbook.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(handbook)}>
                          {handbook.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(handbook)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteHandbook(handbook.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Handbooks() {
  const { isLeadership } = useLeadershipCheck();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = tabParam === 'documents' ? 'documents' : 'wizard';

  const setTab = (tab: TabKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  if (!isLeadership) {
    return (
      <DashboardLayout>
        <Card className="p-12 text-center font-sans text-sm text-muted-foreground">
          Handbook administration is restricted to leadership.
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardPageHeader
          title="Handbooks"
          description="Build structured handbooks with the wizard, or manage uploaded policy documents."
        />

        <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="wizard">Wizard</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="wizard">
            <HandbookDashboardContent embedded />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
