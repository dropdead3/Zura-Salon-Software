import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Plus,
  X,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

type IncidentSeverity = 'info' | 'warning' | 'critical';
type IncidentStatus = 'active' | 'monitoring' | 'resolved';

interface Incident {
  id: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  title: string;
  message: string;
  link_text: string | null;
  link_url: string | null;
  is_auto_created: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const severityIcons: Record<IncidentSeverity, React.ComponentType<{ className?: string }>> = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};

const severityColors: Record<IncidentSeverity, string> = {
  critical: 'text-red-400 bg-red-500/20',
  warning: 'text-amber-400 bg-amber-500/20',
  info: 'text-blue-400 bg-blue-500/20',
};

export function IncidentManagementCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    severity: 'warning' as IncidentSeverity,
    title: '',
    message: '',
    link_text: '',
    link_url: '',
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['platform-incidents-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as unknown as Incident[];
    },
  });

  const activeIncident = incidents.find(i => i.status === 'active' || i.status === 'monitoring');
  const pastIncidents = incidents.filter(i => i.status === 'resolved').slice(0, 5);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('platform_incidents').insert({
        severity: formData.severity,
        title: formData.title,
        message: formData.message,
        link_text: formData.link_text || null,
        link_url: formData.link_url || null,
        created_by: user?.id,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-incidents-admin'] });
      queryClient.invalidateQueries({ queryKey: ['active-incident'] });
      toast.success('Incident created — banner is now live for all users');
      setShowForm(false);
      setFormData({ severity: 'warning', title: '', message: '', link_text: '', link_url: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resolveMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const { error } = await supabase
        .from('platform_incidents')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', incidentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-incidents-admin'] });
      queryClient.invalidateQueries({ queryKey: ['active-incident'] });
      toast.success('Incident resolved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="relative rounded-[22px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] backdrop-blur-xl p-5 overflow-hidden">
      {/* Top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--platform-foreground)/0.04)] to-transparent" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <h2 className="text-lg font-medium text-[hsl(var(--platform-foreground))] tracking-tight">Active Incident</h2>
        </div>
        {!activeIncident && !showForm && (
          <PlatformButton size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create
          </PlatformButton>
        )}
      </div>

      {/* Active incident display */}
      {activeIncident && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {(() => {
                const Icon = severityIcons[activeIncident.severity as IncidentSeverity] || AlertTriangle;
                return (
                  <div className={cn('p-2 rounded-lg', severityColors[activeIncident.severity as IncidentSeverity])}>
                    <Icon className="h-4 w-4" />
                  </div>
                );
              })()}
              <div>
                <p className="text-sm font-medium text-[hsl(var(--platform-foreground))]">{activeIncident.title}</p>
                <p className="text-sm text-[hsl(var(--platform-foreground)/0.85)] mt-1">{activeIncident.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-[hsl(var(--platform-foreground-subtle))]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(activeIncident.created_at), 'MMM d, h:mm a')}
                  </span>
                  {activeIncident.is_auto_created && (
                    <span className="px-1.5 py-0.5 rounded bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))] text-[10px] font-medium tracking-wide">AUTO</span>
                  )}
                </div>
              </div>
            </div>
            <PlatformButton
              size="sm"
              variant="secondary"
              onClick={() => resolveMutation.mutate(activeIncident.id)}
              loading={resolveMutation.isPending}
              className="gap-1.5 shrink-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolve
            </PlatformButton>
          </div>
        </div>
      )}

      {/* Create incident form */}
      {showForm && !activeIncident && (
        <div className="rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-hover)/0.3)] p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[hsl(var(--platform-foreground))]">New Incident</span>
            <button onClick={() => setShowForm(false)} className="text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <PlatformLabel>Severity</PlatformLabel>
            <div className="flex gap-2">
              {(['info', 'warning', 'critical'] as IncidentSeverity[]).map(sev => {
                const Icon = severityIcons[sev];
                return (
                  <button
                    key={sev}
                    onClick={() => setFormData(f => ({ ...f, severity: sev }))}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200',
                      formData.severity === sev
                        ? cn(severityColors[sev], 'border-current')
                        : 'border-[hsl(var(--platform-border)/0.5)] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <PlatformLabel>Title</PlatformLabel>
            <input
              value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Scheduled Maintenance"
              className="w-full bg-[hsl(var(--platform-input))] border border-[hsl(var(--platform-border)/0.5)] rounded-lg px-3 py-2 text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-subtle))] focus:outline-none focus:border-[hsl(var(--platform-primary)/0.5)] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <PlatformLabel>Message</PlatformLabel>
            <textarea
              value={formData.message}
              onChange={e => setFormData(f => ({ ...f, message: e.target.value }))}
              placeholder="Describe the issue or maintenance window..."
              rows={2}
              className="w-full bg-[hsl(var(--platform-input))] border border-[hsl(var(--platform-border)/0.5)] rounded-lg px-3 py-2 text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-subtle))] focus:outline-none focus:border-[hsl(var(--platform-primary)/0.5)] resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <PlatformLabel>Link Text (optional)</PlatformLabel>
              <input
                value={formData.link_text}
                onChange={e => setFormData(f => ({ ...f, link_text: e.target.value }))}
                placeholder="e.g. Status Page"
                className="w-full bg-[hsl(var(--platform-input))] border border-[hsl(var(--platform-border)/0.5)] rounded-lg px-3 py-2 text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-subtle))] focus:outline-none focus:border-[hsl(var(--platform-primary)/0.5)] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <PlatformLabel>Link URL (optional)</PlatformLabel>
              <input
                value={formData.link_url}
                onChange={e => setFormData(f => ({ ...f, link_url: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-[hsl(var(--platform-input))] border border-[hsl(var(--platform-border)/0.5)] rounded-lg px-3 py-2 text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-subtle))] focus:outline-none focus:border-[hsl(var(--platform-primary)/0.5)] transition-colors"
              />
            </div>
          </div>

          <PlatformButton
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!formData.title || !formData.message}
            className="w-full"
          >
            Publish Incident Banner
          </PlatformButton>
        </div>
      )}

      {/* No active incident */}
      {!activeIncident && !showForm && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/10 mb-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 animate-[pulse_3s_ease-in-out_infinite]" />
          </div>
          <p className="text-sm font-medium text-[hsl(var(--platform-foreground)/0.85)]">All systems operational</p>
          <p className="text-xs text-[hsl(var(--platform-foreground-subtle))] mt-0.5">No active incidents</p>
        </div>
      )}

      {/* Past incidents */}
      {pastIncidents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[hsl(var(--platform-border)/0.4)]">
          <p className="text-[10px] font-medium text-[hsl(var(--platform-foreground-subtle))] uppercase tracking-[0.15em] mb-2">Recent Resolved</p>
          <div className="space-y-2">
            {pastIncidents.map(inc => (
              <div key={inc.id} className="flex items-center justify-between text-xs text-[hsl(var(--platform-foreground-subtle))] hover:text-[hsl(var(--platform-foreground-muted))] transition-colors duration-200">
                <span className="truncate mr-2">{inc.title}</span>
                <span className="shrink-0 tabular-nums">
                  {inc.resolved_at ? format(new Date(inc.resolved_at), 'MMM d') : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
