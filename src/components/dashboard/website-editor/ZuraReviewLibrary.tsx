/**
 * Zura Review Library — drawer that surfaces eligible 5-star reviews from the
 * Reputation Engine and lets the operator curate, edit-for-display, feature,
 * hide, and unpublish them onto the salon website.
 *
 * Original review text (`client_feedback_responses.comments`) is never
 * mutated; edits live on the linked `website_testimonials.body` with a
 * `display_edited` indicator and `original_body` snapshot for audit.
 */
import { useMemo, useState } from 'react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Search,
  Star,
  ShieldAlert,
  Pin,
  EyeOff,
  Pencil,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  useEligibleReviews,
  useCurateReview,
  useUnpublishReview,
  useFeatureReview,
  useUpdateDisplayCopy,
  useHideReview,
  type EligibleReview,
  type EligibleReviewFilters,
} from '@/hooks/useEligibleReviews';
import { resolveReviewDisplayName } from '@/lib/reviewDisplayName';
import { toast } from 'sonner';

interface ZuraReviewLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Bucket = NonNullable<EligibleReviewFilters['bucket']>;

export function ZuraReviewLibrary({ open, onOpenChange }: ZuraReviewLibraryProps) {
  const [bucket, setBucket] = useState<Bucket>('eligible');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [consentTarget, setConsentTarget] = useState<EligibleReview | null>(null);

  const { data: rows = [], isLoading } = useEligibleReviews({ bucket, search });
  const curate = useCurateReview();
  const unpublish = useUnpublishReview();
  const feature = useFeatureReview();
  const updateCopy = useUpdateDisplayCopy();
  const hide = useHideReview();

  const counts = useMemo(() => {
    return {
      eligible: rows.filter((r) => !r.website_testimonial_id).length,
      curated: rows.filter((r) => r.website_testimonial_id && r.published).length,
      hidden: rows.filter((r) => r.website_testimonial_id && !r.published).length,
    };
  }, [rows]);

  const handleCurate = (row: EligibleReview) => {
    if (!row.display_consent) {
      setConsentTarget(row);
      return;
    }
    curate.mutate(
      { response: row },
      { onSuccess: () => toast.success('Added to website') },
    );
  };

  return (
    <>
      <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="min(880px, 92vw)">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-base tracking-wide uppercase">
                  Zura Review Library
                </h2>
                <p className="text-xs text-muted-foreground font-sans">
                  Curate consent-approved 5-star reviews onto your website.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="p-6 pb-4 space-y-4 border-b border-border/40">
            <Tabs value={bucket} onValueChange={(v) => setBucket(v as Bucket)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="eligible">
                  Eligible <span className="ml-1.5 text-muted-foreground">{counts.eligible}</span>
                </TabsTrigger>
                <TabsTrigger value="curated">
                  Published <span className="ml-1.5 text-muted-foreground">{counts.curated}</span>
                </TabsTrigger>
                <TabsTrigger value="hidden">
                  Unpublished <span className="ml-1.5 text-muted-foreground">{counts.hidden}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reviews by client or keyword…"
                className="pl-9"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState bucket={bucket} />
            ) : (
              rows.map((row) => (
                <ReviewRow
                  key={row.response_id}
                  row={row}
                  isEditing={editingId === row.response_id}
                  onStartEdit={() => setEditingId(row.response_id)}
                  onCancelEdit={() => setEditingId(null)}
                  onCurate={() => handleCurate(row)}
                  onUnpublish={() =>
                    row.website_testimonial_id &&
                    unpublish.mutate({
                      testimonialId: row.website_testimonial_id,
                      responseId: row.response_id,
                    })
                  }
                  onHide={() => hide.mutate({ responseId: row.response_id })}
                  onFeature={(featured) =>
                    row.website_testimonial_id &&
                    feature.mutate({
                      testimonialId: row.website_testimonial_id,
                      isFeatured: featured,
                    })
                  }
                  onSaveDisplay={(body) => {
                    if (!row.website_testimonial_id) return;
                    updateCopy.mutate(
                      { testimonialId: row.website_testimonial_id, body },
                      { onSuccess: () => setEditingId(null) },
                    );
                  }}
                  pending={
                    curate.isPending ||
                    unpublish.isPending ||
                    feature.isPending ||
                    updateCopy.isPending ||
                    hide.isPending
                  }
                />
              ))
            )}
          </div>
        </div>
      </PremiumFloatingPanel>

      {/* Consent override dialog (modal-on-modal) */}
      {consentTarget && (
        <ConsentOverrideSheet
          row={consentTarget}
          onCancel={() => setConsentTarget(null)}
          onConfirm={(attestation) => {
            curate.mutate(
              { response: consentTarget, consentOverride: { attestation } },
              {
                onSuccess: () => {
                  toast.success('Added to website (consent override recorded)');
                  setConsentTarget(null);
                },
              },
            );
          }}
          pending={curate.isPending}
        />
      )}
    </>
  );
}

type PlacementScope = 'homepage' | 'service_pages' | 'stylist_pages';
const PLACEMENT_SCOPES: { value: PlacementScope; label: string }[] = [
  { value: 'homepage', label: 'Homepage' },
  { value: 'service_pages', label: 'Service pages' },
  { value: 'stylist_pages', label: 'Stylist pages' },
];

interface ReviewRowProps {
  row: EligibleReview;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onCurate: () => void;
  onUnpublish: () => void;
  onHide: () => void;
  onFeature: (featured: boolean, scopes?: PlacementScope[]) => void;
  onSaveDisplay: (body: string) => void;
  pending: boolean;
}

