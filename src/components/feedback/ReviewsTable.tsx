/**
 * ReviewsTable — Phorest-style filterable post-visit review table.
 * Columns: Date · Client · Staff · Services · Rating · Review · Action (Share)
 * Filters: Search (client name) · Staff dropdown · Rating dropdown
 *
 * Data source: client_feedback_responses (first-party) joined client-side with
 * employee_profiles (staff names) and clients (client names) via batched lookups.
 * Selfie column is Phase 2 — schema doesn't carry selfie_url yet.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Search, Share2 } from 'lucide-react';
import { useFeedbackResponses, type FeedbackResponse } from '@/hooks/useFeedbackSurveys';
import { useFormatDate } from '@/hooks/useFormatDate';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/lib/design-tokens';
import { ShareReviewDialog, type ShareableReview } from './ShareReviewDialog';

interface ReviewsTableProps {
  organizationId?: string;
  limit?: number;
}

interface NameMaps {
  staff: Map<string, string>;
  clients: Map<string, string>;
}

function StarRow({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export function ReviewsTable({ organizationId, limit = 200 }: ReviewsTableProps) {
  const { data: responses, isLoading } = useFeedbackResponses(organizationId, limit);
  const { formatDate } = useFormatDate();

  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [shareTarget, setShareTarget] = useState<ShareableReview | null>(null);

  const ids = useMemo(() => {
    const staff = new Set<string>();
    const clients = new Set<string>();
    (responses ?? []).forEach((r) => {
      if (r.staff_user_id) staff.add(r.staff_user_id);
      if (r.client_id) clients.add(r.client_id);
    });
    return { staff: Array.from(staff), clients: Array.from(clients) };
  }, [responses]);

  const { data: nameMaps } = useQuery({
    queryKey: ['reviews-table-names', organizationId, ids.staff.length, ids.clients.length],
    enabled: !!responses && responses.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<NameMaps> => {
      const [staffRes, clientRes] = await Promise.all([
        ids.staff.length
          ? supabase
              .from('employee_profiles')
              .select('user_id, full_name, display_name')
              .in('user_id', ids.staff)
          : Promise.resolve({ data: [] as Array<{ user_id: string; full_name: string | null; display_name: string | null }> }),
        ids.clients.length
          ? supabase
              .from('clients')
              .select('id, first_name, last_name')
              .in('id', ids.clients)
          : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> }),
      ]);
      const staff = new Map<string, string>();
      (staffRes.data ?? []).forEach((p) => {
        staff.set(p.user_id, p.display_name || p.full_name || 'Staff');
      });
      const clients = new Map<string, string>();
      (clientRes.data ?? []).forEach((c) => {
        const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
        clients.set(c.id, name || 'Client');
      });
      return { staff, clients };
    },
  });

  const staffOptions = useMemo(() => {
    if (!nameMaps) return [];
    return Array.from(nameMaps.staff.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nameMaps]);

  const filtered = useMemo(() => {
    if (!responses) return [];
    const q = search.trim().toLowerCase();
    return responses.filter((r) => {
      if (staffFilter !== 'all' && r.staff_user_id !== staffFilter) return false;
      if (ratingFilter !== 'all' && String(r.overall_rating ?? '') !== ratingFilter) return false;
      if (q) {
        const clientName = r.client_id ? nameMaps?.clients.get(r.client_id) ?? '' : '';
        if (!clientName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [responses, search, staffFilter, ratingFilter, nameMaps]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className={tokens.loading.skeleton} />
          ))}
        </CardContent>
      </Card>
    );
  }

  const buildShareable = (r: FeedbackResponse): ShareableReview => {
    const fullName = r.client_id ? nameMaps?.clients.get(r.client_id) : null;
    return {
      rating: r.overall_rating,
      comments: r.comments,
      clientFirstName: fullName ? fullName.split(' ')[0] : null,
      staffName: r.staff_user_id ? nameMaps?.staff.get(r.staff_user_id) ?? null : null,
      serviceLabel: null,
      date: r.responded_at ? formatDate(new Date(r.responded_at), 'MMM d, yyyy') : null,
    };
  };

  return (
    <>
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client name"
                className="pl-9"
              />
            </div>
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {staffOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} star{n === 1 ? '' : 's'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className={`${tokens.table.columnHeader} px-3 py-2`}>Date</th>
                  <th className={`${tokens.table.columnHeader} px-3 py-2`}>Client</th>
                  <th className={`${tokens.table.columnHeader} px-3 py-2`}>Staff</th>
                  <th className={`${tokens.table.columnHeader} px-3 py-2`}>Rating</th>
                  <th className={`${tokens.table.columnHeader} px-3 py-2`}>Review</th>
                  <th className={`${tokens.table.columnHeader} px-3 py-2 w-24`}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
                      No reviews match the current filters
                    </td>
                  </tr>
                )}
                {filtered.map((r) => {
                  const clientName = r.client_id
                    ? nameMaps?.clients.get(r.client_id) ?? '—'
                    : '—';
                  const staffName = r.staff_user_id
                    ? nameMaps?.staff.get(r.staff_user_id) ?? '—'
                    : '—';
                  return (
                    <tr key={r.id} className="border-t border-border/60 align-top">
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                        {r.responded_at && formatDate(new Date(r.responded_at), 'M/d/yyyy')}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{clientName}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{staffName}</td>
                      <td className="px-3 py-3"><StarRow rating={r.overall_rating} /></td>
                      <td className="px-3 py-3 max-w-md">
                        {r.comments ? (
                          <span className="line-clamp-2 text-foreground/90">{r.comments}</span>
                        ) : (
                          <Badge variant="outline" className="text-xs">No comment</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {r.comments && (
                          <Button
                            variant="ghost"
                            size={tokens.button.inline}
                            className="gap-1.5"
                            onClick={() => setShareTarget(buildShareable(r))}
                          >
                            <Share2 className="h-3.5 w-3.5" /> Share
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ShareReviewDialog
        review={shareTarget}
        open={!!shareTarget}
        onOpenChange={(o) => !o && setShareTarget(null)}
      />
    </>
  );
}
