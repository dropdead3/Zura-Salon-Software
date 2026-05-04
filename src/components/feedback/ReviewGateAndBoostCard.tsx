/**
 * ReviewGateAndBoostCard — Consolidated review-gate + auto-boost settings.
 *
 * Replaces the previously stacked "Auto-Boost Triggers" card + "Review Gate
 * Settings" card on the Reputation Settings tab. Single form, single Save,
 * single source of truth in the operator's mental model: "when do we ask,
 * who do we route to public platforms, and what do they see."
 *
 * Persistence:
 * - Threshold/links/copy/follow-up → public.review_threshold_settings (via
 *   useReviewThresholdSettings hook).
 * - Auto-boost cadence/message → site_settings (id = review_auto_boost_config),
 *   read-then-update/insert per Site Settings Persistence canon.
 *
 * Doctrine guards (Reputation Engine, Non-Gating):
 * - Public platform links are never hidden based on rating; only the framing
 *   shifts. Auto-Boost only adjusts emphasis + cadence — never gates the share
 *   surface.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Star, Link as LinkIcon, Bell, Loader2, Zap } from 'lucide-react';
import {
  useReviewThresholdSettings,
  useUpdateReviewThresholdSettings,
  ReviewThresholdSettings as ReviewSettings,
} from '@/hooks/useReviewThreshold';
import { useAutoBoostConfig } from './AutoBoostTriggerDialog';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';

const AUTO_BOOST_SETTING_ID = 'review_auto_boost_config';

interface AutoBoostDraft {
  enabled: boolean;
  promptAfterNReviews: number;
  minStarThreshold: number;
  customMessage: string;
}

export function ReviewGateAndBoostCard() {
  const orgId = useSettingsOrgId();
  const qc = useQueryClient();
  const { data: thresholdSettings, isLoading: loadingThreshold } = useReviewThresholdSettings();
  const { data: autoBoost, isLoading: loadingBoost } = useAutoBoostConfig();
  const updateThreshold = useUpdateReviewThresholdSettings();

  const [thresholdDraft, setThresholdDraft] = useState<ReviewSettings | null>(null);
  const [boostDraft, setBoostDraft] = useState<AutoBoostDraft | null>(null);

  useEffect(() => { if (thresholdSettings) setThresholdDraft(thresholdSettings); }, [thresholdSettings]);
  useEffect(() => { if (autoBoost) setBoostDraft(autoBoost); }, [autoBoost]);

  const saveBoost = useMutation({
    mutationFn: async (draft: AutoBoostDraft) => {
      if (!orgId) throw new Error('No organization');
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('id', AUTO_BOOST_SETTING_ID)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: draft as never, updated_by: user?.id })
          .eq('id', AUTO_BOOST_SETTING_ID)
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('site_settings').insert({
          id: AUTO_BOOST_SETTING_ID,
          organization_id: orgId,
          value: draft as never,
          updated_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-settings', orgId, AUTO_BOOST_SETTING_ID] }),
  });

  const handleSave = async () => {
    if (!thresholdDraft || !boostDraft) return;
    try {
      await Promise.all([
        updateThreshold.mutateAsync(thresholdDraft),
        saveBoost.mutateAsync(boostDraft),
      ]);
      toast.success('Reputation settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    }
  };

  if (loadingThreshold || loadingBoost || !thresholdDraft || !boostDraft) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isSaving = updateThreshold.isPending || saveBoost.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Review Gate &amp; Auto-Boost</CardTitle>
            <CardDescription className="mt-1">
              Define the threshold for routing happy clients to public platforms, and how often we ask.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* 1. Gate threshold */}
        <section className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Gate Threshold
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Minimum Overall Rating</Label>
              <Select
                value={String(thresholdDraft.minimumOverallRating)}
                onValueChange={(v) => setThresholdDraft({ ...thresholdDraft, minimumOverallRating: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {'★'.repeat(n)}{'☆'.repeat(5 - n)} {n} star{n > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Show celebratory public-share UI at or above this rating.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Minimum NPS Score</Label>
              <Select
                value={String(thresholdDraft.minimumNPSScore)}
                onValueChange={(v) => setThresholdDraft({ ...thresholdDraft, minimumNPSScore: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} - {n >= 9 ? 'Promoter' : n >= 7 ? 'Passive' : 'Detractor'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Both to Pass</Label>
              <p className="text-xs text-muted-foreground">
                Customer must meet both rating AND NPS thresholds.
              </p>
            </div>
            <Switch
              checked={thresholdDraft.requireBothToPass}
              onCheckedChange={(v) => setThresholdDraft({ ...thresholdDraft, requireBothToPass: v })}
            />
          </div>
        </section>

        {/* 2. Auto-Boost cadence */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Auto-Boost Cadence
            </h4>
            <Switch
              checked={boostDraft.enabled}
              onCheckedChange={(v) => setBoostDraft({ ...boostDraft, enabled: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            When on, qualifying clients see a celebratory share prompt. Negative feedback is never auto-routed to public platforms — that stays in the Recovery Inbox.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">Ask</span>
            <Select
              value={String(boostDraft.promptAfterNReviews)}
              onValueChange={(v) => setBoostDraft({ ...boostDraft, promptAfterNReviews: Number(v) })}
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    after {n} review{n === 1 ? '' : 's'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">of at least</span>
            <Select
              value={String(boostDraft.minStarThreshold)}
              onValueChange={(v) => setBoostDraft({ ...boostDraft, minStarThreshold: Number(v) })}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 4, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} stars</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Celebratory message</Label>
            <Textarea
              rows={5}
              value={boostDraft.customMessage}
              onChange={(e) => setBoostDraft({ ...boostDraft, customMessage: e.target.value })}
              className={tokens.input.multilineShape}
            />
          </div>
        </section>

        {/* 3. Platform links */}
        <section className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-blue-500" />
            Public Platform Links
          </h4>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Google Reviews URL</Label>
              <Input
                placeholder="https://g.page/r/..."
                value={thresholdDraft.googleReviewUrl}
                onChange={(e) => setThresholdDraft({ ...thresholdDraft, googleReviewUrl: e.target.value })}
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-2">
              <Label>Apple Maps URL</Label>
              <Input
                placeholder="https://maps.apple.com/..."
                value={thresholdDraft.appleReviewUrl}
                onChange={(e) => setThresholdDraft({ ...thresholdDraft, appleReviewUrl: e.target.value })}
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook URL (optional)</Label>
              <Input
                placeholder="https://www.facebook.com/..."
                value={thresholdDraft.facebookReviewUrl}
                onChange={(e) => setThresholdDraft({ ...thresholdDraft, facebookReviewUrl: e.target.value })}
                autoCapitalize="none"
              />
            </div>
          </div>
        </section>

        {/* 4. Prompt copy */}
        <section className="space-y-4">
          <h4 className="font-medium">Prompt Copy</h4>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={thresholdDraft.publicReviewPromptTitle}
                onChange={(e) => setThresholdDraft({ ...thresholdDraft, publicReviewPromptTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Input
                value={thresholdDraft.publicReviewPromptMessage}
                onChange={(e) => setThresholdDraft({ ...thresholdDraft, publicReviewPromptMessage: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* 5. Low-score alerts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-red-500" />
              Low-Score Alerts
            </h4>
            <Switch
              checked={thresholdDraft.privateFollowUpEnabled}
              onCheckedChange={(v) => setThresholdDraft({ ...thresholdDraft, privateFollowUpEnabled: v })}
            />
          </div>
          {thresholdDraft.privateFollowUpEnabled && (
            <div className="space-y-2">
              <Label>Alert when rating at or below</Label>
              <Select
                value={String(thresholdDraft.privateFollowUpThreshold)}
                onValueChange={(v) => setThresholdDraft({ ...thresholdDraft, privateFollowUpThreshold: Number(v) })}
              >
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {'★'.repeat(n)}{'☆'.repeat(5 - n)} {n} star{n > 1 ? 's' : ''} or below
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </section>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
          ) : (
            'Save Reputation Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