function ReviewRow({
  row,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onCurate,
  onUnpublish,
  onHide,
  onFeature,
  onSaveDisplay,
  pending,
}: ReviewRowProps) {
  const [draft, setDraft] = useState(row.comments ?? '');
  const isCurated = !!row.website_testimonial_id;
  const displayName = resolveReviewDisplayName({
    preference: row.display_name_preference,
    firstName: row.client_first_name,
    lastName: row.client_last_name,
  });

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 transition-colors',
        isCurated && 'border-border/70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  'w-3.5 h-3.5',
                  s <= (row.overall_rating ?? 0)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/30',
                )}
              />
            ))}
          </div>
          <span className="font-sans text-sm text-foreground">{displayName}</span>
          {row.responded_at && (
            <span className="font-sans text-xs text-muted-foreground">
              · {format(new Date(row.responded_at), 'MMM d, yyyy')}
            </span>
          )}
          {!row.display_consent && (
            <Badge variant="outline" className="gap-1 text-xs">
              <ShieldAlert className="w-3 h-3" />
              Needs consent
            </Badge>
          )}
          {row.is_featured && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Pin className="w-3 h-3" />
              Featured
            </Badge>
          )}
          {isCurated && row.published && (
            <Badge variant="default" className="gap-1 text-xs">
              <CheckCircle2 className="w-3 h-3" />
              Live
            </Badge>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Label className="text-xs font-sans text-muted-foreground">
            Display copy (original review preserved)
          </Label>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground italic">
            Original: "{row.comments}"
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSaveDisplay(draft)} disabled={pending}>
              Save display copy
            </Button>
          </div>
        </div>
      ) : (
        <p className="font-sans text-sm text-foreground/85 leading-relaxed">
          "{row.comments}"
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
        <div className="flex items-center gap-2">
          {isCurated ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onStartEdit}
                disabled={isEditing || pending}
                className="gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit display
              </Button>
              <div className="flex items-center gap-2 pl-2">
                <Switch
                  id={`feat-${row.response_id}`}
                  checked={row.is_featured ?? false}
                  onCheckedChange={(v) => onFeature(!!v)}
                />
                <Label
                  htmlFor={`feat-${row.response_id}`}
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Featured
                </Label>
              </div>
              {row.is_featured && (
                <div className="flex items-center gap-1 pl-1 flex-wrap">
                  {PLACEMENT_SCOPES.map((scope) => {
                    const current = (row.feature_scopes ?? []) as PlacementScope[];
                    const active = current.includes(scope.value);
                    return (
                      <button
                        key={scope.value}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const next = active
                            ? current.filter((s) => s !== scope.value)
                            : [...current, scope.value];
                          // Doctrine: featured review must surface somewhere — keep at least homepage.
                          onFeature(true, next.length > 0 ? next : ['homepage']);
                        }}
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-sans border transition-colors',
                          active
                            ? 'bg-primary/15 border-primary/40 text-foreground'
                            : 'border-border/50 text-muted-foreground hover:bg-muted/40',
                        )}
                      >
                        {scope.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onHide}
              disabled={pending}
              className="gap-1.5 text-muted-foreground"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Hide from library
            </Button>
          )}
        </div>

        {isCurated ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onUnpublish}
            disabled={pending}
            className="gap-1.5"
          >
            Unpublish
          </Button>
        ) : (
          <Button size="sm" onClick={onCurate} disabled={pending} className="gap-1.5">
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Add to website
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ bucket }: { bucket: Bucket }) {
  const messages: Record<Bucket, { title: string; body: string }> = {
    eligible: {
      title: 'No eligible reviews yet',
      body: 'Send feedback requests to recent clients. 5-star reviews with written feedback will land here automatically.',
    },
    curated: {
      title: 'No reviews published yet',
      body: 'Curate from the Eligible tab to publish reviews to your website.',
    },
    hidden: { title: 'Nothing unpublished', body: 'Reviews you take down will appear here.' },
    all: { title: 'No reviews', body: '' },
  };
  const msg = messages[bucket];
  return (
    <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-xl">
      <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
      <p className="font-display text-sm tracking-wide uppercase mb-1.5">{msg.title}</p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto font-sans">{msg.body}</p>
    </div>
  );
}

interface ConsentOverrideProps {
  row: EligibleReview;
  onCancel: () => void;
  onConfirm: (attestation: string) => void;
  pending: boolean;
}

function ConsentOverrideSheet({ row, onCancel, onConfirm, pending }: ConsentOverrideProps) {
  const [attestation, setAttestation] = useState('');
  const valid = attestation.trim().length >= 10;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-display text-base tracking-wide uppercase">
              Consent Override
            </h3>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              This client did not check the website-display consent box on their
              feedback form. Confirm you have written or recorded permission to
              publish their review.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm font-sans text-foreground/80 italic">
          "{row.comments}"
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-sans text-muted-foreground">
            How was consent captured? (required, min 10 characters)
          </Label>
          <Textarea
            value={attestation}
            onChange={(e) => setAttestation(e.target.value)}
            placeholder="e.g. Verbal consent confirmed on May 3 by Jamie at front desk"
            rows={3}
            className="resize-y"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(attestation.trim())}
            disabled={!valid || pending}
            className="gap-1.5"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Confirm &amp; publish
          </Button>
        </div>
      </div>
    </div>
  );
}

// re-export for tests
export { tokens as __tokens };
