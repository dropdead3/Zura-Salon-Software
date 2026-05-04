import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { ComplianceBanner } from '@/components/feedback/ComplianceBanner';
import { ReviewResponseTemplateLibrary } from '@/components/feedback/ReviewResponseTemplateLibrary';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const TEMPLATE_KEY = 'review_request_default';

export default function ReviewTemplates() {
  const { dashPath } = useOrgDashboardPath();
  const qc = useQueryClient();

  const { data: tpl } = useQuery({
    queryKey: ['sms-template', TEMPLATE_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_templates' as any)
        .select('*')
        .eq('template_key', TEMPLATE_KEY)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [body, setBody] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (tpl) {
      setBody(tpl.message_body ?? '');
      setActive(tpl.is_active ?? true);
    }
  }, [tpl]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sms_templates' as any)
        .update({ message_body: body, is_active: active })
        .eq('template_key', TEMPLATE_KEY);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms-template', TEMPLATE_KEY] });
      toast.success('Template saved');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Save failed'),
  });

  const variables: string[] = tpl?.variables ?? ['client_first_name', 'business_name', 'feedback_url'];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Review Request Templates"
          description="Edit the SMS the dispatcher sends after eligible appointments. Variables are interpolated at send time."
          backTo={dashPath('/admin/feedback')}
          backLabel="Back to Online Reputation"
        />
        <ComplianceBanner />

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base tracking-wide flex items-center gap-3">
              Default Review Request (SMS)
              {active ? <Badge>Active</Badge> : <Badge variant="secondary">Paused</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Message body</Label>
              <Textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hi {{client_first_name}}, thanks for visiting {{business_name}}! We'd love your feedback: {{feedback_url}}"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {variables.map((v) => (
                  <Badge key={v} variant="outline" className="font-mono text-xs">{`{{${v}}}`}</Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <Label htmlFor="tpl-active">Active</Label>
              <Switch id="tpl-active" checked={active} onCheckedChange={setActive} />
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              The dispatcher runs hourly. Feedback links are never gated by rating —
              every client receives the same outreach regardless of expected sentiment.
            </div>

            <div className="flex justify-end">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <ReviewResponseTemplateLibrary />
      </div>
    </DashboardLayout>
  );
}
