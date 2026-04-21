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
import { BookOpen, Plus, Loader2, Upload, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useHandbooks, useCreateHandbook } from '@/hooks/handbook/useHandbookData';
import { useLeadershipCheck } from '@/hooks/useLeadershipCheck';
import { HandbookStatusBadge } from '@/components/dashboard/handbook/HandbookStatusBadge';
import { RoleHandbookGrid } from '@/components/dashboard/handbook/RoleHandbookGrid';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { usePolicyOrgProfile } from '@/hooks/policy/usePolicyOrgProfile';
import { formatDistanceToNow } from 'date-fns';

interface HandbookDashboardContentProps {
  /** When true, renders header + new-handbook CTA inline. When false, parent provides surrounding chrome. */
  embedded?: boolean;
}

/**
 * Reusable content body for the Handbook Wizard list.
 * Used standalone (page mode) and inside the consolidated Handbooks tabbed surface.
 */
export function HandbookDashboardContent({ embedded = false }: HandbookDashboardContentProps) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { data: handbooks = [], isLoading } = useHandbooks();
  const { data: policyProfile } = usePolicyOrgProfile();
  const createHandbook = useCreateHandbook();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const result = await createHandbook.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    setDialogOpen(false);
    setName('');
    setDescription('');
    navigate(dashPath(`/admin/handbook-wizard/${result.handbook.id}/edit`));
  };

  // Nudge: operator told the wizard they have an existing handbook, but none uploaded yet.
  const showExistingHandbookNudge =
    !!policyProfile?.has_existing_handbook && !isLoading && (handbooks as any[]).length === 0;

  return (
    <div className="space-y-6">
      {embedded && (
        <div className="flex items-center justify-between gap-4">
          <p className="font-sans text-sm text-muted-foreground max-w-2xl">
            One handbook per role. Configure with the wizard or upload an existing document — every staff role gets its own scoped handbook.
          </p>
        </div>
      )}

      {showExistingHandbookNudge && (
        <Card className="rounded-xl border-primary/30 bg-gradient-to-br from-primary/5 via-card/80 to-card/80">
          <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className={cn(tokens.heading.card, 'text-sm')}>
                  Upload your existing handbook
                </h4>
                <p className="font-sans text-xs text-muted-foreground mt-1 max-w-2xl">
                  You told us you already have a handbook. Upload it to a role below so we can map it instead of drafting fresh.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="font-sans shrink-0"
              onClick={() => navigate(dashPath('/admin/handbooks?tab=documents&upload=role'))}
            >
              Upload now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Role-first grid is the default surface */}
      <RoleHandbookGrid
        showingAll={showAll}
        onShowAllToggle={() => setShowAll((v) => !v)}
      />

      {/* Legacy flat list, hidden behind a toggle */}
      {showAll && (
        isLoading ? (
          <DashboardLoader />
        ) : handbooks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center text-center gap-3">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
              <p className="font-sans text-sm text-muted-foreground max-w-md">
                No handbooks yet. Use a role card above to start.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">All Handbooks</h3>
              <Button onClick={() => setDialogOpen(true)} size="sm" variant="outline" className="font-sans">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> New unscoped handbook
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {handbooks.map((h: any) => (
                <Card
                  key={h.id}
                  className="cursor-pointer hover:border-primary/40 transition-colors bg-card/80"
                  onClick={() => navigate(dashPath(`/admin/handbook-wizard/${h.id}/edit`))}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={cn(tokens.heading.card, 'truncate')}>{h.name}</h3>
                        {h.primary_role && (
                          <p className="font-sans text-xs text-primary mt-0.5">Role: {h.primary_role.replace(/_/g, ' ')}</p>
                        )}
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
          </div>
        )
      )}

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
    </div>
  );
}

/**
 * Page-mode wrapper. Kept for backward-compat when redirected from the legacy
 * `/admin/handbook-wizard` route. Now redirects callers to the consolidated
 * `/admin/handbooks?tab=wizard` surface in App.tsx routing.
 */
export default function HandbookDashboard() {
  const { isLeadership } = useLeadershipCheck();

  if (!isLeadership) {
    return (
      <DashboardLayout>
        <Card><CardContent className="py-12 text-center font-sans text-sm text-muted-foreground">
          Handbook administration is restricted to leadership.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardPageHeader
          title="Handbook"
          description="Architect role-aware handbooks for your organization. Configure policy first, draft with AI, publish when ready."
        />
        <HandbookDashboardContent embedded />
      </div>
    </DashboardLayout>
  );
}
