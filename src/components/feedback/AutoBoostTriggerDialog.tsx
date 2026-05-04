/**
 * AutoBoostTriggerDialog — Phorest-style "Triggers to prompt a review" config.
 * Stores config under site_settings.id = 'review_auto_boost_config' (read-then-
 * update/insert, per Site Settings Persistence canon).
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';

const SETTING_ID = 'review_auto_boost_config';

interface AutoBoostConfig {
  enabled: boolean;
  promptAfterNReviews: number;
  minStarThreshold: number;
  customMessage: string;
}

const DEFAULTS: AutoBoostConfig = {
  enabled: false,
  promptAfterNReviews: 1,
  minStarThreshold: 5,
  customMessage:
    "We'd love if you took 30 seconds to post this review to our page below. We've copied your review for you, just click paste!\n\nThanks in advance",
};

export function useAutoBoostConfig() {
  const orgId = useSettingsOrgId();
  return useQuery({
    queryKey: ['site-settings', orgId, SETTING_ID],
    enabled: !!orgId,
    queryFn: async (): Promise<AutoBoostConfig> => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', SETTING_ID)
        .eq('organization_id', orgId!)
        .maybeSingle();
      if (error) throw error;
      const value = (data?.value as Partial<AutoBoostConfig> | null) ?? null;
      return { ...DEFAULTS, ...(value ?? {}) };
    },
  });
}

interface AutoBoostTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutoBoostTriggerDialog({ open, onOpenChange }: AutoBoostTriggerDialogProps) {
  const orgId = useSettingsOrgId();
  const qc = useQueryClient();
  const { data: config } = useAutoBoostConfig();
  const [draft, setDraft] = useState<AutoBoostConfig>(DEFAULTS);

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization');
      const { data: { user } } = await supabase.auth.getUser();
      // Read-then-update/insert per Site Settings Persistence canon
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('id', SETTING_ID)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: draft as never, updated_by: user?.id })
          .eq('id', SETTING_ID)
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('site_settings').insert({
          id: SETTING_ID,
          organization_id: orgId,
          value: draft as never,
          updated_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-settings', orgId, SETTING_ID] });
      toast.success('Auto-boost triggers saved');
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">
            Triggers to prompt a review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">Ask for an online review</span>
            <Select
              value={String(draft.promptAfterNReviews)}
              onValueChange={(v) => setDraft({ ...draft, promptAfterNReviews: Number(v) })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
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
              value={String(draft.minStarThreshold)}
              onValueChange={(v) => setDraft({ ...draft, minStarThreshold: Number(v) })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} stars
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Add a custom message</Label>
            <Textarea
              rows={6}
              value={draft.customMessage}
              onChange={(e) => setDraft({ ...draft, customMessage: e.target.value })}
              className={tokens.input.multilineShape}
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            Auto-boost asks happy clients to repost their review on Google / Facebook.
            Negative feedback is never auto-routed to public platforms — that stays in the
            Recovery Inbox per the Reputation Engine doctrine.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
