import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { BookOpen, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useHandbooks, useCreateHandbook } from '@/hooks/handbook/useHandbookData';
import { useLeadershipCheck } from '@/hooks/useLeadershipCheck';
import { HandbookStatusBadge } from '@/components/dashboard/handbook/HandbookStatusBadge';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { formatDistanceToNow } from 'date-fns';

export default function HandbookDashboard() {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { isLeadership } = useLeadershipCheck();
  const { data: handbooks = [], isLoading } = useHandbooks();
  const createHandbook = useCreateHandbook();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isLeadership) {
    return (
      <DashboardLayout>
        <Card><CardContent className="py-12 text-center font-sans text-sm text-muted-foreground">
          Handbook administration is restricted to leadership.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  const handleCreate = async () => {
    if (!name.trim()) return;
    const result = await createHandbook.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    setDialogOpen(false);
    setName('');
    setDescription('');
    navigate(dashPath(`/admin/handbook/${result.handbook.id}/edit`));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardPageHeader
          title="Handbook"
          description="Architect role-aware handbooks for your organization. Configure policy first, draft with AI, publish when ready."
          actions={
            <Button onClick={() => setDialogOpen(true)} className="font-sans">
              <Plus className="w-4 h-4 mr-2" /> New Handbook
            </Button>
          }
        />

        {isLoading ? (
          <DashboardLoader />
        ) : handbooks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className={cn(tokens.heading.card)}>Create your first handbook</h3>
                <p className="font-sans text-sm text-muted-foreground">
                  We'll guide you through structure, scope, and policy decisions before any drafting begins — so the final handbook reflects how you actually operate.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} className="font-sans">
                <Plus className="w-4 h-4 mr-2" /> Start handbook
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {handbooks.map((h: any) => (
              <Card
                key={h.id}
                className="cursor-pointer hover:border-primary/40 transition-colors bg-card/80"
                onClick={() => navigate(dashPath(`/admin/handbook/${h.id}/edit`))}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className={cn(tokens.heading.card, 'truncate')}>{h.name}</h3>
                      {h.description && (
                        <p className="font-sans text-sm text-muted-foreground mt-1 line-clamp-2">{h.description}</p>
                      )}
                    </div>
                    <HandbookStatusBadge status={h.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs font-sans text-muted-foreground pt-2 border-t border-border/60">
                    <span>Updated {formatDistanceToNow(new Date(h.updated_at), { addSuffix: true })}</span>
                    <span>{h.location_scope === 'shared' ? 'Shared' : 'Per-location'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">New Handbook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-sans">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Team Handbook 2026"
                className="font-sans"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short note about this handbook's purpose."
                className="font-sans"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="font-sans">Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createHandbook.isPending} className="font-sans">
              {createHandbook.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create & Open Wizard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
