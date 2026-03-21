import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePerformanceReviews } from '@/hooks/usePerformanceReviews';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ArrowLeft, Plus, Star, FileCheck, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';

const REVIEW_TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'improvement_plan', label: 'Improvement Plan' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  submitted: { label: 'Submitted', variant: 'secondary' },
  acknowledged: { label: 'Acknowledged', variant: 'default' },
};

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export default function PerformanceReviews() {
  const { formatDate } = useFormatDate();
  const { reviews, createReview, updateReview } = usePerformanceReviews();
  const { effectiveOrganization: organization } = useOrganizationContext();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    user_id: '',
    review_type: 'annual',
    review_period_start: '',
    review_period_end: '',
    overall_rating: '',
    strengths: '',
    areas_for_improvement: '',
    goals_summary: '',
    reviewer_notes: '',
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-select', organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name')
        .eq('organization_id', organization!.id)
        .eq('is_active', true)
        .order('display_name');
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const handleSubmit = () => {
    if (!form.user_id) return;
    createReview.mutate({
      user_id: form.user_id,
      review_type: form.review_type,
      review_period_start: form.review_period_start || null,
      review_period_end: form.review_period_end || null,
      overall_rating: form.overall_rating ? parseInt(form.overall_rating) : null,
      strengths: form.strengths || null,
      areas_for_improvement: form.areas_for_improvement || null,
      goals_summary: form.goals_summary || null,
      reviewer_notes: form.reviewer_notes || null,
      status: 'draft',
    });
    setOpen(false);
    setForm({ user_id: '', review_type: 'annual', review_period_start: '', review_period_end: '', overall_rating: '', strengths: '', areas_for_improvement: '', goals_summary: '', reviewer_notes: '' });
  };

  const handleSubmitReview = (id: string) => {
    updateReview.mutate({ id, status: 'submitted', completed_at: new Date().toISOString() });
  };

  const reviewList = reviews.data || [];
  const draftCount = reviewList.filter(r => r.status === 'draft').length;
  const submittedCount = reviewList.filter(r => r.status === 'submitted').length;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Performance Reviews"
          description="Structured reviews with goals and ratings"
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />New Review</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Performance Review</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div>
                    <Label>Employee</Label>
                    <Select value={form.user_id} onValueChange={v => setForm(f => ({ ...f, user_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {teamMembers?.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.display_name || m.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Review Type</Label>
                    <Select value={form.review_type} onValueChange={v => setForm(f => ({ ...f, review_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Period Start</Label><Input type="date" value={form.review_period_start} onChange={e => setForm(f => ({ ...f, review_period_start: e.target.value }))} /></div>
                    <div><Label>Period End</Label><Input type="date" value={form.review_period_end} onChange={e => setForm(f => ({ ...f, review_period_end: e.target.value }))} /></div>
                  </div>
                  <div>
                    <Label>Overall Rating (1–5)</Label>
                    <Select value={form.overall_rating} onValueChange={v => setForm(f => ({ ...f, overall_rating: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} Star{n > 1 ? 's' : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Strengths</Label><Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} /></div>
                  <div><Label>Areas for Improvement</Label><Textarea value={form.areas_for_improvement} onChange={e => setForm(f => ({ ...f, areas_for_improvement: e.target.value }))} /></div>
                  <div><Label>Goals</Label><Textarea value={form.goals_summary} onChange={e => setForm(f => ({ ...f, goals_summary: e.target.value }))} /></div>
                  <div><Label>Reviewer Notes</Label><Textarea value={form.reviewer_notes} onChange={e => setForm(f => ({ ...f, reviewer_notes: e.target.value }))} /></div>
                  <Button onClick={handleSubmit} disabled={createReview.isPending} className="w-full">
                    {createReview.isPending ? 'Creating...' : 'Create Review (Draft)'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-4 flex items-center gap-3"><FileCheck className="w-8 h-8 text-primary" /><div><p className="text-2xl font-medium">{reviewList.length}</p><p className="text-sm text-muted-foreground">Total Reviews</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="w-8 h-8 text-amber-500" /><div><p className="text-2xl font-medium">{draftCount}</p><p className="text-sm text-muted-foreground">Drafts</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle className="w-8 h-8 text-emerald-500" /><div><p className="text-2xl font-medium">{submittedCount}</p><p className="text-sm text-muted-foreground">Pending Acknowledgment</p></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Reviews</CardTitle></CardHeader>
          <CardContent>
            {reviewList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No performance reviews yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewList.map(review => {
                    const statusCfg = STATUS_CONFIG[review.status] || STATUS_CONFIG.draft;
                    return (
                      <TableRow key={review.id}>
                        <TableCell><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></TableCell>
                        <TableCell>{REVIEW_TYPES.find(t => t.value === review.review_type)?.label || review.review_type}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {review.review_period_start && review.review_period_end
                            ? `${formatDate(parseISO(review.review_period_start), 'MMM yyyy')} – ${formatDate(parseISO(review.review_period_end), 'MMM yyyy')}`
                            : '—'}
                        </TableCell>
                        <TableCell><RatingStars rating={review.overall_rating} /></TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(parseISO(review.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {review.status === 'draft' && (
                            <Button size={tokens.button.inline} variant="outline" onClick={() => handleSubmitReview(review.id)}>Submit</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
