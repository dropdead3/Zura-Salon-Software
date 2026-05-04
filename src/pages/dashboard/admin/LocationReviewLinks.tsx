import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useLocations } from '@/hooks/useLocations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocationReviewLinks, useUpsertLocationReviewLink, LocationReviewLink } from '@/hooks/useLocationReviewLinks';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { ComplianceBanner } from '@/components/feedback/ComplianceBanner';

const FIELDS: { key: keyof LocationReviewLink; label: string; placeholder: string }[] = [
  { key: 'google_review_url', label: 'Google Review URL', placeholder: 'https://g.page/r/...' },
  { key: 'apple_review_url', label: 'Apple Maps / Business URL', placeholder: 'https://maps.apple.com/...' },
  { key: 'yelp_review_url', label: 'Yelp Profile URL', placeholder: 'https://www.yelp.com/biz/...' },
  { key: 'facebook_review_url', label: 'Facebook Reviews URL', placeholder: 'https://www.facebook.com/.../reviews' },
  { key: 'custom_review_url', label: 'Custom Review URL (optional)', placeholder: 'https://...' },
];

function LocationCard({ location }: { location: { id: string; name: string } }) {
  const { effectiveOrganization } = useOrganizationContext();
  const { data: links } = useLocationReviewLinks();
  const upsert = useUpsertLocationReviewLink();
  const existing = links?.find((l) => l.location_id === location.id);

  const [draft, setDraft] = useState<LocationReviewLink>({
    organization_id: effectiveOrganization?.id ?? '',
    location_id: location.id,
    google_review_url: '', apple_review_url: '', yelp_review_url: '',
    facebook_review_url: '', custom_review_url: '', custom_review_label: '',
    default_platform_priority: ['google', 'apple', 'yelp', 'facebook'],
  });

  useEffect(() => {
    if (existing) setDraft(existing);
  }, [existing]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base tracking-wide">{location.name}</CardTitle>
        <CardDescription>Falls back to organization defaults when blank.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label>{f.label}</Label>
            <Input
              value={(draft[f.key] as string) ?? ''}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              placeholder={f.placeholder}
            />
          </div>
        ))}
        <div className="flex justify-end">
          <Button onClick={() => upsert.mutate(draft)} disabled={upsert.isPending}>
            Save Links
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LocationReviewLinks() {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations } = useLocations(effectiveOrganization?.id);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Location Review Links"
          description="Set Google, Apple, Yelp, and Facebook review URLs per location. Used when sending review requests to clients."
          backTo={dashPath('/admin/feedback')}
          backLabel="Back to Client Reputation"
        />
        <ComplianceBanner />
        <div className="grid gap-6 lg:grid-cols-2">
          {(locations ?? []).filter((l) => l.is_active !== false).map((loc) => (
            <LocationCard key={loc.id} location={{ id: loc.id, name: loc.name }} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
