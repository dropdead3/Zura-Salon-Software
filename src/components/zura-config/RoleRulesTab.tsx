import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Save, Users } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useZuraRoleRules, useUpsertRoleRule, ZuraRoleRule } from '@/hooks/useZuraConfig';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';

interface RoleRulesTabProps {
  organizationId: string;
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'admin', label: 'Admin', color: 'bg-violet-500/10 text-violet-600' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'stylist', label: 'Stylist', color: 'bg-pink-500/10 text-pink-600' },
  { value: 'receptionist', label: 'Receptionist', color: 'bg-cyan-500/10 text-cyan-600' },
  { value: 'booth_renter', label: 'Booth Renter', color: 'bg-teal-500/10 text-teal-600' },
  { value: 'assistant', label: 'Assistant', color: 'bg-green-500/10 text-green-600' },
];

const TONE_OPTIONS = [
  { value: '', label: 'Use org default' },
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'motivational', label: 'Motivational' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'casual', label: 'Casual' },
];

export function RoleRulesTab({ organizationId }: RoleRulesTabProps) {
  const { data: existingRules = [], isLoading } = useZuraRoleRules(organizationId);
  const upsertRule = useUpsertRoleRule();

  const [editState, setEditState] = useState<Record<string, Partial<ZuraRoleRule>>>({});

  useEffect(() => {
    const state: Record<string, Partial<ZuraRoleRule>> = {};
    for (const role of ROLES) {
      const existing = existingRules.find(r => r.target_role === role.value);
      state[role.value] = existing || {
        target_role: role.value,
        tone_override: null,
        custom_instructions: '',
        data_boundaries: '',
        suggested_cta_style: '',
        is_active: false,
      };
    }
    setEditState(state);
  }, [existingRules]);

  const updateField = (role: string, field: string, value: unknown) => {
    setEditState(prev => ({ ...prev, [role]: { ...prev[role], [field]: value } }));
  };

  const saveRole = (role: string) => {
    const data = editState[role];
    upsertRule.mutate({
      orgId: organizationId,
      data: { ...data, target_role: role },
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Role-Specific Rules</CardTitle>
          <CardDescription>{`Configure how ${AI_ASSISTANT_NAME_DEFAULT} speaks to each role. Role rules override the org-level personality settings.`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {ROLES.map(role => {
              const state = editState[role.value];
              if (!state) return null;
              const isConfigured = existingRules.some(r => r.target_role === role.value);
              
              return (
                <AccordionItem key={role.value} value={role.value}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge className={role.color}>{role.label}</Badge>
                      {isConfigured && <Badge variant="outline" className="text-xs">Configured</Badge>}
                      {state.is_active && <Badge variant="default" className="text-xs">Active</Badge>}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={state.is_active ?? false}
                        onCheckedChange={v => updateField(role.value, 'is_active', v)}
                      />
                      <Label>Enable role-specific rules</Label>
                    </div>

                    <div className="space-y-2">
                      <Label>Tone Override</Label>
                      <Select
                        value={state.tone_override || ''}
                        onValueChange={v => updateField(role.value, 'tone_override', v || null)}
                      >
                        <SelectTrigger><SelectValue placeholder="Use org default" /></SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Custom Instructions</Label>
                      <Textarea
                        value={state.custom_instructions || ''}
                        onChange={e => updateField(role.value, 'custom_instructions', e.target.value)}
                        placeholder={
                          role.value === 'stylist'
                            ? "Always be motivational and encouraging. Reference their personal goals. Never mention other stylists' numbers."
                            : role.value === 'manager'
                            ? "Be analytical and data-driven. Highlight trends and provide actionable recommendations."
                            : `Custom instructions for ${role.label}...`
                        }
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Data Boundaries</Label>
                      <Textarea
                        value={state.data_boundaries || ''}
                        onChange={e => updateField(role.value, 'data_boundaries', e.target.value)}
                        placeholder="Never share organizational financials or other team members' performance data"
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">{`Define what data ${AI_ASSISTANT_NAME_DEFAULT} should NOT share with this role`}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>CTA Style</Label>
                      <Textarea
                        value={state.suggested_cta_style || ''}
                        onChange={e => updateField(role.value, 'suggested_cta_style', e.target.value)}
                        placeholder="End with a challenge or goal"
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">{`How ${AI_ASSISTANT_NAME_DEFAULT} ends responses to this role`}</p>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => saveRole(role.value)} disabled={upsertRule.isPending} size={tokens.button.card} className="gap-2">
                        <Save className="h-3.5 w-3.5" /> Save {role.label} Rules
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
