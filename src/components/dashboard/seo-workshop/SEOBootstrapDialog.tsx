/**
 * SEO New Location Bootstrap Dialog.
 * Walks through generating a foundational SEO campaign for a new location.
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateBootstrapCampaign, estimateBootstrapTaskCount, type BootstrapCampaign } from '@/lib/seo-engine/seo-bootstrap';
import { supabase } from '@/integrations/supabase/client';
import { useActiveLocations } from '@/hooks/useLocations';
import { useAuth } from '@/contexts/AuthContext';
import { tokens } from '@/lib/design-tokens';
import { Rocket, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface Props {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SEOBootstrapDialog({ organizationId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: locations = [] } = useActiveLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [preview, setPreview] = useState<BootstrapCampaign | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const selectedLocation = locations.find((l: any) => l.id === selectedLocationId);

  // Fetch real services from org
  const { data: orgServices = [] } = useQuery({
    queryKey: ['bootstrap-services', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('id, name, category, price')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        isHighValue: (s.price ?? 0) >= 100,
      }));
    },
    enabled: !!organizationId && open,
  });

  // Fetch real stylists from org
  const { data: orgStylists = [] } = useQuery({
    queryKey: ['bootstrap-stylists', organizationId, selectedLocationId],
    queryFn: async () => {
      let query = supabase
        .from('employee_profiles')
        .select('user_id, display_name')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('is_approved', true);

      if (selectedLocationId) {
        query = query.contains('location_ids', [selectedLocationId]);
      }

      const { data } = await query.order('display_name');
      return (data || []).map((e: any) => ({
        id: e.user_id,
        name: e.display_name || 'Staff',
      }));
    },
    enabled: !!organizationId && !!selectedLocationId && open,
  });

  const services = orgServices.length > 0 ? orgServices : [{ id: 'default', name: 'General Service', isHighValue: false }];
  const stylists = orgStylists.length > 0 ? orgStylists : [{ id: 'default', name: 'Staff' }];

  const handlePreview = () => {
    if (!selectedLocation) return;

    const campaign = generateBootstrapCampaign({
      organizationId,
      locationId: selectedLocationId,
      locationName: selectedLocation.name ?? 'New Location',
      services,
      stylists,
      createdBy: user?.id ?? '',
    });

    setPreview(campaign);
  };

  const handleCreate = async () => {
    if (!preview || !selectedLocation) return;
    setIsCreating(true);

    try {
      // 1. Create campaign
      const { data: campaign, error: campErr } = await supabase
        .from('seo_campaigns' as any)
        .insert({
          organization_id: organizationId,
          location_id: selectedLocationId,
          title: preview.title,
          objective: preview.objective,
          status: 'planning',
          owner_user_id: user?.id,
          window_start: new Date().toISOString(),
          window_end: new Date(Date.now() + preview.windowDays * 86400000).toISOString(),
          expected_metrics: {},
        })
        .select('id')
        .single();

      if (campErr) throw campErr;

      const campaignId = (campaign as any)?.id;

      // 2. Create SEO objects + tasks
      let taskCount = 0;
      for (const task of preview.tasks) {
        const { data: seoObj, error: objErr } = await supabase
          .from('seo_objects' as any)
          .upsert({
            organization_id: organizationId,
            location_id: selectedLocationId,
            object_type: task.objectType,
            object_key: task.objectKey,
            label: task.objectLabel,
          }, { onConflict: 'organization_id,object_type,object_key' })
          .select('id')
          .single();

        // B4 fix: skip task if SEO object creation failed
        if (objErr || !(seoObj as any)?.id) {
          console.warn(`Skipping task "${task.label}": SEO object creation failed`, objErr);
          continue;
        }

        const dueAt = new Date(Date.now() + task.dueOffsetDays * 86400000).toISOString();

        const { data: taskData, error: taskErr } = await supabase.from('seo_tasks' as any).insert({
           organization_id: organizationId,
           location_id: selectedLocationId,
           template_key: task.templateKey,
           primary_seo_object_id: (seoObj as any).id,
           status: 'detected',
           priority_score: task.priority,
           priority_factors: { bootstrap: true },
           assigned_role: task.assignedRole,
           due_at: dueAt,
           campaign_id: campaignId,
           ai_generated_content: {
             title: `${task.label}: ${task.objectLabel}`,
             explanation: `Part of the ${preview.title} bootstrap campaign.`,
           },
         }).select('id').single();

         // G12: Create audit history record for bootstrap task
         if (!taskErr && (taskData as any)?.id) {
           await supabase.from('seo_task_history' as any).insert({
             task_id: (taskData as any).id,
             previous_status: null,
             new_status: 'detected',
             performed_by: user?.id ?? 'system:bootstrap',
             action: 'bootstrap_created',
             metadata: { campaign_id: campaignId, template_key: task.templateKey },
           });
         }
         taskCount++;
      }

      setIsCreated(true);
      qc.invalidateQueries({ queryKey: ['seo-campaigns'] });
      qc.invalidateQueries({ queryKey: ['seo-tasks'] });
      toast({ title: 'Bootstrap campaign created', description: `${taskCount} tasks generated for ${selectedLocation.name}.` });
    } catch (err) {
      toast({ title: 'Failed to create campaign', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setSelectedLocationId('');
    setIsCreated(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            New Location Bootstrap
          </DialogTitle>
          <DialogDescription className="font-sans">
            Auto-generate a foundational SEO campaign for a new location with all required pages, content, and engagement tasks.
          </DialogDescription>
        </DialogHeader>

        {isCreated ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h3 className="font-display text-sm tracking-wide">Campaign Created</h3>
            <p className="text-sm text-muted-foreground font-sans">
              {preview?.tasks.length} tasks have been queued. Switch to the Campaigns tab to manage.
            </p>
            <Button onClick={handleClose} className="font-sans">Done</Button>
          </div>
        ) : !preview ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-sans font-medium mb-1.5 block">Select Location</label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a location…" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLocationId && (
              <Card>
                <CardContent className="p-4 text-sm font-sans space-y-2">
                  <p>This will generate approximately <span className="font-medium">{estimateBootstrapTaskCount(services.length, stylists.length)}</span> tasks across 5 phases:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                    <li>Foundation — Landing page + metadata</li>
                    <li>Service Pages — Per-service pages, descriptions, FAQs</li>
                    <li>Content & Proof — Photos, before/afters, stylist spotlights</li>
                    <li>Local Presence — GBP posts + internal linking</li>
                    <li>Engagement — Review requests + booking CTAs</li>
                  </ul>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button onClick={handlePreview} disabled={!selectedLocationId} className="font-sans gap-2">
                Preview Campaign
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-sm tracking-wide">{preview.title}</h3>
              <p className="text-xs text-muted-foreground font-sans mt-1">{preview.objective}</p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{preview.tasks.length} tasks</Badge>
              <Badge variant="outline">{preview.windowDays} day window</Badge>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {preview.tasks.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-sans py-1 border-b border-border/40 last:border-0">
                  <div className="min-w-0">
                    <span className="font-medium">{t.label}</span>
                    <span className="text-muted-foreground ml-1">— {t.objectLabel}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                    Day {t.dueOffsetDays}
                  </Badge>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPreview(null)} className="font-sans">Back</Button>
              <Button onClick={handleCreate} disabled={isCreating} className="font-sans gap-2">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Create Campaign
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
