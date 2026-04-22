import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Layers, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { useAssignStylistLevel } from '@/hooks/useAssignStylistLevel';

interface Props {
  userId: string;
  profile: any;
}

export function LevelTab({ userId, profile }: Props) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { data: levels, isLoading } = useStylistLevels();
  const assignLevel = useAssignStylistLevel();
  const queryClient = useQueryClient();

  const currentLevelSlug = profile?.stylist_level as string | null;
  const currentLevel = levels?.find(l => l.slug === currentLevelSlug);

  const handleChange = (slug: string) => {
    const value = slug === '__none__' ? null : slug;
    assignLevel.mutate(
      { userId, levelSlug: value },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['team-member-profile', userId] });
          toast.success('Stylist level updated');
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <CardTitle className="font-display text-base tracking-wide">STYLIST LEVEL</CardTitle>
        </div>
        <CardDescription>The career-tier assigned to this team member, which drives commission rates and pricing multipliers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {currentLevel ? (
              <div className="p-4 rounded-lg border border-border/60 bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm tracking-wide text-foreground">{currentLevel.label}</span>
                  <Badge variant="outline" className="text-[10px]">Tier {currentLevel.display_order}</Badge>
                </div>
                {currentLevel.description && (
                  <p className={tokens.body.muted + ' text-xs mt-1'}>{currentLevel.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {currentLevel.service_commission_rate != null && (
                    <div>
                      <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">Service commission</p>
                      <p className="font-sans text-sm text-foreground">{(currentLevel.service_commission_rate * 100).toFixed(0)}%</p>
                    </div>
                  )}
                  {currentLevel.retail_commission_rate != null && (
                    <div>
                      <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">Retail commission</p>
                      <p className="font-sans text-sm text-foreground">{(currentLevel.retail_commission_rate * 100).toFixed(0)}%</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className={tokens.body.muted + ' text-sm italic'}>No stylist level assigned.</p>
            )}

            <div>
              <label className="font-sans text-sm font-medium text-foreground mb-2 block">Assign level</label>
              <Select value={currentLevelSlug ?? '__none__'} onValueChange={handleChange} disabled={assignLevel.isPending}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select a level…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No level</SelectItem>
                  {(levels || []).map(l => (
                    <SelectItem key={l.id} value={l.slug}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => navigate(dashPath('/admin/stylist-levels'))} className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Manage stylist levels
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
