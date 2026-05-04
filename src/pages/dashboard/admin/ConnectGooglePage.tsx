/**
 * ConnectGooglePage — GBP-to-location mapping picker.
 *
 * Operator lands here from `reputation-google-oauth-callback?nonce=...`. We
 * fetch the staged GBP discovery, render a row per Zura location with a
 * dropdown of available GBPs, and submit via `reputation-google-finalize-mapping`.
 *
 * Per Hub Landings doctrine: this page is only reachable via the OAuth
 * callback deep-link — never from sidebar navigation.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';

interface DiscoveredGBP {
  place_id: string;
  account_id: string;
  title: string;
  address?: string;
}
interface ZuraLocation { id: string; name: string }
interface PendingPayload {
  google_account_label: string | null;
  discovered_locations: DiscoveredGBP[];
  zura_locations: ZuraLocation[];
  existing_mappings: Array<{ location_id: string | null; place_id: string | null }>;
}

export default function ConnectGooglePage() {
  const [params] = useSearchParams();
  const nonce = params.get('nonce');
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<PendingPayload | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({}); // location_id -> place_id

  useEffect(() => {
    if (!nonce) { setLoading(false); return; }
    (async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke(
          'reputation-google-fetch-pending-mapping',
          { body: { nonce } },
        );
        if (error) throw error;
        setData(res);
        // Pre-fill from existing mappings + name similarity
        const initial: Record<string, string> = {};
        for (const loc of res.zura_locations as ZuraLocation[]) {
          const existing = res.existing_mappings.find((m: any) => m.location_id === loc.id && m.place_id);
          if (existing?.place_id) { initial[loc.id] = existing.place_id; continue; }
          const match = (res.discovered_locations as DiscoveredGBP[]).find((g) =>
            g.title.toLowerCase().includes(loc.name.toLowerCase()) ||
            loc.name.toLowerCase().includes(g.title.toLowerCase())
          );
          if (match) initial[loc.id] = match.place_id;
        }
        setMappings(initial);
      } catch (e) {
        console.error(e);
        toast.error('Could not load Google mapping. Please reconnect.');
      } finally {
        setLoading(false);
      }
    })();
  }, [nonce]);

  const selectedCount = useMemo(
    () => Object.values(mappings).filter((v) => v && v !== '__none__').length,
    [mappings],
  );

  const handleSubmit = async () => {
    if (!nonce) return;
    const list = Object.entries(mappings)
      .filter(([, place_id]) => place_id && place_id !== '__none__')
      .map(([location_id, place_id]) => ({ location_id, place_id }));
    if (list.length === 0) {
      toast.error('Map at least one location to continue.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke(
        'reputation-google-finalize-mapping',
        { body: { nonce, mappings: list } },
      );
      if (error) throw error;
      toast.success(`Connected ${list.length} location${list.length === 1 ? '' : 's'} to Google.`);
      navigate(dashPath('/admin/feedback') + '?google_connected=1');
    } catch (e) {
      console.error(e);
      toast.error('Could not save mappings. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!nonce) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
          <DashboardPageHeader
            title="Connect Google"
            description="No connection in progress. Start from Online Reputation."
            backTo={dashPath('/admin/feedback')}
            backLabel="Back to Online Reputation"
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <DashboardPageHeader
          title="Map Google Profiles to Locations"
          description={data?.google_account_label
            ? `Signed in as ${data.google_account_label}. Pick which Google Business Profile belongs to each Zura location.`
            : 'Pick which Google Business Profile belongs to each Zura location.'}
          backTo={dashPath('/admin/feedback')}
          backLabel="Back to Online Reputation"
        />

        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        )}

        {!loading && data && (
          <>
            {data.discovered_locations.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base tracking-wide">No verified Business Profiles found</CardTitle>
                  <CardDescription>
                    The Google account you signed in with doesn't manage any verified Business Profiles, or
                    we couldn't list them. Make sure the right account is signed in, or paste your review URL
                    manually under Location Review Links.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {data.discovered_locations.length > 0 && data.zura_locations.map((loc) => (
              <Card key={loc.id}>
                <CardHeader>
                  <CardTitle className="font-display text-base tracking-wide">{loc.name}</CardTitle>
                  <CardDescription>Choose the Google Business Profile that represents this location.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={mappings[loc.id] ?? '__none__'}
                    onValueChange={(v) => setMappings({ ...mappings, [loc.id]: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Pick a Google Business Profile" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Skip (no Google for this location)</SelectItem>
                      {data.discovered_locations.map((g) => (
                        <SelectItem key={g.place_id} value={g.place_id}>
                          {g.title}{g.address ? ` · ${g.address}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => navigate(dashPath('/admin/feedback'))}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || selectedCount === 0}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {selectedCount > 0 ? `Connect ${selectedCount} location${selectedCount === 1 ? '' : 's'}` : 'Pick at least one location'}
                {!submitting && selectedCount > 0 && <CheckCircle2 className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
