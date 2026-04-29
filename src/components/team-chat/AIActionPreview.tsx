import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, User, Scissors, ArrowRight, X, Check, Loader2, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AIAction } from '@/hooks/team-chat/useAIAgentChat';

interface AIActionPreviewProps {
  action: AIAction;
  onConfirm: (confirmationInput?: string) => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'EEEE, MMM d, yyyy'); } catch { return dateStr; }
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch { return timeStr; }
}

const RISK_STYLES: Record<string, { badge: string; icon: typeof ShieldAlert; label: string; button: string }> = {
  low: {
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: Sparkles,
    label: 'Low risk',
    button: '',
  },
  med: {
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: AlertTriangle,
    label: 'Reversible',
    button: '',
  },
  high: {
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: ShieldAlert,
    label: 'High impact',
    button: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },
};

export function AIActionPreview({ action, onConfirm, onCancel, isExecuting }: AIActionPreviewProps) {
  const { preview } = action;
  const riskLevel = action.risk_level || preview.risk_level || 'med';
  const risk = RISK_STYLES[riskLevel] || RISK_STYLES.med;
  const RiskIcon = risk.icon;

  const [confirmInput, setConfirmInput] = useState('');
  const requiresTypedConfirmation =
    riskLevel === 'high' && !!action.confirmation_token;
  const tokenMatches =
    !requiresTypedConfirmation ||
    confirmInput.trim().toLowerCase() ===
      (action.confirmation_token || '').trim().toLowerCase();

  return (
    <Card className="w-full max-w-md border-2 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <div className={cn('p-2 rounded-lg shrink-0', risk.badge)}>
            <RiskIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm">{preview.title}</h3>
            <p className="text-xs text-muted-foreground">{preview.description}</p>
          </div>
          <Badge variant="outline" className={risk.badge}>{risk.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Why explanation */}
        {action.reasoning && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border/60">
            <span className="font-medium text-foreground">Why: </span>{action.reasoning}
          </div>
        )}

        {/* Target (HR / non-appointment) */}
        {preview.target && (
          <div className="space-y-3">
            <div className={cn(
              'p-3 rounded-lg border space-y-2',
              riskLevel === 'high' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/40',
            )}>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{preview.target.name}</span>
              </div>
              {preview.target.hire_date && (
                <div className="text-xs text-muted-foreground">Hired {formatDate(preview.target.hire_date)}</div>
              )}
              {preview.target.reason && (
                <div className="text-xs text-muted-foreground italic">Reason: {preview.target.reason}</div>
              )}
            </div>
            {(preview.target.upcoming_appointments ?? 0) > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-foreground">
                  <span className="font-medium">{preview.target.upcoming_appointments} upcoming appointment{preview.target.upcoming_appointments === 1 ? '' : 's'}</span> will need reassignment. Historical data is preserved.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Before / after (appointment shape) */}
        {preview.before && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current</p>
            <div className={cn(
              'p-3 rounded-lg border space-y-2',
              !preview.after ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/50',
            )}>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{preview.before.client}</span>
              </div>
              {preview.before.service && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Scissors className="h-4 w-4" />
                  <span>{preview.before.service}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>{formatDate(preview.before.date)}</span></div>
                <div className="flex items-center gap-1"><Clock className="h-4 w-4" /><span>{formatTime(preview.before.time)}</span></div>
              </div>
              {preview.before.stylist && (
                <div className="text-xs text-muted-foreground">with {preview.before.stylist}</div>
              )}
            </div>
          </div>
        )}

        {preview.after && (
          <>
            <div className="flex justify-center"><ArrowRight className="h-5 w-5 text-muted-foreground" /></div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New</p>
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{preview.after.client}</span>
                </div>
                {preview.after.service && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Scissors className="h-4 w-4" />
                    <span>{preview.after.service}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-primary"><Calendar className="h-4 w-4" /><span className="font-medium">{formatDate(preview.after.date)}</span></div>
                  <div className="flex items-center gap-1 text-primary"><Clock className="h-4 w-4" /><span className="font-medium">{formatTime(preview.after.time)}</span></div>
                </div>
                {preview.after.stylist && (
                  <div className="text-xs text-muted-foreground">with {preview.after.stylist}</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Typed confirmation for high-risk */}
        {requiresTypedConfirmation && (
          <div className="space-y-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                To confirm, type <span className="font-medium">{action.confirmation_token}</span> below.
              </p>
            </div>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={action.confirmation_token || ''}
              disabled={isExecuting}
              autoComplete="off"
              className="h-9"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isExecuting}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          className={cn('flex-1', risk.button)}
          onClick={() => onConfirm(requiresTypedConfirmation ? confirmInput : undefined)}
          disabled={isExecuting || !tokenMatches}
        >
          {isExecuting ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processing...</>
          ) : (
            <><Check className="h-4 w-4 mr-1" />Approve</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
